import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadBundle} from '../scripts/build_site.mjs';
import {createSnapshot} from '../docs/model.js';
import {searchCatalog} from '../docs/search.js';
import {buildComparison} from '../docs/compare.js';
import {recommend} from '../docs/recommender.js';

const snapshot=loadBundle().then(createSnapshot);
test('new categories connect sourced exact packs, education, comparison and cost calculations',async()=>{
 const s=await snapshot;assert.deepEqual(s.quality.errors,[]);
 for(const id of ['glutathione','melatonin','biotin','vitamin-c','vitamin-b','folic-acid']){
  const c=s.categories[id];assert.equal(c.measurement,'units');assert.ok(c.offers.length);
  const result=searchCatalog(s,{q:id,category:id});assert.ok(result.products.length);assert.equal(result.guides.length,1);
  assert.ok(c.offers.some(r=>r.priceAudit.status==='verified'));
  for(const r of c.offers){
   assert.equal(r.trend.history.length,s.config.historyQuarters+1);
   for(const h of r.trend.history)if(h.verified)assert.ok(h.source?.startsWith('https://'));else assert.equal(h.price,null);
   if(c.mainNutrient==='multi')assert.equal(r.referenceCost,r.servingCost);
   else if(r[c.mainNutrient]==null||r.servingUnits==null)assert.equal(r.referenceCost,null);
   else assert.equal(r.referenceCost,r.price/(r.packServings*r[c.mainNutrient])*c.referenceQuantity);
  }
  const r=c.offers.find(r=>(c.mainNutrient==='multi'?c.nutrientFields.some(f=>r[f.key]!=null):r[c.mainNutrient]!=null)&&r.servingUnits!=null);assert.ok(r,'At least one verified label profile is needed');
  const comparison=buildComparison(s,[{category:id,id:r.id}]);
  assert.ok(comparison.note.includes(c.comparisonNote));
  assert.ok(comparison.rows.some(row=>c.nutrientFields.some(f=>f.key===row.id)&&row.values[0]!=='Unknown'));
  if(c.mainNutrient!=='multi')assert.ok(comparison.rows.some(row=>row.id==='reference-cost'&&row.label.includes(c.compoundLabel)));
  else assert.ok(!comparison.rows.some(row=>row.id==='reference-cost'||row.id==='score'));
 }
});

test('vitamin categories remain educational review items, including adult-clear contexts',async()=>{
 const s=await snapshot,r=recommend(s,{goals:s.recommender.goals.map(g=>g.id),context:'adult-clear',existing:[],diet:'any',budget:'',milkAllergy:'no',fishAllergy:'no'});
 for(const id of ['biotin','vitamin-c','vitamin-b','folic-acid']){const item=r.items.find(i=>i.category===id);assert.ok(item);assert.equal(item.review,true);assert.equal(item.eligible,false);assert.deepEqual(item.offers,[]);}
});

test('vitamin searches follow declared ingredients instead of broadcasting every B vitamin or folate form',async()=>{
 const s=await snapshot,b=s.categories['vitamin-b'],matches=searchCatalog(s,{q:'b12',category:b.id}).products.flatMap(p=>p.variants);
 assert.ok(matches.length);assert.ok(matches.some(r=>r.declaredNutrients.length>1));
 for(const r of b.offers.filter(r=>r.declaredNutrients.length===1&&!r.declaredNutrients.includes('vitaminB12Mcg')))assert.ok(!matches.some(m=>m.id===r.id));
 const b1=searchCatalog(s,{q:'b1',category:b.id}).products.flatMap(p=>p.variants);assert.ok(b1.length);assert.ok(b1.every(r=>r.declaredNutrients.includes('vitaminB1Mg')));
 const complex=searchCatalog(s,{q:'bcomplex',category:b.id}).products.flatMap(p=>p.variants);assert.ok(complex.length);assert.ok(complex.every(r=>r.declaredNutrients.length>1));
 const methyl=searchCatalog(s,{q:'methylfolate',category:'folic-acid'}).products.flatMap(p=>p.variants);assert.ok(methyl.length);assert.ok(methyl.every(r=>r.declaredNutrients.includes('methylfolateMcg')));
});

test('incorrect nutrient units and invalid cost comparison quantities reject dataset publication',async()=>{
 const b=await loadBundle(),biotin=b.config.categories.find(c=>c.id==='biotin');biotin.nutrientFields[0].unit='mg';assert.throws(()=>createSnapshot(b),/Invalid nutrient/);
 biotin.nutrientFields[0].unit='µg';b.config.categories.find(c=>c.id==='vitamin-b').nutrientFields[0].costQuantity=-1;assert.throws(()=>createSnapshot(b),/Invalid nutrient/);
});

test('melatonin and glutathione remain review items for an otherwise unrestricted adult',async()=>{
 const s=await snapshot,r=recommend(s,{goals:['stress','skin-claims'],context:'adult-clear',existing:[],diet:'any',budget:'',milkAllergy:'no',fishAllergy:'no'});
 for(const id of ['melatonin','glutathione']){const item=r.items.find(i=>i.category===id);assert.ok(item);assert.equal(item.review,true);assert.equal(item.eligible,false);assert.deepEqual(item.offers,[]);}
});
