import {escapeHtml as esc,formatDate} from './model.js';
export function recommend(snapshot,input){
 const policy=snapshot.recommender,goals=new Set(input.goals||[]),existing=new Set(input.existing||[]),restricted=input.context!=='adult-clear',budget=input.budget===''||input.budget==null?null:Number(input.budget);
 const items=policy.rules.filter(rule=>rule.goals.some(g=>goals.has(g))).map(rule=>{
  const held=existing.has(rule.category),gapMissing=rule.gate==='proteinGap'&&input.proteinGap!=='yes',review=restricted||rule.review;
  let reason=rule.reason;if(held)reason='You already take this category. Review your current product before adding another. '+reason;if(gapMissing)reason='No confirmed protein gap was entered. Food may already meet your needs; no powder is added automatically. '+reason;
  const eligible=!held&&!gapMissing&&!review;
  const offers=eligible?snapshot.categories[rule.category].offers.filter(r=>{
   if(r.priceAudit.status!=='verified'||r.stock!=='In stock'||r.quality.errors>0)return false;
   if(budget!=null&&(!Number.isFinite(budget)||budget<0||r.price>budget))return false;
   if(rule.category==='protein')return r.cost!=null&&input.milkAllergy!=='yes'&&(input.diet!=='vegan'||/^plant/i.test(r.type));
   if(rule.category==='creatine')return r.type==='Monohydrate'&&r.creatine===100&&/unflavou?red/i.test(r.flavour);
   if(rule.category==='fish-oil')return input.diet==='any'&&input.fishAllergy!=='yes'&&r.epaDhaMg>0&&r.servingUnits>0;
   return false;
  }).sort((a,b)=>a.price-b.price||a.brand.localeCompare(b.brand)):[];
  return {...rule,reason,held,gapMissing,review,eligible,offers};
 });
 const warnings=[];
 if(restricted)warnings.push('Personalized product suggestions are paused. If you are under 18, pregnant or breastfeeding, take medicines, have a health condition, or are unsure, review supplements with a qualified clinician. You can still read the educational category notes.');
 if(existing.has('zmc')&&(existing.has('magnesium')||existing.has('vitamin-d')))warnings.push('Your existing ZMC may overlap with separate magnesium or vitamin D. Check the exact labels before combining.');
 if(items.some(i=>i.category==='zmc')&&items.some(i=>['magnesium','vitamin-d'].includes(i.category)))warnings.push('Bone-health categories are alternatives to review, not instructions to take all three together. ZMC can already contain magnesium and vitamin D.');
 return {items,warnings,budget,restricted};
}

