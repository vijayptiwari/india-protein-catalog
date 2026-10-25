import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

CATALOG_PATH = os.path.join('docs', 'data', 'catalog.json')
CREATINE_PATH = os.path.join('docs', 'data', 'creatine.json')

# 1. Load catalog.json
with open(CATALOG_PATH, 'r', encoding='utf-8') as f:
    cat_data = json.load(f)

existing_protein_offers = cat_data['offers']
start_p_id = len(existing_protein_offers)
print(f"Existing protein offers: {start_p_id}")

new_protein_specs = [
    # --- The Whole Truth Foods ---
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Pure Whey Protein Isolate",
        "type": "Whey — isolate",
        "subclass": "Whey isolate",
        "flavour": "Unflavoured",
        "kg": 1,
        "price": 7499.0,
        "protein": 30.0 / 33.0 * 100.0,
        "scoop": 33.0,
        "serving": 33.0,
        "energy": 370.0,
        "url": "https://thewholetruthfoods.com/products/unflavoured-30g-pure-whey-protein-isolate",
        "nutritionUrl": "https://thewholetruthfoods.com/products/unflavoured-30g-pure-whey-protein-isolate",
        "basis": "30g protein / 33g serving; unflavoured raw isolate",
        "notes": "100% pure whey protein isolate with zero additives, zero sweeteners, and zero emulsifiers."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Pure Whey Protein Isolate",
        "type": "Whey — isolate",
        "subclass": "Whey isolate",
        "flavour": "Unflavoured",
        "kg": 2,
        "price": 14998.0,
        "protein": 30.0 / 33.0 * 100.0,
        "scoop": 33.0,
        "serving": 33.0,
        "energy": 370.0,
        "url": "https://thewholetruthfoods.com/products/unflavoured-30g-pure-whey-protein-isolate",
        "nutritionUrl": "https://thewholetruthfoods.com/products/unflavoured-30g-pure-whey-protein-isolate",
        "basis": "30g protein / 33g serving; unflavoured raw isolate",
        "notes": "100% pure whey protein isolate with zero additives, zero sweeteners, and zero emulsifiers."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Raw Whey Protein Concentrate",
        "type": "Whey — concentrate",
        "subclass": "Whey concentrate",
        "flavour": "Unflavoured",
        "kg": 1,
        "price": 4499.0,
        "protein": 26.0 / 33.0 * 100.0,
        "scoop": 33.0,
        "serving": 33.0,
        "energy": 390.0,
        "url": "https://thewholetruthfoods.com/products/unflavoured-raw-whey-protein-concentrate-26g",
        "nutritionUrl": "https://thewholetruthfoods.com/products/unflavoured-raw-whey-protein-concentrate-26g",
        "basis": "26g protein / 33g serving; unflavoured raw concentrate",
        "notes": "Cold-processed raw whey concentrate with 0g added sugar and no flavouring."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Raw Whey Protein Concentrate",
        "type": "Whey — concentrate",
        "subclass": "Whey concentrate",
        "flavour": "Unflavoured",
        "kg": 2,
        "price": 8998.0,
        "protein": 26.0 / 33.0 * 100.0,
        "scoop": 33.0,
        "serving": 33.0,
        "energy": 390.0,
        "url": "https://thewholetruthfoods.com/products/unflavoured-raw-whey-protein-concentrate-26g",
        "nutritionUrl": "https://thewholetruthfoods.com/products/unflavoured-raw-whey-protein-concentrate-26g",
        "basis": "26g protein / 33g serving; unflavoured raw concentrate",
        "notes": "Cold-processed raw whey concentrate with 0g added sugar and no flavouring."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Flavoured Whey Protein",
        "type": "Whey — concentrate",
        "subclass": "Whey concentrate",
        "flavour": "Light Cocoa",
        "kg": 1,
        "price": 5399.0,
        "protein": 24.0 / 33.0 * 100.0,
        "scoop": 33.0,
        "serving": 33.0,
        "energy": 395.0,
        "url": "https://thewholetruthfoods.com/products/light-cocoa-24g-protein-powder",
        "nutritionUrl": "https://thewholetruthfoods.com/products/light-cocoa-24g-protein-powder",
        "basis": "24g protein / 33g serving; brand product instructions",
        "notes": "Made with pure single-origin cocoa and raw whey. Clean label with zero artificial flavours."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Flavoured Whey Protein",
        "type": "Whey — concentrate",
        "subclass": "Whey concentrate",
        "flavour": "Light Cocoa",
        "kg": 2,
        "price": 10798.0,
        "protein": 24.0 / 33.0 * 100.0,
        "scoop": 33.0,
        "serving": 33.0,
        "energy": 395.0,
        "url": "https://thewholetruthfoods.com/products/light-cocoa-24g-protein-powder",
        "nutritionUrl": "https://thewholetruthfoods.com/products/light-cocoa-24g-protein-powder",
        "basis": "24g protein / 33g serving; brand product instructions",
        "notes": "Made with pure single-origin cocoa and raw whey. Clean label with zero artificial flavours."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Flavoured Whey Protein",
        "type": "Whey — concentrate",
        "subclass": "Whey concentrate",
        "flavour": "Cold Coffee",
        "kg": 1,
        "price": 5399.0,
        "protein": 24.0 / 33.0 * 100.0,
        "scoop": 33.0,
        "serving": 33.0,
        "energy": 395.0,
        "url": "https://thewholetruthfoods.com/products/cold-coffee-24g-protein-powder",
        "nutritionUrl": "https://thewholetruthfoods.com/products/cold-coffee-24g-protein-powder",
        "basis": "24g protein / 33g serving; brand product instructions",
        "notes": "Crafted with 100% Arabica instant coffee and real milk solids. Zero added artificial sweeteners."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Flavoured Whey Protein",
        "type": "Whey — concentrate",
        "subclass": "Whey concentrate",
        "flavour": "Cold Coffee",
        "kg": 2,
        "price": 10798.0,
        "protein": 24.0 / 33.0 * 100.0,
        "scoop": 33.0,
        "serving": 33.0,
        "energy": 395.0,
        "url": "https://thewholetruthfoods.com/products/cold-coffee-24g-protein-powder",
        "nutritionUrl": "https://thewholetruthfoods.com/products/cold-coffee-24g-protein-powder",
        "basis": "24g protein / 33g serving; brand product instructions",
        "notes": "Crafted with 100% Arabica instant coffee and real milk solids. Zero added artificial sweeteners."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Flavoured Whey Protein",
        "type": "Whey — concentrate",
        "subclass": "Whey concentrate",
        "flavour": "Pista Badaam",
        "kg": 1,
        "price": 5999.0,
        "protein": 24.0 / 33.0 * 100.0,
        "scoop": 33.0,
        "serving": 33.0,
        "energy": 395.0,
        "url": "https://thewholetruthfoods.com/products/pista-badaam-24g-protein-powder",
        "nutritionUrl": "https://thewholetruthfoods.com/products/pista-badaam-24g-protein-powder",
        "basis": "24g protein / 33g serving; brand product instructions",
        "notes": "Real crushed Californian almonds and Iranian pistachios. 100% natural formulation."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Flavoured Whey Protein",
        "type": "Whey — concentrate",
        "subclass": "Whey concentrate",
        "flavour": "Pista Badaam",
        "kg": 2,
        "price": 11998.0,
        "protein": 24.0 / 33.0 * 100.0,
        "scoop": 33.0,
        "serving": 33.0,
        "energy": 395.0,
        "url": "https://thewholetruthfoods.com/products/pista-badaam-24g-protein-powder",
        "nutritionUrl": "https://thewholetruthfoods.com/products/pista-badaam-24g-protein-powder",
        "basis": "24g protein / 33g serving; brand product instructions",
        "notes": "Real crushed Californian almonds and Iranian pistachios. 100% natural formulation."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Flavoured Whey Protein",
        "type": "Whey — concentrate",
        "subclass": "Whey concentrate",
        "flavour": "Mango Milkshake",
        "kg": 1,
        "price": 6399.0,
        "protein": 24.0 / 33.0 * 100.0,
        "scoop": 33.0,
        "serving": 33.0,
        "energy": 395.0,
        "url": "https://thewholetruthfoods.com/products/mango-milkshake-24g-protein-powder",
        "nutritionUrl": "https://thewholetruthfoods.com/products/mango-milkshake-24g-protein-powder",
        "basis": "24g protein / 33g serving; brand product instructions",
        "notes": "Real Alphonso mango pulp powder paired with premium unadulterated whey concentrate."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Flavoured Whey Protein",
        "type": "Whey — concentrate",
        "subclass": "Whey concentrate",
        "flavour": "Strawberry Shake",
        "kg": 1,
        "price": 6399.0,
        "protein": 24.0 / 33.0 * 100.0,
        "scoop": 33.0,
        "serving": 33.0,
        "energy": 395.0,
        "url": "https://thewholetruthfoods.com/products/strawberry-shake-24g-protein-powder",
        "nutritionUrl": "https://thewholetruthfoods.com/products/strawberry-shake-24g-protein-powder",
        "basis": "24g protein / 33g serving; brand product instructions",
        "notes": "Real dried strawberries blended with pure whey concentrate. Zero chemical additives."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Plant Protein",
        "type": "Plant — blend",
        "subclass": "Plant isolate",
        "flavour": "Unflavoured",
        "kg": 1,
        "price": 2650.0,
        "protein": 30.0 / 36.0 * 100.0,
        "scoop": 36.0,
        "serving": 36.0,
        "energy": 375.0,
        "url": "https://thewholetruthfoods.com/products/unflavoured-30g-plant-protein",
        "nutritionUrl": "https://thewholetruthfoods.com/products/unflavoured-30g-plant-protein",
        "basis": "30g protein / 36g serving; pea + brown rice isolate blend",
        "notes": "100% plant-based blend of non-GMO European pea isolate and brown rice isolate."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Plant Protein",
        "type": "Plant — blend",
        "subclass": "Plant isolate",
        "flavour": "Unflavoured",
        "kg": 2,
        "price": 5300.0,
        "protein": 30.0 / 36.0 * 100.0,
        "scoop": 36.0,
        "serving": 36.0,
        "energy": 375.0,
        "url": "https://thewholetruthfoods.com/products/unflavoured-30g-plant-protein",
        "nutritionUrl": "https://thewholetruthfoods.com/products/unflavoured-30g-plant-protein",
        "basis": "30g protein / 36g serving; pea + brown rice isolate blend",
        "notes": "100% plant-based blend of non-GMO European pea isolate and brown rice isolate."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Plant Protein",
        "type": "Plant — blend",
        "subclass": "Plant concentrate / powder",
        "flavour": "Double Cocoa",
        "kg": 1,
        "price": 2650.0,
        "protein": 25.0 / 36.0 * 100.0,
        "scoop": 36.0,
        "serving": 36.0,
        "energy": 380.0,
        "url": "https://thewholetruthfoods.com/products/double-cocoa-25g-plant-protein",
        "nutritionUrl": "https://thewholetruthfoods.com/products/double-cocoa-25g-plant-protein",
        "basis": "25g protein / 36g serving; plant isolate + rich cocoa",
        "notes": "European pea and brown rice protein naturally sweetened with dates and cocoa powder."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Plant Protein",
        "type": "Plant — blend",
        "subclass": "Plant concentrate / powder",
        "flavour": "Double Cocoa",
        "kg": 2,
        "price": 5300.0,
        "protein": 25.0 / 36.0 * 100.0,
        "scoop": 36.0,
        "serving": 36.0,
        "energy": 380.0,
        "url": "https://thewholetruthfoods.com/products/double-cocoa-25g-plant-protein",
        "nutritionUrl": "https://thewholetruthfoods.com/products/double-cocoa-25g-plant-protein",
        "basis": "25g protein / 36g serving; plant isolate + rich cocoa",
        "notes": "European pea and brown rice protein naturally sweetened with dates and cocoa powder."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Plant Protein",
        "type": "Plant — blend",
        "subclass": "Plant concentrate / powder",
        "flavour": "Pista Badaam",
        "kg": 1,
        "price": 2950.0,
        "protein": 24.0 / 36.0 * 100.0,
        "scoop": 36.0,
        "serving": 36.0,
        "energy": 380.0,
        "url": "https://thewholetruthfoods.com/products/pista-badaam-24g-plant-protein",
        "nutritionUrl": "https://thewholetruthfoods.com/products/pista-badaam-24g-plant-protein",
        "basis": "24g protein / 36g serving; plant isolate + real nuts",
        "notes": "Plant protein blend enhanced with roasted pistachio pieces and almond flour."
    },
    {
        "brand": "The Whole Truth",
        "product": "The Whole Truth Plant Protein",
        "type": "Plant — blend",
        "subclass": "Plant concentrate / powder",
        "flavour": "Pista Badaam",
        "kg": 2,
        "price": 5900.0,
        "protein": 24.0 / 36.0 * 100.0,
        "scoop": 36.0,
        "serving": 36.0,
        "energy": 380.0,
        "url": "https://thewholetruthfoods.com/products/pista-badaam-24g-plant-protein",
        "nutritionUrl": "https://thewholetruthfoods.com/products/pista-badaam-24g-plant-protein",
        "basis": "24g protein / 36g serving; plant isolate + real nuts",
        "notes": "Plant protein blend enhanced with roasted pistachio pieces and almond flour."
    },

    # --- TrueBasics ---
    {
        "brand": "TrueBasics",
        "product": "TrueBasics Clean Whey Protein Isolate",
        "type": "Whey — isolate",
        "subclass": "Whey isolate",
        "flavour": "Chocolate",
        "kg": 1,
        "price": 5999.0,
        "protein": 28.0 / 34.0 * 100.0,
        "scoop": 34.0,
        "serving": 34.0,
        "energy": 405.2,
        "url": "https://www.truebasics.com/sv/truebasics-clean-whey-protein-isolate/SP-135063",
        "nutritionUrl": "https://www.truebasics.com/sv/truebasics-clean-whey-protein-isolate/SP-135063",
        "basis": "28g protein / 34g serving; Clean Label Project certified",
        "notes": "100% microfiltered whey isolate with 6.18g BCAAs and no heavy metal contaminants."
    },
    {
        "brand": "TrueBasics",
        "product": "TrueBasics Clean Whey Protein Isolate",
        "type": "Whey — isolate",
        "subclass": "Whey isolate",
        "flavour": "Chocolate",
        "kg": 2,
        "price": 11499.0,
        "protein": 28.0 / 34.0 * 100.0,
        "scoop": 34.0,
        "serving": 34.0,
        "energy": 405.2,
        "url": "https://www.truebasics.com/pk/clean-whey-protein-isolate-2kg-chocolate-pack?navKey=PA-133303",
        "nutritionUrl": "https://www.truebasics.com/pk/clean-whey-protein-isolate-2kg-chocolate-pack?navKey=PA-133303",
        "basis": "28g protein / 34g serving; Clean Label Project certified",
        "notes": "100% microfiltered whey isolate with 6.18g BCAAs and no heavy metal contaminants."
    },
    {
        "brand": "TrueBasics",
        "product": "TrueBasics Clean Whey Protein Isolate",
        "type": "Whey — isolate",
        "subclass": "Whey isolate",
        "flavour": "Vanilla",
        "kg": 1,
        "price": 5999.0,
        "protein": 28.0 / 34.0 * 100.0,
        "scoop": 34.0,
        "serving": 34.0,
        "energy": 405.2,
        "url": "https://www.truebasics.com/sv/truebasics-clean-whey-protein-isolate/SP-135063",
        "nutritionUrl": "https://www.truebasics.com/sv/truebasics-clean-whey-protein-isolate/SP-135063",
        "basis": "28g protein / 34g serving; Clean Label Project certified",
        "notes": "Clean Label Project certified pure whey isolate with natural French vanilla aroma."
    },
    {
        "brand": "TrueBasics",
        "product": "TrueBasics Clean Whey Protein Isolate + Concentrate",
        "type": "Whey — blend",
        "subclass": "Whey blend",
        "flavour": "Chocolate",
        "kg": 1,
        "price": 4899.0,
        "protein": 25.2 / 35.0 * 100.0,
        "scoop": 35.0,
        "serving": 35.0,
        "energy": 399.17,
        "url": "https://www.truebasics.com/sv/truebasics-clean-whey-protein-isolate-plus-concentrate/SP-135011",
        "nutritionUrl": "https://www.truebasics.com/sv/truebasics-clean-whey-protein-isolate-plus-concentrate/SP-135011",
        "basis": "25.2g protein / 35g serving; brand lab facts",
        "notes": "Whey Isolate + Concentrate matrix delivering 5.39g BCAAs and 11.83g EAAs per scoop."
    },
    {
        "brand": "TrueBasics",
        "product": "TrueBasics Clean Whey Protein Isolate + Concentrate",
        "type": "Whey — blend",
        "subclass": "Whey blend",
        "flavour": "Chocolate",
        "kg": 2,
        "price": 9349.0,
        "protein": 25.2 / 35.0 * 100.0,
        "scoop": 35.0,
        "serving": 35.0,
        "energy": 399.17,
        "url": "https://www.truebasics.com/pk/clean-whey-protein-isolate-plus-concentrate-2kg-chocolate-pack?navKey=PA-133197",
        "nutritionUrl": "https://www.truebasics.com/pk/clean-whey-protein-isolate-plus-concentrate-2kg-chocolate-pack?navKey=PA-133197",
        "basis": "25.2g protein / 35g serving; brand lab facts",
        "notes": "Whey Isolate + Concentrate matrix delivering 5.39g BCAAs and 11.83g EAAs per scoop."
    },
    {
        "brand": "TrueBasics",
        "product": "TrueBasics Clean Raw Whey Concentrate",
        "type": "Whey — concentrate",
        "subclass": "Whey concentrate",
        "flavour": "Unflavoured",
        "kg": 1,
        "price": 3799.0,
        "protein": 80.0,
        "scoop": 30.0,
        "serving": 30.0,
        "energy": 393.33,
        "url": "https://www.truebasics.com/sv/truebasics-clean-raw-whey-concentrate/SP-136503",
        "nutritionUrl": "https://www.truebasics.com/sv/truebasics-clean-raw-whey-concentrate/SP-136503",
        "basis": "24g protein / 30g serving; unflavoured raw concentrate",
        "notes": "Instantized unsweetened whey concentrate tested for heavy metals and pesticide residues."
    },
    {
        "brand": "TrueBasics",
        "product": "TrueBasics Clean Plant Protein",
        "type": "Plant — blend",
        "subclass": "Plant concentrate / powder",
        "flavour": "Chocolate",
        "kg": 1,
        "price": 2099.0,
        "protein": 24.0 / 37.0 * 100.0,
        "scoop": 37.0,
        "serving": 37.0,
        "energy": 407.0,
        "url": "https://www.truebasics.com/sv/truebasics-clean-plant-protein/SP-136871",
        "nutritionUrl": "https://www.truebasics.com/sv/truebasics-clean-plant-protein/SP-136871",
        "basis": "24g protein / 37g serving; pea + rice blend",
        "notes": "Clean certified vegan protein providing 4.58g BCAAs and 9.39g EAAs per serving."
    },
    {
        "brand": "TrueBasics",
        "product": "TrueBasics Clean Yeast Protein",
        "type": "Plant + fermented yeast",
        "subclass": "Fermented yeast protein",
        "flavour": "Coffee",
        "kg": 1,
        "price": 2099.0,
        "protein": 24.0 / 35.0 * 100.0,
        "scoop": 35.0,
        "serving": 35.0,
        "energy": 385.0,
        "url": "https://www.truebasics.com/sv/truebasics-clean-yeast-protein/SP-140799",
        "nutritionUrl": "https://www.truebasics.com/sv/truebasics-clean-yeast-protein/SP-140799",
        "basis": "24g protein / 35g serving; fermented yeast protein",
        "notes": "Fermented AnPro yeast protein offering complete amino acid bioavailability with zero gut irritation."
    },

    # --- The Good Bug ---
    {
        "brand": "The Good Bug",
        "product": "The Good Bug Pro Digestive Protein",
        "type": "Plant + fermented yeast",
        "subclass": "Fermented yeast + pea isolate",
        "flavour": "Belgian Chocolate",
        "kg": 1,
        "price": 2199.0,
        "protein": 26.0 / 38.0 * 100.0,
        "scoop": 38.0,
        "serving": 38.0,
        "energy": 375.0,
        "url": "https://thegoodbug.com/products/pro-digestive-protein",
        "nutritionUrl": "https://thegoodbug.com/products/pro-digestive-protein",
        "basis": "26g protein / 38g serving; brand lab facts",
        "notes": "Fermented yeast protein isolate (49.98%) + Pea protein isolate (32.07%) with Pepzyme Pro 1B CFU probiotics."
    },
    {
        "brand": "The Good Bug",
        "product": "The Good Bug Pro Digestive Protein",
        "type": "Plant + fermented yeast",
        "subclass": "Fermented yeast + pea isolate",
        "flavour": "Belgian Chocolate",
        "kg": 2,
        "price": 3999.0,
        "protein": 26.0 / 38.0 * 100.0,
        "scoop": 38.0,
        "serving": 38.0,
        "energy": 375.0,
        "url": "https://thegoodbug.com/products/pro-digestive-protein",
        "nutritionUrl": "https://thegoodbug.com/products/pro-digestive-protein",
        "basis": "26g protein / 38g serving; brand lab facts",
        "notes": "Fermented yeast protein isolate (49.98%) + Pea protein isolate (32.07%) with Pepzyme Pro 1B CFU probiotics."
    }
]

