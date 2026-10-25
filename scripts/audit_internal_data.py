"""
Comprehensive Internal Data Audit for Supplement Research India
Audits:
1. docs/data/catalog.json (Protein catalog: 799 offers)
2. docs/data/creatine.json (Creatine catalog: 194 offers)
"""
import json
import pathlib
import statistics
import sys
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'docs/data'

protein_data = json.loads((DATA_DIR / 'catalog.json').read_text(encoding='utf-8'))
creatine_data = json.loads((DATA_DIR / 'creatine.json').read_text(encoding='utf-8'))

protein_offers = protein_data.get('offers', [])
creatine_offers = creatine_data.get('offers', [])

print("=" * 60)
print(f"INTERNAL DATA AUDIT SUMMARY")
print(f"Protein Catalog Offers:  {len(protein_offers)}")
print(f"Creatine Catalog Offers: {len(creatine_offers)}")
print(f"Total Combined Offers:   {len(protein_offers) + len(creatine_offers)}")
print("=" * 60)

# -------------------------------------------------------------
# 1. PROTEIN AUDIT
# -------------------------------------------------------------
print("\n--- 1. PROTEIN CATALOG AUDIT ---")
p_brands = Counter(r['brand'] for r in protein_offers)
p_types = Counter(r['type'] for r in protein_offers)
p_subclasses = Counter(r.get('subclass', 'Unknown') for r in protein_offers)
p_weights = Counter(r['kg'] for r in protein_offers)
p_stocks = Counter(r.get('stock', 'Unknown') for r in protein_offers)

print(f"Brands ({len(p_brands)}):")
for b, count in p_brands.most_common():
    print(f"  - {b:25}: {count:3} offers")

print(f"\nTypes ({len(p_types)}):")
for t, count in p_types.most_common():
    print(f"  - {t:25}: {count:3} offers")

print(f"\nSubclasses ({len(p_subclasses)}):")
for sc, count in p_subclasses.most_common():
    print(f"  - {str(sc):25}: {count:3} offers")

print(f"\nPack Sizes (kg):")
for kg, count in p_weights.most_common():
    print(f"  - {kg} kg: {count:3} offers")

# Completeness check
p_missing_protein = [r for r in protein_offers if r.get('protein') is None]
p_missing_scoop = [r for r in protein_offers if r.get('scoop') is None]
p_missing_energy = [r for r in protein_offers if r.get('energy') is None]
p_missing_url = [r for r in protein_offers if not r.get('url')]
p_missing_nutrition_url = [r for r in protein_offers if not r.get('nutritionUrl')]

print(f"\nCompleteness:")
print(f"  - Missing Protein %:   {len(p_missing_protein)} / {len(protein_offers)}")
print(f"  - Missing Scoop size:  {len(p_missing_scoop)} / {len(protein_offers)}")
print(f"  - Missing Energy/100g: {len(p_missing_energy)} / {len(protein_offers)}")
print(f"  - Missing Product URL: {len(p_missing_url)} / {len(protein_offers)}")
print(f"  - Missing Nutri URL:   {len(p_missing_nutrition_url)} / {len(protein_offers)}")

# Math Consistency Check
p_cost_math_errors = []
for r in protein_offers:
    p = r.get('protein')
    c = r.get('cost')
    price = r['price']
    kg = r['kg']
    if p is not None:
        expected_cost = price / (kg * 10 * p)
        if c is None or abs(c - expected_cost) > 1e-4:
            p_cost_math_errors.append((r['id'], r['brand'], r['product'], c, expected_cost))
    else:
        if c is not None:
            p_cost_math_errors.append((r['id'], r['brand'], r['product'], c, None))

print(f"  - Cost Math Inconsistencies: {len(p_cost_math_errors)}")
if p_cost_math_errors:
    for err in p_cost_math_errors[:5]:
        print(f"    Anomaly: {err}")

# Outlier / Anomaly Detection
p_outliers = []
for r in protein_offers:
    p = r.get('protein')
    cost = r.get('cost')
    if p is not None and (p < 15 or p > 95):
        p_outliers.append(f"Unusual Protein %: {r['brand']} {r['product']} ({r['flavour']}) -> {p}% protein")
    if cost is not None and (cost < 0.8 or cost > 8.0):
        p_outliers.append(f"Unusual Cost/g: {r['brand']} {r['product']} ({r['kg']}kg) -> ₹{cost:.2f}/g pure protein")
    if r.get('energy') is not None and (r['energy'] < 250 or r['energy'] > 500):
        p_outliers.append(f"Unusual Energy: {r['brand']} {r['product']} -> {r['energy']} kcal/100g")

print(f"\nProtein Anomaly Flags ({len(p_outliers)}):")
for o in p_outliers[:15]:
    print(f"  * {o}")

# Unique products / flavours
p_unique_tuples = set((r['brand'], r['product'], r['flavour'], r['kg']) for r in protein_offers)
print(f"\nUnique (brand, product, flavour, kg) variants: {len(p_unique_tuples)} / {len(protein_offers)}")
if len(p_unique_tuples) != len(protein_offers):
    print("  WARNING: Duplicate offers detected in protein catalog!")