const flows=new WeakMap();
export function filterStackOffers(offers,query=''){const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);return offers.filter(r=>{const text=[r.brand,r.product,r.flavour,r.type,r.subclass,r.packCount,r.grams].join(' ').toLowerCase();return terms.every(term=>text.includes(term));});}
export function validateStackAnswers(input,step=2){
 const errors=[];
 if(!input.goals?.length)errors.push({field:'goals',message:'Choose at least one goal to continue.'});
 if(step<2)return errors;
 if(!['adult-clear','review'].includes(input.context))errors.push({field:'stack-context',message:'Choose a health context. If you are unsure, select the option for professional review.'});
 if(!['no','yes'].includes(input.milkAllergy))errors.push({field:'stack-milk',message:'Tell us whether milk allergy or uncertain traces apply.'});
 if(!['no','yes'].includes(input.fishAllergy))errors.push({field:'stack-fish',message:'Tell us whether fish allergy or uncertainty applies.'});
 if(input.budget!==''&&input.budget!=null&&(!Number.isFinite(Number(input.budget))||Number(input.budget)<0))errors.push({field:'stack-budget',message:'Enter a budget of zero or more, or leave it blank.'});
 return errors;
}
export function renderRecommender(snapshot){
 const root=document.querySelector('#stack-builder');if(!root)return;
 let flow=flows.get(root);
 if(!flow){flow={snapshot,step:1,highest:1,hasResults:false,picks:{},searches:{},policyKey:''};flows.set(root,flow);}
 flow.snapshot=snapshot;
 const goalRows=policy=>policy.goals.map(g=>`<label class="stack-flow-goal"><input type="checkbox" name="goal" value="${esc(g.id)}"><span>${esc(g.label)}</span></label>`).join('');
 const existingRows=categories=>categories.map(c=>`<label class="check"><input type="checkbox" name="existing" value="${esc(c.id)}"> ${esc(c.label)}</label>`).join('');
 if(!root.dataset.ready){
  root.classList.add('stack-flow');
  root.innerHTML=`<nav class="stack-flow-progress" aria-label="Stack builder progress">${[['Goals','Choose your direction'],['Requirements','Make it relevant'],['Your review','Learn, then compare']].map(([title,detail],i)=>`<button type="button" class="stack-flow-step" data-stack-step="${i+1}"><span class="stack-flow-step-number">${i+1}</span><span><strong>${title}</strong><small>${detail}</small></span></button>`).join('')}</nav><form id="stack-form" autocomplete="off" novalidate><section class="stack-flow-panel" data-stack-panel="1"><div class="stack-flow-panel-heading"><span class="section-kicker">STEP 1 OF 3</span><h2>What would you like to support?</h2><p>Choose a starting point or select your own goals. A stack can contain no supplements at all.</p></div><label for="stack-preset">Start with a stack</label><select id="stack-preset"></select><fieldset class="stack-flow-goals"><legend>Your goals — choose all that apply</legend><div id="stack-goal-options"></div></fieldset><p class="stack-flow-privacy">Your answers stay in this page’s memory. They are not saved in a profile or added to the URL.</p></section><section class="stack-flow-panel" data-stack-panel="2" hidden><div class="stack-flow-panel-heading"><span class="section-kicker">STEP 2 OF 3</span><h2>Make the review fit your requirements</h2><p>These answers help filter products and identify when professional advice is needed. They do not diagnose a deficiency.</p></div><div class="stack-flow-fieldgrid"><label for="stack-context">Health context<select id="stack-context" required><option value="">Choose an option</option><option value="adult-clear">18+, not pregnant/breastfeeding, no medicines or relevant health conditions</option><option value="review">Under 18, pregnant/breastfeeding, medicines, a condition, or unsure</option></select></label><label for="stack-diet">Diet preference<select id="stack-diet"><option value="any">No ingredient preference</option><option value="vegetarian">Vegetarian ingredients</option><option value="vegan">Plant-based protein ingredients</option></select><small>Ingredient classes are not independent vegan or allergen certification.</small></label><label for="stack-gap">Known dietary protein gap?<select id="stack-gap"><option value="unknown">Not assessed / unsure</option><option value="yes">Yes, I have identified a gap</option><option value="no">No, food meets my needs</option></select></label><label for="stack-budget">Total upfront pack budget (₹, optional)<input id="stack-budget" type="number" min="0" step="0.01" inputmode="decimal" placeholder="e.g. 2500"><small>One purchase of selected packs, not a monthly budget.</small></label><label for="stack-milk">Milk allergy or uncertain traces?<select id="stack-milk" required><option value="">Choose an option</option><option value="no">No</option><option value="yes">Yes / unsure about traces</option></select></label><label for="stack-fish">Fish allergy?<select id="stack-fish" required><option value="">Choose an option</option><option value="no">No</option><option value="yes">Yes / unsure</option></select></label></div><p id="stack-context-note" class="stack-flow-notice" hidden>We will pause product suggestions and show educational notes for professional review. You can still continue.</p><details class="stack-flow-existing"><summary>Supplements you already take <span>Check for overlap</span></summary><fieldset><legend>Avoid duplicate suggestions</legend><div id="stack-existing-options"></div></fieldset></details></section><p id="stack-flow-error" class="stack-flow-error" role="alert" tabindex="-1" hidden></p><div class="stack-flow-actions"><button class="btn-sm" type="button" id="stack-back" hidden>← Back to goals</button><button class="btn-sm stack-flow-primary" type="submit" id="stack-continue">Continue to requirements →</button><button class="btn-sm" id="stack-reset" type="reset">Start over</button></div></form><div id="stack-results" class="stack-flow-results" aria-live="polite" hidden></div>`;
  root.dataset.ready='true';
 }
 const form=document.querySelector('#stack-form'),out=document.querySelector('#stack-results'),error=document.querySelector('#stack-flow-error');
 const policyKey=JSON.stringify([snapshot.recommender.goals,snapshot.recommender.presets,snapshot.config.categories.map(c=>[c.id,c.label])]);
 if(flow.policyKey!==policyKey){
  const goals=new Set([...form.querySelectorAll('[name=goal]:checked')].map(e=>e.value)),existing=new Set([...form.querySelectorAll('[name=existing]:checked')].map(e=>e.value)),preset=document.querySelector('#stack-preset').value;
  document.querySelector('#stack-preset').innerHTML=`<option value="">Build my own</option>${snapshot.recommender.presets.map(p=>`<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('')}`;
  document.querySelector('#stack-preset').value=preset;
  document.querySelector('#stack-goal-options').innerHTML=goalRows(snapshot.recommender);form.querySelectorAll('[name=goal]').forEach(e=>e.checked=goals.has(e.value));
  document.querySelector('#stack-existing-options').innerHTML=existingRows(snapshot.config.categories);form.querySelectorAll('[name=existing]').forEach(e=>e.checked=existing.has(e.value));
  flow.policyKey=policyKey;
 }
 const input=()=>({goals:[...form.querySelectorAll('[name=goal]:checked')].map(e=>e.value),existing:[...form.querySelectorAll('[name=existing]:checked')].map(e=>e.value),context:document.querySelector('#stack-context').value,diet:document.querySelector('#stack-diet').value,proteinGap:document.querySelector('#stack-gap').value,budget:document.querySelector('#stack-budget').value,milkAllergy:document.querySelector('#stack-milk').value,fishAllergy:document.querySelector('#stack-fish').value});
 const progress=()=>{
  form.hidden=flow.step===3;out.hidden=flow.step!==3;
  root.querySelectorAll('[data-stack-panel]').forEach(panel=>panel.hidden=Number(panel.dataset.stackPanel)!==flow.step);
  root.querySelectorAll('[data-stack-step]').forEach(b=>{const n=Number(b.dataset.stackStep);b.disabled=n>flow.highest||(n===3&&!flow.hasResults);b.classList.toggle('is-current',n===flow.step);b.classList.toggle('is-complete',n<flow.step);if(n===flow.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  document.querySelector('#stack-back').hidden=flow.step!==2;document.querySelector('#stack-continue').textContent=flow.step===1?'Continue to requirements →':'Review my stack →';
 };
 const clearError=()=>{error.hidden=true;error.textContent='';};
 const showStep=(step,scroll=true)=>{flow.step=step;clearError();progress();const heading=(step===3?out:root.querySelector('[data-stack-panel="'+step+'"]')).querySelector('h2');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}if(scroll)root.scrollIntoView({behavior:'smooth',block:'start'});};
 const validate=step=>{
  const errors=validateStackAnswers(input(),step);
  if(errors.length){error.textContent=errors.map(e=>e.message).join(' ');error.hidden=false;const field=document.getElementById(errors[0].field);if(field)field.focus();else error.focus();return false;}
  if(step===2){const invalid=[...form.querySelectorAll('[data-stack-panel="2"] input,[data-stack-panel="2"] select')].find(e=>!e.checkValidity());if(invalid){invalid.reportValidity();return false;}}
  clearError();return true;
 };
 const calculate=()=>{
  const s=flow.snapshot,policy=s.recommender,result=recommend(s,input()),money=n=>new Intl.NumberFormat(s.config.locale||'en-IN',{style:'currency',currency:s.config.currency||'INR'}).format(n),refs=new Map(s.research.sources.map(ref=>[ref.id,ref]));
  const removed=[];
  for(const [category,id] of Object.entries(flow.picks)){if(!result.items.some(i=>i.category===category&&i.offers.some(r=>r.id===id))){removed.push(s.categories[category]?.label||category);delete flow.picks[category];}}
  out.innerHTML=`<div class="stack-flow-review-head"><div><span class="section-kicker">STEP 3 OF 3</span><h2>Your evidence-led stack review</h2><p>These are options to assess, not a dosing plan. Food, training and sleep remain the foundation. No supplement needed is a valid result.</p></div><button type="button" class="btn-sm" data-stack-edit>Edit requirements</button></div><section class="stack-flow-summary" aria-label="Selected pack summary"><div><span class="section-kicker">SELECTED PACKS</span><strong id="stack-total-amount">${money(0)}</strong><p id="stack-total">No packs selected.</p></div><p>Upfront purchase cost. Shipping and checkout changes are not included. This is not a monthly cost or an intake schedule.</p></section>${result.warnings.map(w=>`<p class="stack-flow-notice">${esc(w)}</p>`).join('')}${removed.length?`<p class="stack-flow-notice">A previous selection was removed because it no longer matches the current requirements or dataset: ${esc(removed.join(', '))}.</p>`:''}<div class="stack-flow-itemgrid">${result.items.map(i=>{const c=s.categories[i.category],status=i.held?'Already in your stack':i.gapMissing?'No automatic addition':i.status;return `<article class="stack-flow-item"><div class="stack-flow-item-head"><span class="stack-flow-status">${esc(status)}</span><h3>${esc(c.label)}</h3></div><p>${esc(i.reason)}</p>${i.eligible?`<div class="stack-flow-pick"><label for="pick-search-${esc(i.category)}">Find a matching pack</label><input type="search" id="pick-search-${esc(i.category)}" data-stack-filter="${esc(i.category)}" placeholder="Brand, product or flavour" value="${esc(flow.searches[i.category]||'')}"><p class="stack-flow-match-count" id="pick-count-${esc(i.category)}"></p><label for="pick-${esc(i.category)}">Optional exact pack</label><select class="stack-pick" id="pick-${esc(i.category)}" data-stack-category="${esc(i.category)}"><option value="">Do not add a pack</option>${i.offers.map(r=>`<option value="${esc(r.id)}">${esc(r.brand+' · '+r.product+' · '+(r.isUnitOffer?r.packCount+' '+r.form:r.grams+' g')+' · '+r.flavour)} · ${money(r.price)}</option>`).join('')}</select>${!i.offers.length?'<p class="stack-flow-empty">No verified in-stock packs match these requirements. Try a different budget or review the catalog; no substitute has been inferred.</p>':''}<div id="pick-info-${esc(i.category)}" class="stack-flow-pick-info"></div></div>`:'<p class="stack-flow-no-pick">No product suggestion for this category. Review the evidence and your individual need first.</p>'}<div class="stack-flow-item-links"><a href="research.html?category=${esc(i.category)}">Read the evidence guide →</a><a href="${esc(c.page)}">Compare products →</a></div><details class="stack-flow-sources"><summary>Why this appears · sources</summary><ul>${i.sources.map(id=>{const ref=refs.get(id);return `<li><a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.title)} ↗</a></li>`;}).join('')}</ul></details></article>`;}).join('')}</div><p class="stack-flow-method">Policy reviewed ${formatDate(policy.reviewed)}. Matching offers are ordered by upfront pack price, not efficacy. Prices use dated catalog observations. Diet matches use declared ingredient classes, not independent vegan or allergen certification.</p><div class="stack-flow-actions"><button type="button" class="btn-sm" data-stack-edit>← Edit requirements</button><button type="button" class="btn-sm" data-stack-restart>Start over</button></div>`;
  const totals=()=>{
   let total=0,count=0;
   for(const i of result.items){const select=document.querySelector('#pick-'+i.category);if(!select)continue;const r=i.offers.find(r=>r.id===select.value),info=document.querySelector('#pick-info-'+i.category);if(!r){delete flow.picks[i.category];info.innerHTML='';continue;}flow.picks[i.category]=r.id;total+=r.price;count++;
    const label=r.isUnitOffer?`Label serving: ${r.servingUnits} ${esc(r.form.toLowerCase())} units; EPA+DHA ${r.epaDhaMg} mg.`:`Labelled concentration: ${r[s.categories[i.category].concentrationField]}%.`;
    info.innerHTML=`<p>${esc(r.flavour)} · ${label}</p><small>Price observed ${formatDate(r.priceAudit.checked)}</small><button class="btn-sm" type="button" data-category="${esc(i.category)}" data-offer="${esc(r.id)}">Review exact offer &amp; sources</button>`;
   }
   document.querySelector('#stack-total-amount').textContent=money(total);
   const over=result.budget!=null&&total>result.budget;
   document.querySelector('.stack-flow-summary').classList.toggle('is-over-budget',over);
   document.querySelector('#stack-total').textContent=count?`${count} selected ${count===1?'pack':'packs'}${result.budget!=null?(over?' · Over your total budget by '+money(total-result.budget):' · Within your total budget'):''}`:'No packs selected. Adding a product is optional.';
  };
  const filterPacks=category=>{const item=result.items.find(i=>i.category===category),select=document.querySelector('#pick-'+category),search=document.querySelector('#pick-search-'+category);if(!item||!select||!search)return;flow.searches[category]=search.value;const matches=filterStackOffers(item.offers,search.value),chosen=select.value||flow.picks[category]||'',selected=item.offers.find(r=>r.id===chosen),visible=selected&&!matches.some(r=>r.id===chosen)?[selected,...matches]:matches;select.innerHTML='<option value="">Do not add a pack</option>'+visible.map(r=>`<option value="${esc(r.id)}">${esc(r.brand+' · '+r.product+' · '+(r.isUnitOffer?r.packCount+' '+r.form:r.grams+' g')+' · '+r.flavour)} · ${money(r.price)}</option>`).join('');if(visible.some(r=>r.id===chosen))select.value=chosen;document.querySelector('#pick-count-'+category).textContent=`${matches.length} of ${item.offers.length} matching packs${selected&&!matches.some(r=>r.id===chosen)?' · your selected pack remains available':''}`;};
  out.querySelectorAll('.stack-pick').forEach(e=>{const value=flow.picks[e.dataset.stackCategory];if([...e.options].some(o=>o.value===value))e.value=value;filterPacks(e.dataset.stackCategory);});out.oninput=e=>{if(e.target.matches('[data-stack-filter]'))filterPacks(e.target.dataset.stackFilter);};out.onchange=e=>{totals();if(e.target.matches('.stack-pick'))filterPacks(e.target.dataset.stackCategory);};totals();flow.hasResults=true;flow.highest=3;
 };
 const restart=()=>{form.reset();flow.picks={};flow.searches={};flow.hasResults=false;flow.highest=1;out.innerHTML='';document.querySelector('#stack-context-note').hidden=true;showStep(1);};
 form.onsubmit=e=>{e.preventDefault();if(!validate(flow.step))return;if(flow.step===1){flow.highest=Math.max(flow.highest,2);showStep(2);}else{calculate();showStep(3);}};
 form.onreset=e=>{e.preventDefault();form.querySelectorAll('input[type=checkbox]').forEach(e=>e.checked=false);form.querySelectorAll('select').forEach(e=>e.selectedIndex=0);document.querySelector('#stack-budget').value='';flow.picks={};flow.searches={};flow.hasResults=false;flow.highest=1;out.innerHTML='';document.querySelector('#stack-context-note').hidden=true;showStep(1);};
 form.onchange=e=>{
  if(e.target.id==='stack-preset'){const preset=flow.snapshot.recommender.presets.find(p=>p.id===e.target.value);form.querySelectorAll('[name=goal]').forEach(box=>box.checked=!!preset?.goals.includes(box.value));}
  else if(e.target.name==='goal')document.querySelector('#stack-preset').value='';
  document.querySelector('#stack-context-note').hidden=document.querySelector('#stack-context').value!=='review';
  flow.hasResults=false;flow.highest=Math.min(flow.highest,2);progress();clearError();
 };
 form.oninput=e=>{if(e.target.id==='stack-budget'){flow.hasResults=false;flow.highest=Math.min(flow.highest,2);progress();clearError();}};
 root.onclick=e=>{const step=e.target.closest('[data-stack-step]');if(step&&!step.disabled)showStep(Number(step.dataset.stackStep));if(e.target.closest('#stack-back'))showStep(1);if(e.target.closest('[data-stack-edit]'))showStep(2);if(e.target.closest('[data-stack-restart]'))restart();};
 if(flow.step===3&&flow.hasResults)calculate();progress();
}
