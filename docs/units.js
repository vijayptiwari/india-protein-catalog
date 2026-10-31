// Count-based supplement inputs. Amounts always refer to the stated label serving.
const numeric=n=>typeof n==='number'&&Number.isFinite(n);
const positive=n=>numeric(n)&&n>0;
export const nutrientUnits={ashwagandhaMg:'mg',standardizedExtractMg:'mg',withanolidesPct:'%',withanolidesMg:'mg',fishOilMg:'mg',epaMg:'mg',dhaMg:'mg',epaDhaMg:'mg',vitaminDIu:'IU',vitaminDMcg:'µg',vitaminK2Mcg:'µg',magnesiumMg:'mg',calciumMg:'mg',zincMg:'mg',magnesiumCompoundMg:'mg',calciumCompoundMg:'mg',zincCompoundMg:'mg',glutathioneMg:'mg',melatoninMg:'mg',energyPerServing:'kcal'};
export function normalizeUnitInputs(raw,definition){
 const r={...raw,isUnitOffer:true,grams:null,kg:null,scoop:null,energy:null,proteinPerScoop:null,powderCost:null,score:0,rankingEligible:false},issues=[];
 const issue=(field,message,severity='error')=>issues.push({severity,field,message});
 r.price=positive(raw.price)?raw.price:null;if(r.price==null)issue('price','A positive INR pack price is required.');
 r.packCount=Number.isInteger(raw.packCount)&&raw.packCount>0?raw.packCount:null;if(r.packCount==null)issue('packCount','A verified positive whole-number pack count is required.');
 r.servingUnits=raw.servingUnits??null;
 if(r.servingUnits!=null&&(!Number.isInteger(r.servingUnits)||r.servingUnits<=0||r.servingUnits>r.packCount))issue('servingUnits','Label serving must contain a positive whole number of units within the pack.');
 if(!['Tablet','Capsule','Softgel','Gummy','Oral strip'].includes(raw.form))issue('form','Use a supported oral dosage form.');
 for(const key of Object.keys(nutrientUnits)){
  const value=raw[key];r[key]=value??null;
  if(value!=null&&(!numeric(value)||value<0||(key==='withanolidesPct'&&value>100))){r[key]=null;issue(key,'Use a non-negative numeric label amount, or null for unknown.');}
 }
 // Source: NIH ODS Vitamin D fact sheet. This is a unit conversion, not intake advice.
 if(r.vitaminDIu!=null&&r.vitaminDMcg!=null&&Math.abs(r.vitaminDIu-r.vitaminDMcg*40)>.01)issue('vitaminDIu','IU and microgram Vitamin D amounts disagree (1 µg = 40 IU).');
 if(r.vitaminDIu==null&&r.vitaminDMcg!=null)r.vitaminDIu=r.vitaminDMcg*40;
 if(r.vitaminDMcg==null&&r.vitaminDIu!=null)r.vitaminDMcg=r.vitaminDIu/40;
 const combined=r.epaMg!=null&&r.dhaMg!=null?r.epaMg+r.dhaMg:null;
 if(r.epaDhaMg!=null&&combined!=null&&Math.abs(r.epaDhaMg-combined)>.01)issue('epaDhaMg','The stated EPA+DHA total disagrees with the stated components.');
 if(r.epaDhaMg==null)r.epaDhaMg=combined;
 if(r.epaDhaMg!=null&&r.fishOilMg!=null&&r.epaDhaMg>r.fishOilMg+.01)issue('epaDhaMg','EPA+DHA cannot exceed the labelled fish oil mass on the same serving basis.');
 for(const key of ['magnesiumMg','calciumMg','zincMg'])if(r[key]!=null&&raw.mineralBasis!=='elemental')issue(key,'Elemental mineral amounts must be explicitly identified on the label. Do not substitute salt/compound mass.');
 r.withanolidesMg=positive(r.standardizedExtractMg)&&r.withanolidesPct!=null?r.standardizedExtractMg*r.withanolidesPct/100:null;
 r.packServings=r.servingUnits!=null?r.packCount/r.servingUnits:null;
 r.unitCost=r.price!=null&&r.packCount!=null?r.price/r.packCount:null;
 r.servingCost=r.price!=null&&positive(r.packServings)?r.price/r.packServings:null;
 r.activeUnitCost=r.price!=null&&positive(r.packServings)&&positive(r[definition.mainNutrient])?r.price/(r.packServings*r[definition.mainNutrient]):null;
 r.referenceQuantity=definition.referenceQuantity;r.referenceUnit=definition.referenceUnit;
 r.referenceCost=definition.mainNutrient==='multi'?r.servingCost:r.activeUnitCost==null?null:r.activeUnitCost*definition.referenceQuantity;
 r.cost=definition.mainNutrient==='multi'?r.servingCost:r.activeUnitCost;
 r.nutrientCosts=Object.fromEntries((definition.nutrientFields||[]).filter(f=>f.unit!=='%'&&f.unit!=='kcal').map(f=>[f.key,r.price!=null&&positive(r.packServings)&&positive(r[f.key])?r.price/(r.packServings*r[f.key]):null]));
 if(r.servingUnits==null)issue('servingUnits','Label serving size not verified; serving and active-content costs are unavailable.','warning');
 if(definition.mainNutrient!=='multi'&&r[definition.mainNutrient]==null)issue(definition.mainNutrient,'Labelled active quantity not verified; no active-content cost is inferred.','warning');
 if(definition.mainNutrient==='multi'&&['calciumMg','magnesiumMg','zincMg'].some(k=>r[k]==null))issue('mineralAmounts','One or more elemental amounts are unverified. Mineral masses are not combined into a single value score.','warning');
 if(definition.id==='zmc'&&!['calcium','magnesium','zinc'].every(k=>(raw.declaredActives||[]).includes(k)))issue('declaredActives','ZMC requires an explicit declaration of calcium, magnesium and zinc.');
 if(raw.notes&&/conflict|differs|unverified|not.*elemental|headline|ambiguous/i.test(raw.notes))issue('labelEvidence','Read the source notes for unresolved label or basis differences.','warning');
 return {offer:r,issues};
}
export function unitFacets(c){return [['brand','Brand'],['product','Product'],['type','Source / chemical form'],['subclass','Formulation / extract class'],['source','Ingredient origin'],['form','Dosage form'],['flavour','Flavour'],['packCount','Units per pack'],['stock','Availability']];}
export function unitMetrics(c){return [['price','Pack price (₹)'],['unitCost','Cost / single unit (₹)'],['servingCost','Cost / label serving (₹)'],...(c.mainNutrient==='multi'?[]:[['referenceCost',`Cost / ${c.referenceQuantity} ${c.referenceUnit} ${c.compoundLabel} (₹)`]]),...(c.nutrientFields||[]).map(f=>[f.key,`${f.label} (${f.unit} / label serving)`])];}
