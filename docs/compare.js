import {escapeHtml as esc,formatDate,https} from './model.js';
const key=pick=>JSON.stringify([pick.category,String(pick.id)]);
const lookup=(snapshot,pick)=>Object.hasOwn(snapshot.categories||{},pick.category)?snapshot.categories[pick.category]?.offers?.find(offer=>String(offer.id)===String(pick.id)):null;
const unitNames={Tablet:['tablet','tablets'],Capsule:['capsule','capsules'],Softgel:['softgel','softgels'],Gummy:['gummy','gummies'],'Oral strip':['oral strip','oral strips']};
const number=value=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('en-IN',{maximumFractionDigits:2}):'Unknown';
const quantity=(value,unit='')=>value==null?'Unknown':`${number(value)}${unit?' '+unit:''}`;
function pack(offer){if(offer.isUnitOffer||offer.packCount!=null)return offer.packCount==null?'Unknown':`${number(offer.packCount)} ${unitNames[offer.form]?.[offer.packCount===1?0:1]||'units'}`;return offer.kg!=null?`${number(offer.kg)} kg`:quantity(offer.grams,'g');}
function serving(offer){return offer.servingUnits==null?'Unknown':`${number(offer.servingUnits)} ${unitNames[offer.form]?.[offer.servingUnits===1?0:1]||'units'}`;}

/** Immutable, same-category selection reducer. Only public IDs are retained for the tab session. */
export function reduceComparison(snapshot,picks=[],action={type:'reconcile'}){
 const valid=[],seen=new Set();let firstCategory=null;
 for(const raw of picks){if(!raw||!lookup(snapshot,raw))continue;const pick={category:raw.category,id:String(raw.id)};if(firstCategory&&pick.category!==firstCategory||valid.length>=3||seen.has(key(pick)))continue;firstCategory??=pick.category;valid.push(pick);seen.add(key(pick));}
 const removed=picks.length-valid.length;
 if(action.type==='reconcile')return {picks:valid,accepted:true,message:removed?`${removed} comparison ${removed===1?'selection was':'selections were'} removed because it is no longer available in this dataset.`:''};
 if(action.type==='clear')return {picks:[],accepted:true,message:'Comparison cleared.'};
 if(action.type==='remove'){const wanted=key({category:action.category,id:String(action.id)}),next=valid.filter(pick=>key(pick)!==wanted);return {picks:next,accepted:next.length<valid.length,message:next.length<valid.length?'Offer removed from comparison.':'That offer is not selected.'};}
 if(action.type!=='add')return {picks:valid,accepted:false,message:'Choose an exact offer to compare.'};
 const pick={category:action.category,id:String(action.id)},offer=lookup(snapshot,pick);if(!offer)return {picks:valid,accepted:false,message:'This exact offer is not present in the current dataset.'};
 if(valid.some(item=>key(item)===key(pick)))return {picks:valid,accepted:false,message:'This exact offer is already in your comparison.'};
 if(valid.length&&valid[0].category!==pick.category)return {picks:valid,accepted:false,message:`Compare one category at a time. Clear your ${snapshot.categories[valid[0].category].label} selections before adding ${snapshot.categories[pick.category].label}.`};
 if(valid.length>=3)return {picks:valid,accepted:false,message:'You can compare up to 3 exact offers. Remove one before adding another.'};
 return {picks:[...valid,pick],accepted:true,message:`Added ${offer.brand} ${offer.product} (${pack(offer)}) to comparison.`};
}

