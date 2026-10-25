import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

test_domains = [
    ('asitisnutrition.com', 'https://asitisnutrition.com/products/as-it-is-nutrition-whey-protein-isolate.json'),
    ('naturaltein.in', 'https://naturaltein.in/products/creatine-monohydrate.json'),
    ('nutrabox.in', 'https://nutrabox.in/products/creatine-monohydrate.json'),
    ('beastlife.in', 'https://beastlife.in/products/the-creatine-pure-creapure.json'),
    ('gnc.in', 'https://gnc.in/products/gnc-pro-performance-creatine-monohydrate.json'),
    ('musclenectar.com', 'https://musclenectar.com/products/creatine-monohydrate.json'),
    ('wellversed.in', 'https://wellversed.in/products/wellcore-pure-micronised-creatine-monohydrate.json'),
    ('www.bigmusclesnutrition.com', 'https://www.bigmusclesnutrition.com/products/creatine.json'),
    ('www.fastandup.in', 'https://www.fastandup.in/products/fast-up-creatine-monohydrate.json'),
    ('wellbeingnutrition.com', 'https://wellbeingnutrition.com/products/super-creatine.json'),
]

for d, url in test_domains:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            title = data.get('product', {}).get('title', 'NO TITLE')
            var_count = len(data.get('product', {}).get('variants', []))
            print(f"OK [200]: {d:28} -> {title[:35]} ({var_count} variants)")
    except Exception as e:
        print(f"FAIL:    {d:28} -> {e}")
