import fs from 'node:fs';

const proteinData = JSON.parse(fs.readFileSync('docs/data/catalog.json', 'utf8'));
const creatineData = JSON.parse(fs.readFileSync('docs/data/creatine.json', 'utf8'));

console.log('--- PROTEIN SCORING ANALYSIS ---');
const proteinOffers = proteinData.offers.filter(r => r.cost != null && r.protein != null && r.energy != null);

// Scientific Effectiveness Formula for Protein:
// 1. Protein Yield Per Rupee = 1 / Cost per gram of protein (g protein per ₹)
// 2. Protein Purity Ratio = Protein % / 100
// 3. Caloric Density Efficiency = (4 * Protein %) / Energy (kcal per 100g)
// Formula: Bio-Efficiency Score (0 - 100 normalized) or Raw Index:
// Score = (100 / Cost_per_g) * (Protein% / 100) * ((4 * Protein%) / Energy)
for (const r of proteinOffers) {
  const calPurity = Math.min(1, (4 * r.protein) / r.energy);
  const purityRatio = r.protein / 100;
  const yieldPerRupee = 100 / r.cost; // grams of pure protein per ₹100 spent
  r.effScore = yieldPerRupee * purityRatio * calPurity;
}

proteinOffers.sort((a, b) => b.effScore - a.effScore);

console.log('Top 15 Protein Offers by Bio-Efficiency Score:');
proteinOffers.slice(0, 15).forEach((r, i) => {
  console.log(`${i+1}. [${r.brand}] ${r.product} (${r.flavour}, ${r.kg}kg)`);
  console.log(`   Price: ₹${r.price} | Cost/g: ₹${r.cost.toFixed(2)} | Protein: ${r.protein}% | Energy: ${r.energy} kcal | Score: ${r.effScore.toFixed(2)} | Stock: ${r.stock}`);
});

console.log('\n--- CREATINE SCORING ANALYSIS ---');
// For Creatine:
// 1. Active Compound Cost Efficiency = 100 / Cost per gram of active compound (g active compound per ₹100 spent)
// 2. Compound Concentration = Creatine % / 100
// 3. Processing / Form multiplier: Creapure / Micronized single ingredient bonus, or purely:
// Score = (100 / Compound_Cost) * (Creatine % / 100)
// If energy is disclosed, we can also factor non-calorie purity, but for pure creatine, 100% compound has near 0 cal.
const creatineOffers = creatineData.offers.filter(r => r.cost != null && r.creatine != null);
for (const r of creatineOffers) {
  const compoundPurity = r.creatine / 100;
  const yieldPerRupee = 100 / r.cost; // grams of compound per ₹100
  // If energy disclosed and > 0 (e.g. flavoured / HMB blends with calories), factor caloric efficiency:
  const calEfficiency = (r.energy && r.energy > 0) ? Math.max(0.5, 1 - (r.energy / 400)) : 1.0;
  r.effScore = yieldPerRupee * compoundPurity * calEfficiency;
}

creatineOffers.sort((a, b) => b.effScore - a.effScore);

console.log('Top 15 Creatine Offers by Bio-Efficiency Score:');
creatineOffers.slice(0, 15).forEach((r, i) => {
  console.log(`${i+1}. [${r.brand}] ${r.product} (${r.flavour}, ${r.grams}g, ${r.type})`);
  console.log(`   Price: ₹${r.price} | Cost/g compound: ₹${r.cost.toFixed(2)} | Compound: ${r.creatine}% | Score: ${r.effScore.toFixed(2)} | Stock: ${r.stock}`);
});