# -------------------------------------------------------------
# 2. CREATINE AUDIT
# -------------------------------------------------------------
print("\n" + "=" * 60)
print("--- 2. CREATINE CATALOG AUDIT ---")
c_brands = Counter(r['brand'] for r in creatine_offers)
c_types = Counter(r['type'] for r in creatine_offers)
c_subclasses = Counter(r.get('subclass', 'Unknown') for r in creatine_offers)
c_grades = Counter(r.get('grade', 'Unknown') for r in creatine_offers)
c_formulations = Counter(r.get('formulation', 'Unknown') for r in creatine_offers)
c_grams = Counter(r['grams'] for r in creatine_offers)

print(f"Brands ({len(c_brands)}):")
for b, count in c_brands.most_common():
    print(f"  - {b:25}: {count:3} offers")

print(f"\nTypes ({len(c_types)}):")
for t, count in c_types.most_common():
    print(f"  - {t:25}: {count:3} offers")

print(f"\nGrades ({len(c_grades)}):")
for g, count in c_grades.most_common():
    print(f"  - {g:25}: {count:3} offers")

print(f"\nFormulations ({len(c_formulations)}):")
for f, count in c_formulations.most_common():
    print(f"  - {f:25}: {count:3} offers")

print(f"\nPack Sizes (grams):")
for g, count in c_grams.most_common():
    print(f"  - {g:5}g: {count:3} offers")

# Completeness check
c_missing_creatine = [r for r in creatine_offers if r.get('creatine') is None]
c_missing_scoop = [r for r in creatine_offers if r.get('scoop') is None]
c_missing_energy = [r for r in creatine_offers if r.get('energy') is None]
c_missing_cost = [r for r in creatine_offers if r.get('cost') is None]

print(f"\nCompleteness:")
print(f"  - Missing Creatine %:  {len(c_missing_creatine)} / {len(creatine_offers)}")
print(f"  - Missing Scoop size:  {len(c_missing_scoop)} / {len(creatine_offers)}")
print(f"  - Missing Energy/100g: {len(c_missing_energy)} / {len(creatine_offers)}")
print(f"  - Missing Pure Cost:   {len(c_missing_cost)} / {len(creatine_offers)}")

# Math Consistency Check
c_cost_math_errors = []
for r in creatine_offers:
    c = r.get('cost')
    c_purity = r.get('creatine')
    price = r['price']
    grams = r['grams']
    powder_cost = r.get('powderCost')
    dose_cost = r.get('doseCost')
    
    # check powderCost
    expected_powder = price / grams
    if powder_cost is None or abs(powder_cost - expected_powder) > 1e-4:
        c_cost_math_errors.append((r['id'], 'powderCost', powder_cost, expected_powder))
        
    # check cost (pure creatine)
    if c_purity is not None:
        expected_pure = price / (grams * (c_purity / 100))
        if c is None or abs(c - expected_pure) > 1e-4:
            c_cost_math_errors.append((r['id'], 'cost', c, expected_pure))
        expected_dose = expected_pure * 3
        if dose_cost is None or abs(dose_cost - expected_dose) > 1e-4:
            c_cost_math_errors.append((r['id'], 'doseCost', dose_cost, expected_dose))
    else:
        if c is not None:
            c_cost_math_errors.append((r['id'], 'cost', c, None))

print(f"  - Cost Math Inconsistencies: {len(c_cost_math_errors)}")
if c_cost_math_errors:
    for err in c_cost_math_errors[:5]:
        print(f"    Anomaly: {err}")

# Outlier / Anomaly Detection
c_outliers = []
for r in creatine_offers:
    c_purity = r.get('creatine')
    cost = r.get('cost')
    dose_cost = r.get('doseCost')
    powder_cost = r.get('powderCost')
    if c_purity is not None and (c_purity < 30 or c_purity > 100):
        c_outliers.append(f"Unusual Creatine Purity: {r['brand']} {r['product']} -> {c_purity}%")
    if dose_cost is not None and (dose_cost < 3 or dose_cost > 60):
        c_outliers.append(f"Unusual 3g Dose Cost: {r['brand']} {r['product']} -> ₹{dose_cost:.2f}/dose")
    if powder_cost is not None and (powder_cost < 0.8 or powder_cost > 15):
        c_outliers.append(f"Unusual Powder Cost: {r['brand']} {r['product']} -> ₹{powder_cost:.2f}/g")

print(f"\nCreatine Anomaly Flags ({len(c_outliers)}):")
for o in c_outliers[:15]:
    print(f"  * {o}")

# Unique variants
c_unique_tuples = set((r['brand'], r['product'], r['flavour'], r['grams']) for r in creatine_offers)
print(f"\nUnique (brand, product, flavour, grams) variants: {len(c_unique_tuples)} / {len(creatine_offers)}")
if len(c_unique_tuples) != len(creatine_offers):
    print("  WARNING: Duplicate offers detected in creatine catalog!")
