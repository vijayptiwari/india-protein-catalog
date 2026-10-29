import {facetMarkup,isFacetChecked} from './facets.js';
import {updateComparison} from './compare.js';
import {renderMarketHome,marketGroup,categoryHero,categoryPrimer,categoryIcon} from './marketplace.js';
import {renderSearch} from './search.js';
import {renderRecommender} from './recommender.js';
import {renderResearch} from './research.js';
import {unitPack,unitFacets,unitMetrics,unitTable,unitGroups,unitHome,unitFormula,unitDetails} from './unit-catalog.js';
import {watchData,dataStore} from './data-store.js';
import {escapeHtml as esc,formatDate,rankedOffers,quickPick,stats,pageMetadata} from './model.js';
import {facets,metrics,creatineFacets,creatineMetrics,filterOffers,sortOffers,groupOffersByProduct,formatTrendBadge,priceAuditFlag} from './core.js';
const $=s=>document.querySelector(s),categoryId=document.body.dataset.category,pageType=document.body.dataset.page;
let snapshot,category,filtered=[],page=1,view='grouped',selected=null;
const rankingFilters={};
const num=(n,d=1)=>n==null?'Unknown':Number(n).toLocaleString(snapshot?.config.locale||'en-IN',{maximumFractionDigits:d});
const money=n=>n==null?'<span class="unknown">Unknown</span>':new Intl.NumberFormat(snapshot?.config.locale||'en-IN',{style:'currency',currency:snapshot?.config.currency||'INR',maximumFractionDigits:2}).format(n);
const size=r=>r.isUnitOffer?unitPack(r):categoryOf(r).id==='creatine'?`${num(r.grams)} g`:`${num(r.kg)} kg`;
const categoryOf=r=>snapshot.categories[r.category];
const button=r=>`<button type="button" class="btn-sm" data-category="${esc(r.category)}" data-offer="${esc(r.id)}">Pack details</button><button class="compare-add" type="button" data-add-compare data-category="${esc(r.category)}" data-id="${esc(r.id)}">Compare</button>`;
function link(url,label){try{const u=new URL(url);if(u.protocol==='https:')return `<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;}catch{}return 'Not recorded';}
function renderStats(s){$('#stats').innerHTML=[[s.offers,'exact pack offers'],[s.brands,'brands'],[s.products,'products'],[s.verifiedPrices,'prices with dated evidence']].map(([n,label])=>`<div><strong>${num(n,0)}</strong><span>${label}</span></div>`).join('');}
function historyBadge(){return '';}
function historyCoverage(categories){
 const periods=[...new Map(categories.flatMap(c=>c.historyWindow).map(q=>[q.start,q])).values()].sort((a,b)=>a.start.localeCompare(b.start));
 const s=stats(categories.flatMap(c=>c.offers));
 return `<section class="method-card history-coverage"><h2>${snapshot.config.historyQuarters}-quarter price history audit</h2><p>${num(s.historicalVerified,0)} of ${num(s.historicalSlots,0)} exact offer-quarter slots have verified dated prices. ${num(s.fullHistoryOffers,0)} offers have evidence in every requested completed quarter. Current observations are shown separately in product Details.</p><div class="table-wrap"><table><thead><tr><th>Completed quarter</th>${categories.map(c=>`<th>${esc(c.label)} verified offers</th>`).join('')}</tr></thead><tbody>${periods.map(q=>`<tr><th>${esc(q.label)}<div class="muted">${q.start} – ${q.end}</div></th>${categories.map(c=>{if(!c.historyWindow.some(p=>p.start===q.start))return '<td>Outside this category’s window</td>';const count=c.offers.filter(r=>r.trend.history.some(h=>!h.isCurrent&&h.start===q.start&&h.verified)).length;return `<td><strong>${num(count,0)} / ${num(c.offers.length,0)}</strong><meter min="0" max="${c.offers.length}" value="${count}" aria-label="${esc(c.label+' '+q.label+' verified offers')}"></meter></td>`;}).join('')}</tr>`).join('')}</tbody></table></div><p>Each value is a dated exact-variant snapshot within its quarter. Missing quarters remain unknown; no prices are carried forward and no launch dates are inferred. Quarter-on-quarter changes require evidence in both adjacent quarters.</p></section>`;
}
function historyChart(history){
 const known=history.filter(h=>h.verified),width=1000,height=200,pad=55,span=history.length-1;
 if(!known.length)return '<p>No verified price snapshots are available for this variant.</p>';
 const min=Math.min(...known.map(h=>h.price)),max=Math.max(...known.map(h=>h.price)),range=max-min||1;
 const x=i=>pad+i/span*(width-pad*2);
 const y=p=>max===min?85:45+(max-p)/range*75;
 const color=h=>h.qoqDirection==='up'?'#dc2626':h.qoqDirection==='down'?'#059669':h.qoqDirection==='stable'?'#2563eb':'#64748b';
 return `<div class="history-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Verified dated price snapshots. Missing quarters have gaps and are not interpolated.">${history.map((h,i)=>`${i>0&&h.verified&&history[i-1].verified?`<line x1="${x(i-1)}" y1="${y(history[i-1].price)}" x2="${x(i)}" y2="${y(h.price)}" stroke="${color(h)}" stroke-width="2.5" stroke-linecap="round"/>`:''}${h.verified?`<circle cx="${x(i)}" cy="${y(h.price)}" r="5.5" fill="${color(h)}" stroke="var(--bg-card)" stroke-width="2"><title>${esc(h.quarter+' · '+(h.date?formatDate(h.date):'')+' · ')}${money(h.price)}</title></circle><text x="${x(i)}" y="${y(h.price)-12}" text-anchor="middle" class="chart-price-label">${money(h.price)}</text>`:`<text x="${x(i)}" y="89" text-anchor="middle" class="chart-missing-label">?</text>`}<text x="${x(i)}" y="162" text-anchor="middle" class="chart-quarter-label">${esc(h.isCurrent?'Current':h.quarter.slice(0,2))}</text><text x="${x(i)}" y="179" text-anchor="middle" class="chart-quarter-label">${esc(h.isCurrent?'observed':h.quarter.slice(3))}</text>`).join('')}</svg></div>`;
}
function renderHistory(r,c){
 const t=r.trend;
 return `<section class="offer-history"><h3>${t.historyWindowQuarters} completed quarters · ${esc(c.historyWindow[0].label)}–${esc(c.previousQuarter.label)}</h3><p>Current price observed ${formatDate(r.priceAudit.checked)}. ${t.endpointChangePct!=null?`Change from ${esc(t.endpointQuarter)} snapshot to current: <strong>${t.endpointChangePct>0?'+':''}${num(t.endpointChangePct,2)}%</strong>. This endpoint comparison does not imply complete intervening history.`:'No verified current-to-oldest-quarter endpoint comparison is available.'}</p>${historyChart(t.history)}</section>`;
}
function coverage(categories){
 const offers=categories.flatMap(c=>c.offers),s=stats(offers),unknown=s.offers-s.verifiedTrends,powders=offers.filter(r=>!r.isUnitOffer),units=offers.filter(r=>r.isUnitOffer);
 $('#coverage').innerHTML=`<section class="price-audit-note"><h2>Evidence &amp; data coverage</h2><p>${categories.map(c=>`<strong>${esc(c.label)}</strong>: ${esc(c.historyWindow[0].label)}–${esc(c.previousQuarter.label)} snapshots → dataset as of ${formatDate(c.asOf)}`).join(' · ')}. Changes compare dated observations, not quarterly averages.</p><div class="coverage-grid">${[[s.verifiedPrices,s.offers,'Prices with matching evidence'],[s.verifiedTrends,s.offers,'Latest-quarter changes verified'],[s.knownCost,s.offers,'Primary comparison inputs known'],[powders.filter(r=>r.energy!=null).length,powders.length,'Powder energy values recorded'],[powders.filter(r=>r.scoop!=null).length,powders.length,'Powder scoop sizes recorded'],...(units.length?[[units.filter(r=>r.servingUnits!=null).length,units.length,'Unit-product label servings known']]:[])].map(([n,total,label])=>`<div class="coverage-card"><div class="coverage-card-head"><span class="coverage-label">${label}</span><strong class="coverage-value">${num(n,0)} <span class="coverage-total">/ ${num(total,0)}</span></strong></div><div class="coverage-progress"><div class="coverage-progress-fill" style="width:${Math.round((n/total)*100)}%"></div></div><meter min="0" max="${total}" value="${n}" aria-label="${label}"></meter></div>`).join('')}</div><p>${num(unknown,0)} offers have no verified latest-quarter comparison. ${num(s.offers-s.verifiedPrices,0)} prices remain unverified or stale. Price evidence is considered recent within ${num(snapshot.config.maxPriceAgeDays,0)} days of each category’s research date; open Details for the actual observation date. Nutrition coverage means a value is recorded, not independently lab-tested.</p><div class="trend-legend"><span class="down">▼ Decreased</span><span class="up">▲ Increased</span><span class="unchanged">─ Unchanged</span><span class="missing">? No verified history</span></div><p class="hint">${num(offers.reduce((n,r)=>n+r.quality.warnings,0),0)} field warnings in this view. Missing labels, shared nutrition profiles and conflicting claims remain visible in offer notes.</p></section>`;
 $('#coverage').insertAdjacentHTML('beforeend',historyCoverage(categories));
}
function formula(offers){if(offers[0]?.isUnitOffer){$('#formula-example').innerHTML=unitFormula(snapshot.categories[offers[0].category],offers,{money,num});return;}const r=offers.find(r=>r.rankingEligible)||offers.find(r=>r.cost!=null);$('#formula-example').innerHTML=r?`<p class="calculation"><strong>Dataset example: ${esc(r.brand)} · ${esc(r.product)} · ${esc(r.flavour)} · ${size(r)}</strong><br>${money(r.price)} ÷ (${num(r.grams)} g × ${num(r[categoryOf(r).concentrationField],2)}% ÷ 100) = <strong>${money(r.cost)} / g ${esc(categoryOf(r).compoundLabel)}</strong>. A ${num(categoryOf(r).referenceGrams)} g comparison portion costs ${money(r.referenceCost)}.</p>`:'<p>No offer currently has the inputs required for a calculation.</p>';}
function renderDownloads(){
 const el=$('#downloads');if(!el)return;const categories=Object.values(snapshot.categories);
 el.innerHTML=[...categories.map(c=>({file:c.file,label:`${c.label} JSON · ${num(c.stats.offers,0)} offers`})),{file:'price-history.csv',label:`${snapshot.config.historyQuarters}-quarter price history CSV`},{file:'price-audit.csv',label:'Latest-quarter change audit CSV'},{file:'price-observations.json',label:'Dated price observations'},{file:'quality-report.json',label:'Data quality report'}].map(a=>`<a class="research-card" download href="data/${esc(a.file)}"><strong>${esc(a.label)} ↓</strong><p class="muted">${num((snapshot.assets[a.file]?.bytes||0)/1024,1)} KB · dataset as of ${formatDate(snapshot.asOf)}</p></a>`).join('');
}
function renderAudit(){
 const categories=Object.values(snapshot.categories);renderStats(snapshot.stats);coverage(categories);formula(categories.flatMap(c=>c.offers));renderDownloads();
}
function renderHome(){renderMarketHome(snapshot);}
function renderRanking(id){
 if(snapshot.categories[id].measurement==='units')return;
 const c=snapshot.categories[id],rows=rankedOffers(c,snapshot.config.rankingLimit,r=>!rankingFilters[id]||r.type===rankingFilters[id]);
 $(`#${id}-ranking-title`).textContent=`${c.label}: ${rows.length} value comparisons`;
 $(`#${id}-rankings`).innerHTML=rows.length?`<div class="table-wrap"><table class="rankings-table"><thead><tr><th class="col-rank">Rank</th><th class="col-product">Brand &amp; exact offer</th><th class="col-price col-num">Pack price</th><th class="col-cost col-num">Cost / ${num(c.referenceGrams)} g comparison</th><th class="col-nutrition col-num">Labelled % &amp; energy / 100 g</th><th class="col-score col-num">Grams / ₹100</th><th class="col-action">Evidence</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td class="col-rank"><span class="rank-badge ${i<3?'rank-top':''}">${i+1}</span></td><td class="col-product"><div class="brand">${esc(r.brand)}</div><strong>${esc(r.product)}</strong><div class="muted">${esc(r.flavour)} · ${size(r)}</div></td><td class="col-price col-num"><strong>${money(r.price)}</strong>${priceAuditFlag(r)}${r.trend?.status==='verified'&&['up','down'].includes(r.trend?.direction)?`<div class="trend-wrap"><span class="trend-pill trend-${r.trend.direction}">${r.trend.direction==='down'?'▼':'▲'} ${Math.abs(r.trend.pct).toFixed(1)}%</span></div>`:''}</td><td class="col-cost col-num"><strong class="cost">${money(r.referenceCost)}</strong><div class="muted">${money(r.cost)} / g</div></td><td class="col-nutrition col-num"><strong>${num(r[c.concentrationField],2)}%</strong><div class="muted">${num(r.energy)}${r.energy==null?'':' kcal'}</div></td><td class="col-score col-num"><span class="score-pill">${num(r.score)}</span></td><td class="col-action">${button(r)}</td></tr>`).join('')}</tbody></table></div>`:'<p>No in-stock offers have the price and concentration evidence needed for this ranking.</p>';
}
function catalogFacets(){if(category?.measurement==='units')return unitFacets(category);return categoryId==='creatine'?creatineFacets:facets;}
function catalogMetrics(){if(category?.measurement==='units')return unitMetrics(category);return (categoryId==='creatine'?creatineMetrics:metrics).map(([key,label])=>[key,key==='doseCost'?`Cost / ${category.referenceGrams} g compound (₹)`:label]);}
function state(){const form=new FormData($('#filters')),s={};for(const [key,value] of form){if(catalogFacets().some(([k])=>k===key))(s[key]??=[]).push(value);else s[key]=value;}return s;}
function restore(s){for(const element of $('#filters').elements){const value=s[element.name];if(element.type==='checkbox')element.checked=catalogFacets().some(([key])=>key===element.name)?isFacetChecked(value,element.value):value==='on'||value===true;else if(element.multiple)for(const option of element.options)option.selected=(Array.isArray(value)?value:[value]).includes(option.value);else if(element.name)element.value=Array.isArray(value)?value[0]??'':value??'';}}
function paramsState(){const s={};for(const [k,v] of new URLSearchParams(location.search)){if(catalogFacets().some(([key])=>key===k))(s[k]??=[]).push(v);else s[k]=v;}return s;}
function buildFilters(previous){
 const open=new Set([...$('#categorical').querySelectorAll('details[open]')].map(e=>e.dataset.facet));
 $('#categorical').innerHTML=facetMarkup(category.offers,catalogFacets(),previous,open);
 $('#numeric').innerHTML=catalogMetrics().map(([key,label])=>{const known=category.offers.map(r=>r[key]).filter(n=>n!=null),min=known.length?num(Math.min(...known),2):'Unknown',max=known.length?num(Math.max(...known),2):'Unknown';return `<label>${esc(label)}<span class="range-inputs"><input type="number" min="0" step="any" name="${key}Min" placeholder="Min ${esc(min)}" aria-label="${esc(label)} minimum"><input type="number" min="0" step="any" name="${key}Max" placeholder="Max ${esc(max)}" aria-label="${esc(label)} maximum"></span></label>`;}).join('');
 $('#quality-filters').innerHTML=`<label>Price change vs ${esc(category.previousQuarter.label)}<select name="priceTrend"><option value="">All history coverage</option><option value="down">Decreased</option><option value="up">Increased</option><option value="stable">Unchanged</option><option value="unknown">Latest-quarter change unverified</option></select></label><label class="check"><input type="checkbox" name="complete">Recorded concentration, scoop &amp; energy</label><label class="check"><input type="checkbox" name="knownCost">Known compound cost</label><label class="check"><input type="checkbox" name="verifiedPrice">Matching dated price evidence</label><label class="check"><input type="checkbox" name="reviewNeeded">Has data quality warnings</label>`;
 $('#quality-filters').insertAdjacentHTML('afterbegin',`<label>Historical price coverage<select name="historyCoverage"><option value="">All offers</option><option value="any">Any verified historical quarter</option><option value="full">All ${snapshot.config.historyQuarters} quarters verified</option><option value="none">No verified historical quarters</option></select></label><label>Verified price in quarter<select name="historyQuarter"><option value="">Any requested quarter</option>${category.historyWindow.map(q=>`<option>${esc(q.label)}</option>`).join('')}${previous.historyQuarter&&!category.historyWindow.some(q=>q.label===previous.historyQuarter)?`<option>${esc(previous.historyQuarter)}</option>`:''}</select></label>`);
 if(category.measurement==='units'){const complete=$('#quality-filters input[name="complete"]');if(complete)complete.parentElement.lastChild.textContent='Verified serving size and primary label amounts';const known=$('#quality-filters input[name="knownCost"]');if(known)known.parentElement.lastChild.textContent=category.mainNutrient==='multi'?'Known label-serving cost':'Known active-content cost';}
 $('#sort').innerHTML=[['brand','Brand A–Z'],...catalogMetrics().map(([key,label])=>[key,label])].map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join('');restore(previous);
 $('#sort').value=previous.sort||'brand';view=previous.view==='flat'?'flat':'grouped';
}
function offerTable(rows){if(category.measurement==='units')return unitTable(category,rows,{num,money,button});return `<div class="table-wrap"><table class="offers-table"><thead><tr><th class="col-offer">Exact offer</th><th class="col-type">Form / subclass</th><th class="col-pack col-num">Pack</th><th class="col-price col-num">Price</th><th class="col-cost col-num">Cost / g compound</th><th class="col-refcost col-num">Cost / ${num(category.referenceGrams)} g</th><th class="col-concentration col-num">Labelled %</th><th class="col-scoop col-num">Scoop (g)</th><th class="col-energy col-num">Energy / 100 g</th><th class="col-stock">Stock</th><th class="col-action">Evidence</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="col-offer"><div class="brand">${esc(r.brand)}</div><strong>${esc(r.product)}</strong><div class="muted">${esc(r.flavour)}${r.packaging?' · '+esc(r.packaging):''}</div></td><td class="col-type"><span class="badge-type">${esc(r.type)}</span><div class="muted">${esc(r.subclass)}</div></td><td class="col-pack col-num">${size(r)}</td><td class="col-price col-num"><strong>${money(r.price)}</strong>${priceAuditFlag(r)}${r.trend?.status==='verified'&&['up','down'].includes(r.trend?.direction)?`<div class="trend-wrap"><span class="trend-pill trend-${r.trend.direction}">${r.trend.direction==='down'?'▼':'▲'} ${Math.abs(r.trend.pct).toFixed(1)}%</span></div>`:''}</td><td class="col-cost col-num cost">${money(r.cost)}</td><td class="col-refcost col-num">${money(r.referenceCost)}</td><td class="col-concentration col-num"><strong>${num(r[category.concentrationField],2)}${r[category.concentrationField]==null?'':'%'}</strong></td><td class="col-scoop col-num">${num(r.scoop)}</td><td class="col-energy col-num">${num(r.energy)}${r.energy==null?'':' kcal'}</td><td class="col-stock"><span class="stock-pill ${r.stock==='In stock'?'stock-in':'stock-out'}">${esc(r.stock)}</span></td><td class="col-action">${button(r)}</td></tr>`).join('')}</tbody></table></div>`;}
function metricRange(rows,key,suffix=''){const values=rows.map(r=>r[key]).filter(v=>v!=null),known=values.length;if(!known)return 'Unknown';const min=Math.min(...values),max=Math.max(...values);return `${num(min)}${max!==min?'–'+num(max):''}${suffix}${known<rows.length?' · some unknown':''}`;}
function renderCatalog(){
 const s=state();filtered=sortOffers(filterOffers(category.offers,s,categoryId,category).filter(r=>(!s.verifiedPrice||r.priceAudit.status==='verified')&&(!s.reviewNeeded||r.quality.warnings>0)),$('#sort').value);
 const chipLabel=(key,value)=>{const flag={complete:'Complete label inputs',knownCost:'Known cost',verifiedPrice:'Verified price',reviewNeeded:'Has data warnings'}[key];if(flag)return flag;if(key==='q')return 'Search: '+value;const metric=catalogMetrics().find(([name])=>key===name+'Min'||key===name+'Max');return metric?metric[1]+(key.endsWith('Min')?' ≥ ':' ≤ ')+value:value;};
 const chips=Object.entries(s).flatMap(([key,value])=>(Array.isArray(value)?value:[value]).filter(Boolean).map(v=>({key,value:v}))),activeFilters=$('#active-filters');
 activeFilters.innerHTML=chips.map(({key,value})=>`<button type="button" class="filter-chip" data-filter-key="${esc(key)}" data-filter-value="${esc(value)}" title="Remove ${esc(key)}: ${esc(value)}">${esc(chipLabel(key,value))} <span>×</span></button>`).join('')+(chips.length?'<button type="button" class="clear-applied" data-clear-filters>Clear all</button>':'');
 activeFilters.onclick=e=>{const chip=e.target.closest('[data-filter-key]');if(e.target.closest('[data-clear-filters]')){$('#filters').reset();page=1;renderCatalog();return;}if(!chip)return;for(const element of $('#filters').elements){if(element.name!==chip.dataset.filterKey)continue;if(element.type==='checkbox'){if(!catalogFacets().some(([key])=>key===element.name)||element.value===chip.dataset.filterValue)element.checked=false;}else if(element.multiple){for(const option of element.options)if(option.value===chip.dataset.filterValue)option.selected=false;}else element.value='';}page=1;renderCatalog();};
 const filterButton=$('#filter-toggle');if(filterButton)filterButton.firstChild.textContent=chips.length?`Filters & search · ${chips.length} active `:'Filters & search ';
 const groups=groupOffersByProduct(filtered,categoryId),limit=snapshot.config.pageSizes[view==='flat'?'flat':'grouped'],items=view==='flat'?filtered:groups;
 const pages=Math.max(1,Math.ceil(items.length/limit));page=Math.min(page,pages);const rows=items.slice((page-1)*limit,page*limit);
 $('#count').textContent=`${num(filtered.length,0)} matching ${filtered.length===1?'pack offer':'pack offers'} · ${num(groups.length,0)} ${groups.length===1?'product':'products'}`;
 $('#results-body').innerHTML=view==='flat'?offerTable(rows):rows.map(g=>marketGroup(category,g,snapshot,offerTable)).join('');
 updateComparison(snapshot);
 $('#empty').hidden=items.length>0;$('#prev').disabled=page<=1;$('#next').disabled=page>=pages;$('#page').textContent=`Page ${num(page,0)} of ${num(pages,0)}`;
 for(const mode of ['grouped','flat']){$('#view-'+mode).classList.toggle('active',view===mode);$('#view-'+mode).setAttribute('aria-pressed',String(view===mode));}
 const params=new URLSearchParams();for(const [k,v] of Object.entries(s))if(Array.isArray(v))for(const value of v)params.append(k,value);else if(v)params.set(k,v);if(view==='flat')params.set('view','flat');if($('#sort').value!=='brand')params.set('sort',$('#sort').value);history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));
}
function openOffer(id,offerId){selected={category:id,id:String(offerId)};renderOffer();if(!$('#evidence').open)$('#evidence').showModal();}
function renderOffer(){
 if(!selected)return;const c=snapshot.categories[selected.category],r=c?.offers.find(r=>String(r.id)===selected.id);if(!r){$('#evidence-body').innerHTML='<p>This offer was removed from the latest dataset.</p>';return;}
 const variants=c.offers.filter(v=>v.brand===r.brand&&v.product===r.product),concentration=r[c.concentrationField];
 if(c.measurement==='units'){$('#evidence-title').textContent=`${r.brand} · ${r.product}`;$('#evidence-body').innerHTML=`<div class="detail-education"><strong>Understand the ingredient before choosing the pack.</strong><a href="research.html?category=${esc(c.id)}">Read ${esc(c.label)} benefits, limitations &amp; safety →</a></div>`+unitDetails(c,r,variants,{money,num,link,history:renderHistory(r,c)});$('#offer-variant').addEventListener('change',e=>{selected.id=e.target.value;renderOffer();});return;}
 $('#evidence-title').textContent=`${r.brand} · ${r.product}`;
 const fields=[['Chemical form / source',r.type],['Subclass',r.subclass],['Ingredient trademark',r.grade],['Formulation',r.formulation],['Net pack weight',`${num(r.grams)} g`],['Pack price',money(r.price)],['Labelled concentration',concentration==null?'Unknown':num(concentration,2)+'%'],['Manufacturer scoop',r.scoop==null?'Unknown':num(r.scoop)+' g'],['Labelled serving',r.serving==null?'Unknown':num(r.serving)+' g'],['Protein per scoop',r.category==='protein'&&r.proteinPerScoop!=null?num(r.proteinPerScoop,2)+' g':null],['Energy per 100 g',r.energy==null?'Unknown':num(r.energy)+' kcal'],['Cost / g '+c.compoundLabel,money(r.cost)],['Cost / '+num(c.referenceGrams)+' g comparison',money(r.referenceCost)],['Stock',r.stock],['Category research date',formatDate(c.asOf)],['Price observation date',formatDate(r.priceAudit.checked)],['Price evidence status',r.priceAudit.status]];
 $('#evidence-body').innerHTML=`<div class="detail-education"><strong>Understand the ingredient before choosing the pack.</strong><a href="research.html?category=${esc(c.id)}">Read ${esc(c.label)} benefits, limitations &amp; safety →</a></div><div class="offer-variant-select-wrap"><label for="offer-variant">Exact flavour, weight &amp; packaging</label><select id="offer-variant">${variants.map(v=>`<option value="${esc(v.id)}" ${v.id===r.id?'selected':''}>${esc(v.flavour)} · ${size(v)}${v.packaging?' · '+esc(v.packaging):''} · ${money(v.price)}</option>`).join('')}</select></div><div class="evidence-links">${link(r.url,'Official product listing')} · ${link(r.nutritionUrl,'Nutrition source')} · ${link(r.priceAudit.sourceUrl,'Dated price evidence')}</div><dl class="offer-facts">${fields.filter(([,v])=>v!=null).map(([k,v])=>`<div class="fact-item"><dt>${esc(k)}</dt><dd>${esc(v==='<span class="unknown">Unknown</span>'?'Unknown':v)}</dd></div>`).join('')}</dl><section class="method-card"><h3>Calculation inputs</h3><p>${r.cost==null?'A required concentration value is unknown, so compound cost cannot be calculated.':`${money(r.price)} ÷ (${num(r.grams)} g × ${num(concentration,2)}% ÷ 100) = ${money(r.cost)} / g. ${num(c.referenceGrams)} g × ${money(r.cost)} / g = ${money(r.referenceCost)}.`}</p><p class="hint">Comparison quantities are not manufacturer scoop sizes. Values use the stated compound percentage; different creatine forms may not be chemically equivalent.</p></section>${renderHistory(r,c)}<section><h3>Label basis &amp; data quality</h3><p>${esc(r.basis||'Label basis not recorded.')}</p><p>${esc(r.notes||'No additional notes recorded.')}</p>${r.energyBasis?`<p>${esc(r.energyBasis)}</p>`:''}<ul class="quality-warning">${r.quality.issues.map(i=>`<li>${esc(i.field)}: ${esc(i.message)}</li>`).join('')}</ul></section>`;
 $('#offer-variant').addEventListener('change',event=>{selected.id=event.target.value;renderOffer();});
}
function onSnapshot(next){
 const previous=category&&categoryId?{...state(),sort:$('#sort').value,view}:null;snapshot=next;category=next.categories[categoryId];
 document.querySelectorAll('[data-site-name]').forEach(e=>e.textContent=next.config.name);
 const active=categoryId||new URLSearchParams(location.search).get('category');
 $('#navigation').innerHTML=`<a href="index.html" ${!categoryId&&!pageType?'aria-current="page"':''}>Home</a><a href="research.html" ${pageType==='research'?'aria-current="page"':''}>Learn about supplements</a><a href="search.html?kind=products" ${categoryId||pageType==='search'?'aria-current="page"':''}>Compare products</a><a href="recommender.html" ${pageType==='recommender'?'aria-current="page"':''}>Stack builder</a><a href="audit.html" ${pageType==='audit'?'aria-current="page"':''}>Sources &amp; data quality</a>`;
 $('#category-nav').innerHTML=next.config.categories.map(c=>`<a href="${esc(categoryId||pageType==='search'?c.page:'research.html?category='+c.id)}" ${active===c.id?'aria-current="page"':''}>${categoryIcon(c.id)}<span>${esc(c.label)}</span></a>`).join('');
 const globalCategory=$('#global-search-category'),searchParams=new URLSearchParams(location.search),oldCategory=globalCategory.value||searchParams.get('category')||'';
 globalCategory.innerHTML=`<option value="">All supplements</option>${next.config.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('')}`;globalCategory.value=next.categories[oldCategory]?oldCategory:'';
 if(!$('#global-search-input').dataset.ready){$('#global-search-input').value=searchParams.get('q')||'';$('#global-search-input').dataset.ready='true';}
 if(categoryId){if(!category)throw Error('Category missing from dataset.');$('.category-hero').innerHTML=categoryHero(next,category);$('#category-primer').innerHTML=categoryPrimer(next,category);$('#results-title').textContent=category.label+' products';
  formula(category.offers);buildFilters(previous||paramsState());renderCatalog();
 }else if(pageType==='recommender')renderRecommender(next);
 else if(pageType==='research')renderResearch(next);
 else if(pageType==='search')renderSearch(next);
 else if(pageType==='audit')renderAudit();
 else renderHome();
 const metadata=pageMetadata(next,pageType||categoryId);document.title=metadata.title;
 for(const [selector,value] of [['meta[name="description"]',metadata.description],['meta[property="og:description"]',metadata.description],['meta[property="og:title"]',metadata.title]]){const el=$(selector);if(el)el.content=value;}
 const structured=$('script[type="application/ld+json"]');if(structured)structured.textContent=JSON.stringify(metadata.structured);
 if(selected&&$('#evidence').open)renderOffer();updateComparison(next);
}
watchData(onSnapshot,(current,status)=>{
 const el=$('#dataset-status');el.classList.toggle('data-error',status.state==='error');
 if(status.state==='error')el.textContent=current?`Refresh failed. Showing last validated revision ${status.version.slice(0,8)}. ${status.message}`:`Dataset unavailable. ${status.message} Use Refresh data to retry.`;
 else {el.textContent=`Data reviewed ${formatDate(current.categories[categoryId]?.asOf||current.asOf)}`;el.title=`Revision ${status.version.slice(0,8)} · automatically checks every ${current.config.refreshIntervalMs/1000} seconds while visible`;}
});
$('#refresh-data').addEventListener('click',async()=>{const b=$('#refresh-data');b.disabled=true;try{await dataStore.refresh();}finally{b.disabled=false;}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-offer]');if(b)openOffer(b.dataset.category,b.dataset.offer);});
$('#close').addEventListener('click',()=>$('#evidence').close());$('#evidence').addEventListener('click',e=>{if(e.target===$('#evidence'))$('#evidence').close();});$('#evidence').addEventListener('close',()=>{selected=null;});
document.addEventListener('change',e=>{if(e.target.id==='category-switch'){const c=snapshot.config.categories.find(c=>c.page===e.target.value);if(c)location.href=c.page;}if(e.target.matches('[data-rank-filter]')){rankingFilters[e.target.dataset.rankFilter]=e.target.value;renderRanking(e.target.dataset.rankFilter);}});
if(categoryId){
 $('#filters').addEventListener('input',event=>{const find=event.target.closest('[data-facet-search]');if(find){const query=find.value.toLowerCase().trim();find.closest('details').querySelectorAll('.facet-option').forEach(option=>{option.hidden=!option.querySelector('input').value.toLowerCase().includes(query);});return;}if(category){page=1;renderCatalog();}});$('#sort').addEventListener('change',()=>{page=1;renderCatalog();});
 $('#reset').addEventListener('click',()=>{if(!category)return;$('#filters').reset();page=1;renderCatalog();});
 for(const mode of ['grouped','flat'])$('#view-'+mode).addEventListener('click',()=>{if(!category)return;view=mode;page=1;renderCatalog();});
 for(const [selector,delta] of [['#prev',-1],['#next',1]])$(selector).addEventListener('click',()=>{page+=delta;renderCatalog();$('#results-title').scrollIntoView({block:'start'});});
}
function setupTheme(){
 const getStored=()=>{try{return localStorage.getItem('theme')||'system';}catch{return 'system';}};
 const applyTheme=mode=>{
  if(mode==='dark'){
   document.documentElement.setAttribute('data-theme','dark');
   document.documentElement.style.colorScheme='dark';
  }else if(mode==='light'){
   document.documentElement.setAttribute('data-theme','light');
   document.documentElement.style.colorScheme='light';
  }else{
   document.documentElement.removeAttribute('data-theme');
   document.documentElement.style.colorScheme='light dark';
  }
  document.querySelectorAll('.theme-btn').forEach(btn=>{
   const isActive=btn.dataset.themeValue===mode;
   btn.classList.toggle('active',isActive);
   btn.setAttribute('aria-pressed',isActive?'true':'false');
  });
 };
 const setTheme=mode=>{
  try{
   if(mode==='system')localStorage.removeItem('theme');
   else localStorage.setItem('theme',mode);
  }catch{}
  applyTheme(mode);
 };
 document.addEventListener('click',e=>{
  const btn=e.target.closest('.theme-btn');
  if(btn&&btn.dataset.themeValue)setTheme(btn.dataset.themeValue);
 });
 window.addEventListener('storage',e=>{
  if(e.key==='theme')applyTheme(e.newValue||'system');
 });
 try{
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{
   if(getStored()==='system')applyTheme('system');
  });
 }catch{}
 applyTheme(getStored());
}
setupTheme();


const menuToggle=document.querySelector('#menu-toggle');
menuToggle?.addEventListener('click',()=>{const open=menuToggle.getAttribute('aria-expanded')!=='true';menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');document.querySelector('#navigation').classList.toggle('is-open',open);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){menuToggle?.setAttribute('aria-expanded','false');menuToggle?.setAttribute('aria-label','Open navigation');document.querySelector('#navigation')?.classList.remove('is-open');}});

const filterToggle=document.querySelector('#filter-toggle');filterToggle?.addEventListener('click',()=>{const open=filterToggle.getAttribute('aria-expanded')!=='true';filterToggle.setAttribute('aria-expanded',String(open));document.querySelector('#catalog-filters').classList.toggle('is-open',open);filterToggle.querySelector('span').textContent=open?'−':'+';});