print(f"Total new protein offers to add: {len(new_protein_specs)}")

formatted_protein_offers = []
for i, spec in enumerate(new_protein_specs):
    pid = start_p_id + i
    kg = spec["kg"]
    price = spec["price"]
    protein = spec["protein"]
    cost = price / (kg * 10.0 * protein)
    
    offer = {
        "id": pid,
        "brand": spec["brand"],
        "product": spec["product"],
        "type": spec["type"],
        "flavour": spec["flavour"],
        "kg": kg,
        "price": price,
        "stock": "In stock",
        "protein": protein,
        "scoop": spec["scoop"],
        "serving": spec["serving"],
        "subclass": spec["subclass"],
        "energy": spec["energy"],
        "cost": cost,
        "url": spec["url"],
        "nutritionUrl": spec["nutritionUrl"],
        "basis": spec["basis"],
        "notes": spec["notes"],
        "energyBasis": "Brand official label / serving instructions",
        "trend": {
            "pct": 0.0,
            "direction": "new",
            "prevPrice": price,
            "currentPrice": price,
            "history": [
                {"date": "2026-10-01", "price": price},
                {"date": "2026-10-25", "price": price}
            ]
        },
        "isNew": True,
        "addedDate": "2026-10-25"
    }
    formatted_protein_offers.append(offer)

