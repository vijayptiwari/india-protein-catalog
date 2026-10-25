import json, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parents[1]
cat_file = ROOT / 'docs/data/catalog.json'
cat = json.loads(cat_file.read_text(encoding='utf-8'))
offers = cat['offers']

updated = 0
for r in offers:
    if r['id'] in [15, 16, 17]:
        print(f"Updating ID {r['id']}: energy {r['energy']} -> 375.0 kcal/100g")
        r['energy'] = 375.0
        r['energyBasis'] = 'Calculated from label: 150 kcal per 40g serving (375 kcal per 100g)'
        updated += 1

cat_file.write_text(json.dumps(cat, ensure_ascii=False, indent=2), encoding='utf-8')
print(f"Updated {updated} offers in docs/data/catalog.json")

nutri_file = ROOT / 'outputs/protein_catalog_20261025/nutrition_details.json'
if nutri_file.exists():
    nutri = json.loads(nutri_file.read_text(encoding='utf-8-sig'))
    for d in nutri:
        if d.get('index') in [15, 16, 17]:
            d['energy'] = 375.0
            d['energy_basis'] = 'Calculated from label: 150 kcal per 40g serving (375 kcal per 100g)'
    nutri_file.write_text(json.dumps(nutri, ensure_ascii=False, indent=2), encoding='utf-8')
    print("Updated outputs/protein_catalog_20261025/nutrition_details.json")
