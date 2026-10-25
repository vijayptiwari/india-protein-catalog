import urllib.request
import json

res = urllib.request.urlopen('http://localhost:8080/data/catalog.json')
data = json.loads(res.read().decode('utf-8'))
offers = data['offers']

new_brands = ['The Whole Truth', 'TrueBasics', 'The Good Bug']
for b in new_brands:
    b_offers = [o for o in offers if o['brand'] == b]
    print(f"Brand: {b} -> {len(b_offers)} offers found via local HTTP server!")
    for o in b_offers[:2]:
        p = o['product']
        fl = o['flavour']
        kg = o['kg']
        pr = o['price']
        is_new = o['isNew']
        print(f"   - {p} ({fl}, {kg}kg): Rs.{pr} | isNew: {is_new}")