cat_data['offers'] = existing_protein_offers + formatted_protein_offers
cat_data['checked'] = "2026-10-25"

with open(CATALOG_PATH, 'w', encoding='utf-8') as f:
    json.dump(cat_data, f, ensure_ascii=False)

print(f"Updated catalog.json: now has {len(cat_data['offers'])} offers.")

# 2. Load creatine.json
with open(CREATINE_PATH, 'r', encoding='utf-8') as f:
    cr_data = json.load(f)

existing_cr_offers = cr_data['offers'] if isinstance(cr_data, dict) and 'offers' in cr_data else cr_data
start_cr_idx = len(existing_cr_offers)
print(f"Existing creatine offers: {start_cr_idx}")

new_creatine_specs = [
    {
        "id": f"cr-{start_cr_idx}",
        "brand": "TrueBasics",
        "product": "TrueBasics Clean Creatine Monohydrate",
        "type": "Monohydrate",
        "subclass": "Micronized",
        "grade": "Clean Label Project",
        "formulation": "Flavoured powder",
        "packaging": "Sachets",
        "flavour": "Citrus",
        "grams": 120.0,
        "kg": 0.12,
        "price": 649.0,
        "stock": "In stock",
        "creatine": 75,
        "scoop": 4.0,
        "serving": 4.0,
        "creatineServing": 3,
        "energy": None,
        "url": "https://www.truebasics.com/sv/truebasics-clean-creatine-monohydrate/SP-140031",
        "nutritionUrl": "https://www.truebasics.com/sv/truebasics-clean-creatine-monohydrate/SP-140031",
        "basis": "3g pure creatine monohydrate per 4g single-serve sachet (30 sachets pack).",
        "notes": "Single-serve travel sachets with zero added sugar and citrus flavouring.",
        "energyBasis": "",
        "checked": "2026-10-25",
        "powderCost": 649.0 / 120.0,
        "cost": 649.0 / (120.0 * 75.0 / 100.0),
        "doseCost": (649.0 / (120.0 * 75.0 / 100.0)) * 3.0,
        "trend": {
            "pct": 0.0,
            "direction": "new",
            "prevPrice": 649.0,
            "currentPrice": 649.0,
            "history": [
                {"date": "2026-10-01", "price": 649.0},
                {"date": "2026-10-25", "price": 649.0}
            ]
        },
        "isNew": True,
        "addedDate": "2026-10-25"
    },
    {
        "id": f"cr-{start_cr_idx + 1}",
        "brand": "TrueBasics",
        "product": "TrueBasics Clean Creatine Monohydrate",
        "type": "Monohydrate",
        "subclass": "Micronized",
        "grade": "Clean Label Project",
        "formulation": "Flavoured powder",
        "packaging": "Sachets",
        "flavour": "Citrus",
        "grams": 240.0,
        "kg": 0.24,
        "price": 1199.0,
        "stock": "In stock",
        "creatine": 75,
        "scoop": 4.0,
        "serving": 4.0,
        "creatineServing": 3,
        "energy": None,
        "url": "https://www.truebasics.com/pk/clean-creatine-monohydrate-citrus-60-sachets-pack?navKey=PA-133869",
        "nutritionUrl": "https://www.truebasics.com/pk/clean-creatine-monohydrate-citrus-60-sachets-pack?navKey=PA-133869",
        "basis": "3g pure creatine monohydrate per 4g single-serve sachet (60 sachets pack).",
        "notes": "Single-serve travel sachets with zero added sugar and citrus flavouring.",
        "energyBasis": "",
        "checked": "2026-10-25",
        "powderCost": 1199.0 / 240.0,
        "cost": 1199.0 / (240.0 * 75.0 / 100.0),
        "doseCost": (1199.0 / (240.0 * 75.0 / 100.0)) * 3.0,
        "trend": {
            "pct": 0.0,
            "direction": "new",
            "prevPrice": 1199.0,
            "currentPrice": 1199.0,
            "history": [
                {"date": "2026-10-01", "price": 1199.0},
                {"date": "2026-10-25", "price": 1199.0}
            ]
        },
        "isNew": True,
        "addedDate": "2026-10-25"
    }
]

if isinstance(cr_data, dict) and 'offers' in cr_data:
    cr_data['offers'] = existing_cr_offers + new_creatine_specs
    cr_data['checked'] = "2026-10-25"
else:
    cr_data = existing_cr_offers + new_creatine_specs

with open(CREATINE_PATH, 'w', encoding='utf-8') as f:
    json.dump(cr_data, f, ensure_ascii=False)

print(f"Updated creatine.json: now has {len(cr_data['offers'] if isinstance(cr_data, dict) else cr_data)} offers.")
