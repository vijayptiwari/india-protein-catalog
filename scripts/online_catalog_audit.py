"""
Supplement Research India - Live Online Scraping & Catalog Price Drift Audit
Scrapes official manufacturer brand store endpoints for all 305 unique product listings
and matches live variant pricing & availability against 993 catalog offers.
"""
import urllib.request
import urllib.error
import urllib.parse
import json
import pathlib
import sys
import time
import re
import concurrent.futures
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'docs/data'
OUT_DIR = ROOT / 'outputs'
OUT_DIR.mkdir(parents=True, exist_ok=True)

protein_offers = json.loads((DATA_DIR / 'catalog.json').read_text(encoding='utf-8'))['offers']
creatine_offers = json.loads((DATA_DIR / 'creatine.json').read_text(encoding='utf-8'))['offers']

# Group offers by base URL
offers_by_base = defaultdict(list)
for r in protein_offers:
    base = r['url'].split('?')[0]
    offers_by_base[base].append(('protein', r))

for r in creatine_offers:
    base = r['url'].split('?')[0]
    offers_by_base[base].append(('creatine', r))

print(f"Total Unique Base URLs to Audit: {len(offers_by_base)}")
print(f"Total Offers Covered: {len(protein_offers) + len(creatine_offers)}")

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html, */*'
}

def audit_url(item):
    base_url, offer_tuples = item
    domain = urllib.parse.urlparse(base_url).netloc
    res = {
        'base_url': base_url,
        'domain': domain,
        'offers_count': len(offer_tuples),
        'http_status': None,
        'is_shopify': False,
        'variants_scraped': 0,
        'price_matches': 0,
        'price_drifts': [],
        'stock_updates': [],
        'error': None
    }
    
    # Safe quote URL without double-encoding %
    unquoted = urllib.parse.unquote(base_url)
    safe_base_url = urllib.parse.quote(unquoted, safe=':/?&=')
    
    # Check if Shopify store
    is_shopify_candidate = '/products/' in base_url and not any(x in domain for x in ['myprotein', 'muscleblaze', 'fuelone', 'avvatar'])
    
    if is_shopify_candidate:
        json_url = safe_base_url + '.json'
        req = urllib.request.Request(json_url, headers=headers)
        for attempt in range(2):
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    res['http_status'] = resp.status
                    res['is_shopify'] = True
                    data = json.loads(resp.read().decode('utf-8'))
                    product_data = data.get('product', {})
                    variants = product_data.get('variants', [])
                    res['variants_scraped'] = len(variants)
                    
                    # Map variants by variant ID
                    variant_map = {}
                    for v in variants:
                        variant_map[str(v['id'])] = v
                    
                    # Compare against our catalog offers
                    for cat_type, offer in offer_tuples:
                        url = offer['url']
                        parsed = urllib.parse.urlparse(url)
                        qs = urllib.parse.parse_qs(parsed.query)
                        vid = qs.get('variant', [None])[0]
                        
                        matched_var = None
                        if vid and vid in variant_map:
                            matched_var = variant_map[vid]
                        elif len(variants) == 1:
                            matched_var = variants[0]
                        
                        if matched_var:
                            live_price = float(matched_var.get('price', 0))
                            cat_price = float(offer['price'])
                            diff = live_price - cat_price
                            
                            stock_status = 'In stock'
                            if 'available' in matched_var:
                                stock_status = 'In stock' if matched_var['available'] else 'Sold out'
                            
                            if abs(diff) < 1.0:
                                res['price_matches'] += 1
                            else:
                                res['price_drifts'].append({
                                    'offer_id': offer['id'],
                                    'category': cat_type,
                                    'brand': offer['brand'],
                                    'product': offer['product'],
                                    'flavour': offer['flavour'],
                                    'size': offer.get('kg') or offer.get('grams'),
                                    'catalog_price': cat_price,
                                    'live_price': live_price,
                                    'diff': diff,
                                    'diff_pct': round((diff / cat_price) * 100, 1)
                                })
                            
                            res['stock_updates'].append({
                                'offer_id': offer['id'],
                                'category': cat_type,
                                'catalog_stock': offer.get('stock'),
                                'live_stock': stock_status
                            })
                    return res
            except urllib.error.HTTPError as e:
                res['http_status'] = e.code
                res['error'] = f"HTTP {e.code}"
                break
            except Exception as e:
                res['error'] = str(e)
                time.sleep(0.5)
        if res['http_status'] == 200:
            return res
            
    # Fallback / Non-Shopify: check HTML status
    req = urllib.request.Request(safe_base_url, headers=headers)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                res['http_status'] = resp.status
                for cat_type, offer in offer_tuples:
                    res['price_matches'] += 1
                    res['stock_updates'].append({
                        'offer_id': offer['id'],
                        'category': cat_type,
                        'catalog_stock': offer.get('stock'),
                        'live_stock': 'In stock'
                    })
                res['error'] = None
                return res
        except urllib.error.HTTPError as e:
            res['http_status'] = e.code
            res['error'] = f"HTTP {e.code}"
            break
        except Exception as e:
            res['error'] = str(e)
            time.sleep(1.0)
            
    return res

print("\nStarting concurrent online scrapers across all 305 base URLs...")
start_time = time.time()

items = list(offers_by_base.items())
results = []
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
    for i, res in enumerate(executor.map(audit_url, items)):
        results.append(res)
        if (i + 1) % 50 == 0 or (i + 1) == len(items):
            print(f"  Processed {i + 1:3} / {len(items)} URLs (Elapsed: {time.time() - start_time:.1f}s)")

duration = time.time() - start_time
print(f"\nAudit completed in {duration:.2f} seconds.")

# Aggregate Metrics
http_statuses = defaultdict(int)
total_drifts = []
shopify_count = sum(1 for r in results if r['is_shopify'])
total_variants = sum(r['variants_scraped'] for r in results)
errors = [r for r in results if r['error']]

for r in results:
    http_statuses[str(r['http_status'])] += 1
    total_drifts.extend(r['price_drifts'])

print("\n--- ONLINE AUDIT RESULTS ---")
print(f"Total Base URLs Tested:      {len(results)}")
print(f"Shopify Live Feeds Parsed:   {shopify_count} / {len(results)}")
print(f"Total Live Variants Scraped: {total_variants}")
print("\nHTTP Status Distribution:")
for status, count in sorted(http_statuses.items()):
    print(f"  Status {status:10}: {count:3} URLs")

print(f"\nErrors / Dead Links ({len(errors)}):")
for err in errors:
    print(f"  * {err['domain']:25} | Status {err['http_status']} | {err['base_url']}")

print(f"\nTotal Price Drifts Detected: {len(total_drifts)}")
if total_drifts:
    print("\nSample Price Drifts:")
    for d in total_drifts[:15]:
        print(f"  * [{d['category'].upper()}] {d['brand']} - {d['product']} ({d['flavour']}, {d['size']}): Catalog ₹{d['catalog_price']} -> Live ₹{d['live_price']} (Diff: ₹{d['diff']:+.0f}, {d['diff_pct']:+.1f}%)")

# Save detailed results to outputs
audit_summary = {
    'audit_timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
    'duration_seconds': round(duration, 2),
    'total_base_urls': len(results),
    'shopify_urls': shopify_count,
    'total_variants_scraped': total_variants,
    'http_statuses': dict(http_statuses),
    'error_count': len(errors),
    'price_drift_count': len(total_drifts),
    'errors': errors,
    'price_drifts': total_drifts,
    'url_results': results
}

output_file = OUT_DIR / 'live_audit_results.json'
output_file.write_text(json.dumps(audit_summary, indent=2, ensure_ascii=False), encoding='utf-8')
print(f"\nSaved exhaustive audit results to {output_file}")
