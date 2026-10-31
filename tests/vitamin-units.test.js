import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUnitInputs,completeUnitLabel} from '../docs/units.js';
import {filterOffers} from '../docs/core.js';
import {buildComparison} from '../docs/compare.js';
import {marketGroup} from '../docs/marketplace.js';
const base={price:600,packCount:60,form:'Tablet',servingUnits:1};
const single=(id,key,unit,referenceQuantity)=>({id,measurement:'units',mainNutrient:key,referenceQuantity,referenceUnit:unit,nutrientFields:[{key,label:id,unit}]});

test('biotin microgram and vitamin C milligram costs preserve the declared serving basis',()=>{
 const biotin=single('biotin','biotinMcg','µg',1000),c=single('vitamin-c','vitaminCMg','mg',100);
 assert.equal(normalizeUnitInputs({...base,biotinMcg:10000},biotin).offer.referenceCost,1);
 assert.equal(normalizeUnitInputs({...base,servingUnits:2,biotinMcg:10000},biotin).offer.referenceCost,2);
 assert.equal(normalizeUnitInputs({...base,vitaminCMg:1000},c).offer.referenceCost,1);
 for(const [definition,key] of [[biotin,'biotinMcg'],[c,'vitaminCMg']]){
  for(const value of [-1,'1000',Infinity])assert.ok(normalizeUnitInputs({...base,[key]:value},definition).issues.some(i=>i.severity==='error'&&i.field===key));
  const r=normalizeUnitInputs({...base,blendMg:1000},definition).offer;assert.equal(r.referenceCost,null);
 }
});

test('folic acid, methylfolate and DFE are not silently converted or substituted',()=>{
 const c={...single('folic-acid','folicAcidMcg','µg',100),nutrientFields:[{key:'folicAcidMcg',label:'Folic acid',unit:'µg'},{key:'methylfolateMcg',label:'Methylfolate',unit:'µg',costQuantity:100},{key:'folateMcgDfe',label:'Folate',unit:'µg DFE',costQuantity:100}]};
 const r=normalizeUnitInputs({...base,methylfolateMcg:400,folateMcgDfe:680},c).offer;
 assert.equal(r.folicAcidMcg,null);assert.equal(r.referenceCost,null);assert.equal(r.costPer_methylfolateMcg,2.5);assert.ok(Math.abs(r.costPer_folateMcgDfe-1000/680)<1e-10);
 const folic=normalizeUnitInputs({...base,folicAcidMcg:176.47},c).offer;assert.equal(folic.methylfolateMcg,null);assert.equal(folic.folateMcgDfe,null);assert.ok(Math.abs(folic.referenceCost-1000/176.47)<1e-10);
});

const b={id:'vitamin-b',label:'Vitamin B',measurement:'units',mainNutrient:'multi',referenceQuantity:1,referenceUnit:'label serving',nutrientFields:[{key:'vitaminB1Mg',label:'B1',unit:'mg',costQuantity:1},{key:'vitaminB6Mg',label:'B6',unit:'mg',costQuantity:1},{key:'folicAcidMcg',label:'Folic acid',unit:'µg',costQuantity:100},{key:'vitaminB12Mcg',label:'B12',unit:'µg',costQuantity:1}]};
test('B-complex prices retain separate vitamins and rederive each cost from data updates',()=>{
 const raw={...base,servingUnits:2,declaredNutrients:['vitaminB1Mg','vitaminB6Mg','vitaminB12Mcg'],vitaminB1Mg:2,vitaminB6Mg:3,vitaminB12Mcg:4};
 const {offer:r,issues}=normalizeUnitInputs(raw,b);assert.deepEqual(issues,[]);assert.equal(r.servingCost,20);assert.equal(r.referenceCost,20);assert.equal(r.activeUnitCost,null);
 assert.equal(r.costPer_vitaminB1Mg,10);assert.equal(r.costPer_vitaminB6Mg,20/3);assert.equal(r.costPer_vitaminB12Mcg,5);
 const updated=normalizeUnitInputs({...raw,price:1200,costPer_vitaminB12Mcg:999,nutrientReferenceCosts:{vitaminB12Mcg:999}},b).offer;assert.equal(updated.costPer_vitaminB12Mcg,10);
 assert.equal(filterOffers([r],{costPer_vitaminB12McgMax:4},b.id,b).length,0);assert.equal(filterOffers([r],{costPer_vitaminB12McgMin:5},b.id,b).length,1);
 const comparison=buildComparison({config:{locale:'en-IN',currency:'INR'},categories:{'vitamin-b':{...b,offers:[{...r,id:'b1'}]}}},[{category:b.id,id:'b1'}]);
 assert.ok(comparison.rows.some(row=>row.id==='costPer_vitaminB12Mcg'));assert.ok(!comparison.rows.some(row=>row.id==='reference-cost'||row.id==='score'));
});

test('complete vitamin labels follow declared vitamins instead of demanding every B vitamin in a B12 pack',()=>{
 const r=normalizeUnitInputs({...base,declaredNutrients:['vitaminB12Mcg'],vitaminB12Mcg:2.2},b).offer;assert.ok(completeUnitLabel(r,b));assert.equal(filterOffers([r],{complete:true},b.id,b).length,1);
 const incomplete=normalizeUnitInputs({...base,declaredNutrients:['vitaminB12Mcg','vitaminB6Mg'],vitaminB12Mcg:2.2},b).offer;assert.ok(!completeUnitLabel(incomplete,b));assert.equal(filterOffers([incomplete],{complete:true},b.id,b).length,0);
 assert.ok(normalizeUnitInputs({...base,declaredNutrients:['totalBStrength']},b).issues.some(i=>i.field==='declaredNutrients'&&i.severity==='error'));
 const html=marketGroup(b,{brand:'Example',product:'B12',count:1,variations:[{...r,id:'b12',brand:'Example',flavour:'Plain',type:'B12',subclass:'Single vitamin',priceAudit:{status:'verified'},stock:'In stock'}]},{config:{locale:'en-IN',currency:'INR'}},()=>'<table></table>');
 assert.ok(html.includes('2.2 µg / label serving'));assert.ok(!html.includes('<dt>B1 (mg)</dt>'));
});
