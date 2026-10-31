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
 for(const id of ['glutathione','melatonin']){
  const c=s.categories[id];assert.equal(c.measurement,'units');assert.ok(c.offers.length);
  const result=searchCatalog(s,{q:id,category:id});assert.ok(result.products.length);assert.equal(result.guides.length,1);
  assert.ok(c.offers.some(r=>r.priceAudit.status==='verified'));
  for(const r of c.offers){
   assert.equal(r.trend.history.length,s.config.historyQuarters+1);
   for(const h of r.trend.history)if(h.verified)assert.ok(h.source?.startsWith('https://'));else assert.equal(h.price,null);
   if(r[c.mainNutrient]==null||r.servingUnits==null)assert.equal(r.referenceCost,null);
   else assert.equal(r.referenceCost,r.price/(r.packServings*r[c.mainNutrient])*c.referenceQuantity);
  }
  const r=c.offers.find(r=>r[c.mainNutrient]!=null&&r.servingUnits!=null);assert.ok(r,'At least one verified label profile is needed');
  const comparison=buildComparison(s,[{category:id,id:r.id}]);
  assert.ok(comparison.note.includes(c.comparisonNote));
  assert.ok(comparison.rows.some(row=>row.id===c.mainNutrient&&row.values[0].includes('mg')));
  assert.ok(comparison.rows.some(row=>row.id==='reference-cost'&&row.label.includes(c.compoundLabel)));
 }
});

test('melatonin and glutathione remain review items for an otherwise unrestricted adult',async()=>{
 const s=await snapshot,r=recommend(s,{goals:['stress','skin-claims'],context:'adult-clear',existing:[],diet:'any',budget:'',milkAllergy:'no',fishAllergy:'no'});
 for(const id of ['melatonin','glutathione']){const item=r.items.find(i=>i.category===id);assert.ok(item);assert.equal(item.review,true);assert.equal(item.eligible,false);assert.deepEqual(item.offers,[]);}
});