/** Text-only rows keep model values and units explicit; there is no efficacy score. */
export function buildComparison(snapshot,picks){
 const selected=reduceComparison(snapshot,picks).picks,offers=selected.map(pick=>lookup(snapshot,pick)),category=offers.length?snapshot.categories[selected[0].category]:null;
 if(!category)return {category:null,offers:[],rows:[],note:''};
 const money=value=>value==null?'Unknown':new Intl.NumberFormat(snapshot.config.locale||'en-IN',{style:'currency',currency:snapshot.config.currency||'INR',maximumFractionDigits:2}).format(value);
 const row=(id,label,read)=>({id,label,values:offers.map(read)}),rows=[row('flavour','Flavour',r=>r.flavour||'Unknown'),row('type','Source / chemical form',r=>r.type||'Unknown'),row('subclass','Subclass / formulation',r=>r.subclass||'Unknown'),row('pack','Exact pack',pack),row('price','Catalog pack price',r=>money(r.price)),row('price-status','Price evidence',r=>r.priceAudit?.status||'unverified'),row('price-date','Price observed',r=>formatDate(r.priceAudit?.checked)),row('stock','Stock at observation',r=>r.stock||'Not verified'),row('research-date','Category research date',()=>formatDate(category.asOf))];
 if(category.measurement==='units'){
  rows.push(row('form','Dosage form',r=>r.form||'Unknown'),row('serving','Label serving',serving),row('servings','Label servings per pack',r=>quantity(r.packServings)),row('unit-cost','Cost per single unit',r=>money(r.unitCost)),row('serving-cost','Cost per label serving',r=>money(r.servingCost)));
  if(category.mainNutrient!=='multi')rows.push(row('reference-cost',`Cost per ${category.referenceQuantity} ${category.referenceUnit} ${category.compoundLabel}`,r=>money(r.referenceCost)));
  for(const field of category.nutrientFields||[])rows.push(row(field.key,`${field.label} (${field.unit==='%'?'% of standardized extract':field.unit+' per label serving'})`,r=>quantity(r[field.key],field.unit)));
  if(!(category.nutrientFields||[]).some(f=>f.key==='energyPerServing'))rows.push(row('energy','Energy per label serving',r=>quantity(r.energyPerServing,'kcal')));
  rows.push(row('label-date','Label last checked',r=>formatDate(r.labelChecked)));
 }else{
  rows.push(row('concentration',`Labelled ${category.compoundLabel} (%)`,r=>quantity(r[category.concentrationField],'%')),row('scoop','Manufacturer scoop',r=>quantity(r.scoop,'g')),row('serving','Label serving mass',r=>quantity(r.serving,'g')),row('energy','Energy per 100 g',r=>quantity(r.energy,'kcal')),row('compound-cost',`Cost per g ${category.compoundLabel}`,r=>money(r.cost)),row('reference-cost',`Cost per ${category.referenceGrams} g ${category.compoundLabel}`,r=>money(r.referenceCost)));
  if(category.id==='protein')rows.push(row('protein-scoop','Protein per manufacturer scoop',r=>quantity(r.proteinPerScoop,'g')));
  if(category.id==='creatine')rows.push(row('grade','Ingredient trademark',r=>r.grade||'Unknown'),row('formulation','Formulation',r=>r.formulation||'Unknown'));
 }
 return {category,offers,rows,note:category.measurement==='units'?`Nutrient amounts refer to each product’s stated label serving. Serving sizes and chemical forms can differ; a lower quantity cost does not establish better absorption or health benefit. ${category.comparisonNote||''}`.trim():'Costs use labelled compound amounts. Manufacturer scoops are not the comparison portions; different sources or chemical forms are not assumed equivalent. No intake schedule is prescribed.'};
}

