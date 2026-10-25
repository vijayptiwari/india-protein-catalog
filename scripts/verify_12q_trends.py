import json
import urllib.request

res = urllib.request.urlopen('http://localhost:8080/data/catalog.json')
cat = json.loads(res.read().decode('utf-8'))
offers = cat['offers']

print(f"Total offers served by server: {len(offers)}")

# Check 12-quarter history on sample offers
sample_classic = next(o for o in offers if o['brand'] == 'Optimum Nutrition' and 'Gold Standard' in o['product'])
sample_new = next(o for o in offers if o.get('isNew') or o['brand'] == 'The Good Bug')

print("\n--- SAMPLE CLASSIC (Optimum Nutrition Gold Standard): ---")
print("Product:", sample_classic['product'], "| Flavour:", sample_classic['flavour'])
t_c = sample_classic['trend']
print("Launch Quarter:", t_c['launchQuarter'])
print("12-Quarter Total Change:", t_c['twelveQuarterChangePct'], "%")
print("Price Range: Rs.", t_c['lowestPrice'], "to Rs.", t_c['highestPrice'])
print("Tracked Quarters Count:", t_c['quartersTracked'])
print("History timeline:")
for h in t_c['history']:
    print(f"  {h['quarter']}: {h['price']} (QoQ: {h['qoqPct']}%)")

print("\n--- SAMPLE RECENT (The Good Bug / New Variant): ---")
print("Product:", sample_new['product'], "| Flavour:", sample_new['flavour'])
t_n = sample_new['trend']
print("Launch Quarter:", t_n['launchQuarter'])
print("Tracked Quarters Count:", t_n['quartersTracked'])
print("History timeline:")
for h in t_n['history']:
    print(f"  {h['quarter']}: {h['price']} (Status: {h['status']}, QoQ: {h['qoqPct']}%)")
