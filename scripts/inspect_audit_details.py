import json, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parents[1]
creatine = json.loads((ROOT / 'docs/data/creatine.json').read_text(encoding='utf-8'))['offers']
seen = {}
dupes = []
for r in creatine:
    key = (r['brand'], r['product'], r['flavour'], r['grams'])
    if key in seen:
        dupes.append((key, seen[key], r))
    else:
        seen[key] = r

print(f"Found {len(dupes)} duplicate pairs in creatine:")
for k, r1, r2 in dupes:
    print(f"\nKey: {k}")
    print(f"  Entry 1: ID {r1['id']} | Price {r1['price']} | URL: {r1['url']}")
    print(f"  Entry 2: ID {r2['id']} | Price {r2['price']} | URL: {r2['url']}")

print("\n--- ATOM PWR Whey XL in protein catalog ---")
protein = json.loads((ROOT / 'docs/data/catalog.json').read_text(encoding='utf-8'))['offers']
for r in protein:
    if 'PWR Whey XL' in r['product']:
        print(f"ID {r['id']} | {r['brand']} | {r['product']} | {r['flavour']} | {r['kg']}kg | ₹{r['price']} | protein={r['protein']}% | scoop={r['scoop']}g | energy={r['energy']} | basis={r.get('energyBasis')}")
