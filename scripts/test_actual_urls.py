import urllib.request, json, sys
from urllib.parse import urlparse
sys.stdout.reconfigure(encoding='utf-8')

ROOT = '.'
protein = json.load(open('docs/data/catalog.json', encoding='utf-8'))['offers']
creatine = json.load(open('docs/data/creatine.json', encoding='utf-8'))['offers']

all_offers = protein + creatine
by_domain = {}
for r in all_offers:
    u = r['url']
    dom = urlparse(u).netloc
    if dom not in by_domain:
        by_domain[dom] = (r['brand'], r['product'], u, r['price'])

print(f"Testing actual catalog URLs for {len(by_domain)} domains:\n")

for dom, (brand, prod, url, price) in by_domain.items():
    # Also test .json endpoint if it has /products/
    json_url = None
    if '/products/' in url:
        base = url.split('?')[0]
        json_url = base + '.json'
    
    # 1. Test HTML URL
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    html_status = "ERR"
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            html_status = f"{resp.status}"
    except urllib.error.HTTPError as e:
        html_status = f"HTTP {e.code}"
    except Exception as e:
        html_status = f"{type(e).__name__}"

    # 2. Test JSON URL if available
    json_status = "-"
    if json_url:
        req_j = urllib.request.Request(json_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        try:
            with urllib.request.urlopen(req_j, timeout=12) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                v_count = len(data.get('product', {}).get('variants', []))
                json_status = f"200 ({v_count} vars)"
        except urllib.error.HTTPError as e:
            json_status = f"HTTP {e.code}"
        except Exception as e:
            json_status = f"{type(e).__name__}"

    print(f"{brand[:20]:20} | {dom:28} | HTML: {html_status:10} | JSON: {json_status:16} | Price: ₹{price}")
    print(f"  URL: {url}")
