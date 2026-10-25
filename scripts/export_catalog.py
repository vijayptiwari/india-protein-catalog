"""Export the researched catalog to the static site's pack-level JSON."""
import json, pathlib
root = pathlib.Path(__file__).resolve().parents[1]
source = root / 'outputs/protein_catalog_20261025'
records = json.loads((source / 'combined_records.json').read_text(encoding='utf-8-sig'))
nutrition = json.loads((source / 'nutrition_details.json').read_text(encoding='utf-8-sig'))
offers = []
for i, (r, n) in enumerate(zip(records, nutrition, strict=True)):
    assert (r['brand'], r['product'], r['flavour'], r['kg']) == (n['brand'], n['product'], n['flavour'], n['kg'])
    p = n['protein']
    offers.append(dict(id=i, brand=r['brand'], product=r['product'], type=r['type'], flavour=r['flavour'], kg=r['kg'], price=r['price'], stock=r['stock'], protein=p, scoop=n['scoop'], serving=n['serving'], subclass=n['subclass'], energy=n['energy'], cost=r['price']/(r['kg']*10*p) if p else None, url=r['url'], nutritionUrl=n['detail_url'] or r['nutrition_url'], basis=r['basis'], notes=' '.join(filter(None,[r['note'],n['notes']])), energyBasis=n['energy_basis']))
out = root / 'docs/data'
out.mkdir(parents=True, exist_ok=True)
(out/'catalog.json').write_text(json.dumps(dict(checked='2026-10-25', offers=offers),ensure_ascii=False),encoding='utf-8')
print(f'Exported {len(offers)} offers; {len(set((r["brand"],r["product"],r["flavour"]) for r in offers))} listings')