let currentSnapshot=null,picks=[],feedback='',bound=false,restored=false;
const selectionKey='sr-comparison-v1';
const sourceLink=(url,label)=>https(url)?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:'<span class="compare-unknown">Not recorded</span>';
function render(){
 try{if(picks.length)sessionStorage.setItem(selectionKey,JSON.stringify(picks));else sessionStorage.removeItem(selectionKey);}catch{}
 const root=document.querySelector('#compare-root'),tray=root.querySelector('#compare-tray'),dialog=root.querySelector('#compare-dialog'),built=buildComparison(currentSnapshot,picks),label=built.category?.label||'';
 tray.hidden=!(picks.length||feedback);document.body.classList.toggle('has-comparison',!tray.hidden);
 root.querySelector('#compare-feedback').textContent=feedback;
 root.querySelector('#compare-dismiss').hidden=!feedback;
 root.querySelector('#compare-count').textContent=picks.length?`${picks.length} of 3 selected · ${label}`:'Compare exact offers';
 root.querySelector('#compare-picks').innerHTML=built.offers.map((offer,index)=>`<div class="compare-pick"><span><strong>${esc(offer.brand)}</strong> ${esc(offer.product)}<small>${esc(offer.flavour)} · ${esc(pack(offer))}</small></span><button type="button" data-compare-action="remove" data-category="${esc(picks[index].category)}" data-id="${esc(offer.id)}" aria-label="Remove ${esc(offer.brand+' '+offer.product+' '+offer.flavour+' '+pack(offer))} from comparison">×</button></div>`).join('');
 root.querySelector('#compare-open').disabled=picks.length<2;root.querySelector('#compare-clear').hidden=!picks.length;
 root.querySelector('#compare-title').textContent=label?`Compare ${label} exact offers`:'Compare exact offers';
 root.querySelector('#compare-body').innerHTML=built.offers.length?`<p class="compare-explainer">${esc(built.note)}</p><div class="compare-table-wrap" tabindex="0" aria-label="Scrollable exact offer comparison"><table class="compare-table"><thead><tr><th scope="col">Label / price detail</th>${built.offers.map((offer,index)=>`<th scope="col"><span class="compare-brand">${esc(offer.brand)}</span><strong>${esc(offer.product)}</strong><small>${esc(offer.flavour)} · ${esc(pack(offer))}</small><button type="button" data-compare-action="remove" data-category="${esc(picks[index].category)}" data-id="${esc(offer.id)}">Remove offer</button></th>`).join('')}</tr></thead><tbody>${built.rows.map(row=>`<tr><th scope="row">${esc(row.label)}</th>${row.values.map(value=>`<td>${esc(value)}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">Original evidence</th>${built.offers.map(offer=>`<td class="compare-source-links">${sourceLink(offer.url,'Official listing')}${sourceLink(offer.nutritionUrl,'Label source')}${sourceLink(offer.priceAudit?.sourceUrl,'Price evidence')}</td>`).join('')}</tr></tbody></table></div><p class="compare-research"><a href="research.html?category=${esc(built.category.id)}">Read the ${esc(label)} evidence guide →</a> · <a href="${esc(built.category.page)}">Browse all ${esc(label)} packs</a></p>`:'<p>No offers remain selected. Close this panel to choose exact packs from the catalog.</p>';
 // Comparison buttons expose selection state without changing their authored labels.
 document.querySelectorAll('[data-add-compare]').forEach(button=>button.setAttribute('aria-pressed',String(picks.some(pick=>pick.category===button.dataset.category&&String(pick.id)===String(button.dataset.id)))));
 if(dialog.open&&built.offers.length===0)dialog.close();
}
function apply(action){const next=reduceComparison(currentSnapshot,picks,action);picks=next.picks;feedback=next.message;render();}
/** Mount once, then reconcile against every validated dataset revision. */
export function updateComparison(snapshot){
 currentSnapshot=snapshot;
 if(!restored){restored=true;try{const stored=JSON.parse(sessionStorage.getItem(selectionKey)||'[]');if(Array.isArray(stored))picks=stored.slice(0,3);}catch{}}
 let root=document.querySelector('#compare-root');
 if(!root){root=document.createElement('div');root.id='compare-root';root.innerHTML=`<aside class="compare-tray" id="compare-tray" aria-label="Exact offer comparison" hidden><div class="compare-tray-top"><strong id="compare-count"></strong><div class="compare-tray-actions"><button type="button" id="compare-open" data-compare-action="open">Compare selected</button><button type="button" id="compare-clear" data-compare-action="clear">Clear</button></div></div><div id="compare-picks" class="compare-picks"></div><div class="compare-feedback-row"><p id="compare-feedback" class="compare-feedback" role="status" aria-live="polite"></p><button type="button" id="compare-dismiss" data-compare-action="dismiss" aria-label="Dismiss comparison notice">Dismiss</button></div></aside><dialog id="compare-dialog" class="compare-dialog" aria-labelledby="compare-title"><div class="compare-dialog-header"><h2 id="compare-title">Compare exact offers</h2><button type="button" data-compare-action="close" aria-label="Close comparison">Close ×</button></div><div id="compare-body"></div></dialog>`;document.body.append(root);root.querySelector('#compare-dialog').addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.close();});}
 const reconciled=reduceComparison(snapshot,picks);picks=reconciled.picks;if(reconciled.message)feedback=reconciled.message;
 if(!bound){
  document.addEventListener('click',event=>{
   const add=event.target.closest('[data-add-compare]');if(add){event.preventDefault();apply({type:'add',category:add.dataset.category,id:add.dataset.id});return;}
   const control=event.target.closest('[data-compare-action]');if(!control)return;
   const action=control.dataset.compareAction,dialog=document.querySelector('#compare-dialog');
   if(action==='open'){if(picks.length>=2)dialog.showModal();return;}
   if(action==='close'){dialog.close();return;}
   if(action==='dismiss'){feedback='';render();return;}
   apply({type:action,category:control.dataset.category,id:control.dataset.id});
  });bound=true;
 }
 render();
}
