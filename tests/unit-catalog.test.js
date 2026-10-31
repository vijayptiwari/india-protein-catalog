import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUnitInputs} from '../docs/units.js';
import {filterOffers} from '../docs/core.js';
const fish={id:'fish-oil',measurement:'units',mainNutrient:'epaDhaMg',referenceQuantity:1000,referenceUnit:'mg',nutrientFields:[{key:'epaDhaMg',label:'EPA+DHA',unit:'mg'}]};
const raw={price:600,packCount:60,form:'Softgel',servingUnits:2,fishOilMg:2000,epaMg:600,dhaMg:400};
test('fish oil costs use label servings and EPA+DHA rather than total oil',()=>{const {offer:r,issues}=normalizeUnitInputs(raw,fish);assert.deepEqual(issues,[]);assert.equal(r.packServings,30);assert.equal(r.unitCost,10);assert.equal(r.servingCost,20);assert.equal(r.epaDhaMg,1000);assert.equal(r.referenceCost,20);assert.equal(r.rankingEligible,false);});
test('combined omega amount never invents component split; unknown servings never become one',()=>{let r=normalizeUnitInputs({...raw,epaMg:null,dhaMg:null,epaDhaMg:600},fish).offer;assert.equal(r.epaMg,null);assert.equal(r.referenceCost,100/3);r=normalizeUnitInputs({...raw,servingUnits:null},fish).offer;assert.equal(r.servingCost,null);assert.equal(r.referenceCost,null);assert.equal(r.unitCost,10);});
test('Vitamin D conversions agree and contradictory units fail validation',()=>{const d={...fish,mainNutrient:'vitaminDIu'};let r=normalizeUnitInputs({...raw,vitaminDIu:600},d).offer;assert.equal(r.vitaminDMcg,15);r=normalizeUnitInputs({...raw,vitaminDMcg:125},d).offer;assert.equal(r.vitaminDIu,5000);assert.ok(normalizeUnitInputs({...raw,vitaminDIu:600,vitaminDMcg:100},d).issues.some(i=>i.severity==='error'));});
test('mineral salt mass cannot substitute for elemental magnesium',()=>{const d={...fish,mainNutrient:'magnesiumMg',referenceQuantity:100};let r=normalizeUnitInputs({...raw,magnesiumCompoundMg:864},d).offer;assert.equal(r.magnesiumMg,null);assert.equal(r.referenceCost,null);r=normalizeUnitInputs({...raw,magnesiumCompoundMg:864,magnesiumMg:121,mineralBasis:'elemental'},d).offer;assert.ok(Math.abs(r.referenceCost-2000/121)<1e-10);assert.ok(normalizeUnitInputs({...raw,magnesiumMg:121},d).issues.some(i=>i.field==='magnesiumMg'&&i.severity==='error'));});
test('ZMC requires all three minerals and has no combined mineral mass score',()=>{const d={...fish,id:'zmc',mainNutrient:'multi'};const x={...raw,declaredActives:['calcium','magnesium','zinc'],calciumMg:250,magnesiumMg:100,zincMg:4,mineralBasis:'elemental'};const r=normalizeUnitInputs(x,d).offer;assert.equal(r.referenceCost,20);assert.equal(r.activeUnitCost,null);assert.ok(normalizeUnitInputs({...x,declaredActives:['zinc','magnesium']},d).issues.some(i=>i.severity==='error'));});
test('withanolides need a verified standardized extract, not total root blend mass',()=>{const d={...fish,mainNutrient:'ashwagandhaMg'};assert.equal(normalizeUnitInputs({...raw,ashwagandhaMg:1500,withanolidesPct:5},d).offer.withanolidesMg,null);assert.equal(normalizeUnitInputs({...raw,standardizedExtractMg:500,withanolidesPct:5},d).offer.withanolidesMg,25);});
test('data-only updates recalculate pack costs and dynamic unit filters',()=>{const r=normalizeUnitInputs({...raw,unitCost:999,referenceCost:999},fish).offer;assert.equal(r.unitCost,10);assert.equal(filterOffers([r],{packCount:['60'],epaDhaMgMin:900,complete:true},fish.id,fish).length,1);assert.equal(filterOffers([r],{packCount:['120']},fish.id,fish).length,0);assert.equal(normalizeUnitInputs({...raw,price:900},fish).offer.referenceCost,30);});

test('glutathione costs use only its label amount, never total blend or precursor mass',()=>{
 const c={...fish,id:'glutathione',mainNutrient:'glutathioneMg',referenceQuantity:100,nutrientFields:[{key:'glutathioneMg',label:'Glutathione',unit:'mg'}]};
 const input={price:900,packCount:30,form:'Tablet',servingUnits:2,glutathioneMg:500,blendMg:1500};
 let r=normalizeUnitInputs(input,c).offer;assert.equal(r.packServings,15);assert.equal(r.servingCost,60);assert.equal(r.referenceCost,12);
 r=normalizeUnitInputs({...input,price:1200,referenceCost:999},c).offer;assert.equal(r.referenceCost,16);
 r=normalizeUnitInputs({...input,glutathioneMg:null},c).offer;assert.equal(r.referenceCost,null);assert.equal(r.servingCost,60);
 for(const glutathioneMg of [-1,'500',NaN])assert.ok(normalizeUnitInputs({...input,glutathioneMg},c).issues.some(i=>i.field==='glutathioneMg'&&i.severity==='error'));
});

test('melatonin strength, serving size and release formulation stay separate in cost filters',()=>{
 const c={...fish,id:'melatonin',mainNutrient:'melatoninMg',referenceQuantity:1,nutrientFields:[{key:'melatoninMg',label:'Melatonin',unit:'mg'}]};
 const input={price:300,packCount:60,form:'Tablet',servingUnits:2,melatoninMg:3,subclass:'Prolonged release'};
 const r=normalizeUnitInputs(input,c).offer;assert.equal(r.servingCost,10);assert.equal(r.referenceCost,10/3);assert.equal(r.subclass,'Prolonged release');
 assert.equal(filterOffers([r],{melatoninMgMax:2},c.id,c).length,0);assert.equal(filterOffers([r],{subclass:['Prolonged release'],melatoninMgMin:3},c.id,c).length,1);
 const unknown=normalizeUnitInputs({...input,servingUnits:null},c).offer;assert.equal(unknown.unitCost,5);assert.equal(unknown.referenceCost,null);
 for(const melatoninMg of [-1,'3',Infinity])assert.ok(normalizeUnitInputs({...input,melatoninMg},c).issues.some(i=>i.field==='melatoninMg'&&i.severity==='error'));
});
