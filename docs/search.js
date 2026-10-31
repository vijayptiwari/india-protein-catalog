import {escapeHtml as esc,formatDate} from './model.js';

const positive=value=>typeof value==='number'&&Number.isFinite(value)&&value>0;
const unique=values=>[...new Set(values.filter(value=>value!=null&&value!==''))];
export const normalizeSearch=value=>String(value??'').normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu,' ').trim().replace(/\s+/g,' ');
const termsFor=q=>unique(normalizeSearch(q).split(' ').filter(Boolean));
const matches=(text,terms)=>terms.every(term=>/\d/.test(term)?text.split(' ').includes(term):text.includes(term));
const guideText=(guide,category)=>normalizeSearch([category.label,...(category.searchAliases||[]),...(category.nutrientFields||[]).flatMap(f=>f.searchAliases||[]),guide.title,guide.summary,guide.evidence,guide.limitations,guide.catalogReading,guide.safety,...(guide.bodySteps||[]),guide.treatment,guide.whoMayBenefit,guide.routineUse].join(' '));
const offerText=(offer,category)=>normalizeSearch([category.productSearchLabel||category.label,...(category.searchAliases||[]),...(category.nutrientFields||[]).filter(f=>offer.declaredNutrients?.includes(f.key)||offer[f.key]!=null).flatMap(f=>[f.label,...(f.searchAliases||[])]),/b[\s-]?complex/i.test([offer.product,offer.type,offer.subclass].join(' '))?'bcomplex':'',offer.brand,offer.product,offer.type,offer.subclass,offer.flavour,offer.grade,offer.formulation,offer.source,offer.form,offer.packaging].join(' '));
const sourcePrice=offer=>positive(offer.price)&&offer.priceAudit?.status==='verified';
const pricedFirst=(a,b)=>a.price-b.price||String(a.id).localeCompare(String(b.id));

/** AND-term discovery over exact offer inputs and educational guides. */
export function searchCatalog(snapshot,{q='',category='',kind='all'}={}){
 const query=String(q??'').trim(),terms=termsFor(query),mode=['all','products','guides'].includes(kind)?kind:'all';
 const categories=Object.values(snapshot.categories||{}),sourceMap=new Map((snapshot.research?.sources||[]).map(source=>[source.id,source])),families=new Map();
 for(const c of categories)for(const offer of c.offers){
  const key=JSON.stringify([c.id,offer.brand,offer.product]);
  if(!families.has(key))families.set(key,{id:key,category:c.id,categoryLabel:c.label,page:c.page,brand:offer.brand,product:offer.product,variants:[],allVariants:[]});
  const family=families.get(key);family.allVariants.push(offer);if(matches(offerText(offer,c),terms))family.variants.push(offer);
 }
 const allProducts=[...families.values()].filter(family=>family.variants.length).map(family=>{
  const sourced=family.variants.filter(sourcePrice).sort(pricedFirst),available=sourced.filter(offer=>offer.stock==='In stock'),representative=available[0]||sourced[0]||null;
  return {...family,matchingCount:family.variants.length,totalCount:family.allVariants.length,verifiedCount:sourced.length,availableCount:available.length,minPrice:available[0]?.price??null,lowestSourcedPrice:sourced[0]?.price??null,priceStatus:available.length?'available':sourced.length?'sourced-unavailable':'unverified',representative,types:unique(family.variants.map(offer=>offer.type)),subclasses:unique(family.variants.map(offer=>offer.subclass)),flavours:unique(family.variants.map(offer=>offer.flavour)),packLabels:unique(family.variants.map(packLabel))};
 }).sort((a,b)=>a.categoryLabel.localeCompare(b.categoryLabel)||a.brand.localeCompare(b.brand)||a.product.localeCompare(b.product));
 const allGuides=(snapshot.research?.articles||[]).filter(guide=>snapshot.categories[guide.category]&&matches(guideText(guide,snapshot.categories[guide.category]),terms)).map(guide=>({...guide,categoryLabel:snapshot.categories[guide.category].label,sourceRefs:(guide.sourceIds||[]).map(id=>sourceMap.get(id)).filter(Boolean)}));
 const facets=categories.map(c=>{const products=mode==='guides'?0:allProducts.filter(p=>p.category===c.id).length,guides=mode==='products'?0:allGuides.filter(g=>g.category===c.id).length;return {id:c.id,label:c.label,products,guides,total:products+guides};});
 const products=mode==='guides'?[]:allProducts.filter(p=>!category||p.category===category),guides=mode==='products'?[]:allGuides.filter(g=>!category||g.category===category);
 return {query,terms,category,kind:mode,products,guides,facets,totals:{products:products.length,guides:guides.length,variants:products.reduce((sum,p)=>sum+p.matchingCount,0),all:products.length+guides.length}};
}
function packLabel(offer){
 if(offer.isUnitOffer||offer.packCount!=null)return `${offer.packCount} ${{Tablet:'tablets',Capsule:'capsules',Softgel:'softgels',Gummy:'gummies','Oral strip':'oral strips'}[offer.form]||'units'}`;
 return offer.kg!=null?`${offer.kg} kg`:offer.grams!=null?`${offer.grams} g`:'Pack size unverified';
}
function catalogLink(product){const params=new URLSearchParams({brand:product.brand,product:product.product});return product.page+'?'+params;}
function productMarkup(product,snapshot){
 const money=value=>new Intl.NumberFormat(snapshot.config.locale||'en-IN',{style:'currency',currency:snapshot.config.currency||'INR',maximumFractionDigits:2}).format(value),r=product.representative;
 const price=product.priceStatus==='available'?`<span class="discover-price-label">Sourced in-stock price from</span><strong class="discover-price">${money(product.minPrice)}</strong>`:product.priceStatus==='sourced-unavailable'?`<span class="discover-price-label">Verified quote from ${money(product.lowestSourcedPrice)}</span><strong class="discover-price-note">No verified in-stock pack</strong>`:'<strong class="discover-price-note">Current price unverified</strong>';
 return `<article class="discover-product"><div class="discover-product-heading"><span class="discover-eyebrow">${esc(product.categoryLabel)}</span><span class="discover-brand">${esc(product.brand)}</span></div><h3><a href="${esc(catalogLink(product))}">${esc(product.product)}</a></h3><p class="discover-form">${esc(product.types.join(' / '))}${product.subclasses.length?' · '+esc(product.subclasses.join(' / ')):''}</p><p class="discover-pack">${esc(product.packLabels.join(' · '))}</p><p class="discover-match">${product.matchingCount} matching ${product.matchingCount===1?'pack':'packs'} · ${product.flavours.length} ${product.flavours.length===1?'flavour':'flavours'}${product.totalCount>product.matchingCount?' · '+product.totalCount+' total product packs':''}</p><div class="discover-price-block">${price}${r?`<small>${esc(packLabel(r))} · ${esc(r.flavour)} · observed ${formatDate(r.priceAudit.checked)}</small>`:''}</div><div class="discover-product-actions"><a class="discover-primary" href="${esc(catalogLink(product))}">Compare packs →</a><a href="research.html?category=${esc(product.category)}">Learn about ${esc(product.categoryLabel)}</a></div></article>`;
}
function guideMarkup(guide){return `<article class="discover-guide"><span class="discover-eyebrow">${esc(guide.categoryLabel)} · Evidence guide</span><h3><a href="research.html?category=${esc(guide.category)}">${esc(guide.title)}</a></h3><p>${esc(guide.summary)}</p><div class="discover-guide-meta">${guide.sourceRefs.length} cited ${guide.sourceRefs.length===1?'reference':'references'} · reviewed ${formatDate(guide.reviewed)}</div><a class="discover-guide-link" href="research.html?category=${esc(guide.category)}">Read the guide →</a></article>`;}

/** Owns only #search-results-root. No data or user profile is persisted. */
export function renderSearch(snapshot){
 const root=document.querySelector('#search-results-root');if(!root)return;
 if(!root.dataset.ready){
  const params=new URLSearchParams(location.search);
  root.innerHTML=`<div class="discover-page-heading"><span class="overline">SEARCH THE KNOWLEDGE &amp; PRODUCT CATALOG</span><h1>Find answers. Compare with context.</h1><p>Search ingredients, brands, exact packs and the evidence behind them.</p></div><form id="discover-form" class="discover-controls" role="search" aria-label="Search supplements and education"><label for="discover-query">Search<input id="discover-query" name="q" type="search" placeholder="Brand, ingredient, flavour or question"></label><label for="discover-category">Supplement<select id="discover-category" name="category"></select></label><label for="discover-kind">Show<select id="discover-kind" name="kind"><option value="all">Products &amp; guides</option><option value="products">Products</option><option value="guides">Education guides</option></select></label><button type="submit">Search</button><button type="reset" class="discover-reset">Clear</button></form><p id="discover-status" class="discover-status" role="status" aria-live="polite"></p><div id="discover-results"></div>`;
  document.querySelector('#discover-query').value=params.get('q')||'';root.dataset.initialCategory=params.get('category')||'';document.querySelector('#discover-kind').value=['products','guides'].includes(params.get('kind'))?params.get('kind'):'all';root.dataset.ready='true';root.dataset.productLimit='12';root.dataset.guideLimit='6';
 }
 const form=document.querySelector('#discover-form'),select=document.querySelector('#discover-category'),selected=select.value||root.dataset.initialCategory||'';delete root.dataset.initialCategory;
 select.innerHTML=`<option value="">All supplements</option>${Object.values(snapshot.categories).map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('')}`;select.value=snapshot.categories[selected]?selected:'';
 const update=()=>{
  const state={q:document.querySelector('#discover-query').value,category:select.value,kind:document.querySelector('#discover-kind').value},result=searchCatalog(snapshot,state),selectedCategory=select.value;
  select.innerHTML=`<option value="">All supplements (${result.facets.reduce((sum,f)=>sum+f.total,0)})</option>${result.facets.map(f=>`<option value="${esc(f.id)}">${esc(f.label)} (${f.total})</option>`).join('')}`;select.value=selectedCategory;
  const globalQuery=document.querySelector('#global-search-input'),globalCategory=document.querySelector('#global-search-category');if(globalQuery)globalQuery.value=state.q;if(globalCategory)globalCategory.value=state.category;
  const params=new URLSearchParams();if(state.q.trim())params.set('q',state.q.trim());if(state.category)params.set('category',state.category);if(state.kind!=='all')params.set('kind',state.kind);history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));
  document.querySelector('#discover-status').textContent=`${result.totals.products} product ${result.totals.products===1?'family':'families'} · ${result.totals.variants} matching packs · ${result.totals.guides} ${result.totals.guides===1?'guide':'guides'}${result.query?' for “'+result.query+'”':''}`;
  const productLimit=Number(root.dataset.productLimit)||12,guideLimit=Number(root.dataset.guideLimit)||6;
  document.querySelector('#discover-results').innerHTML=result.totals.all?`${result.guides.length?`<section class="discover-education"><div class="discover-section-heading"><h2>Understand before comparing</h2><p>Evidence, body processes, benefits and limitations.</p></div><div class="discover-guides">${result.guides.slice(0,guideLimit).map(guideMarkup).join('')}</div>${result.guides.length>guideLimit?'<button type="button" data-discover-more="guides" class="discover-more">Show more guides</button>':''}</section>`:''}${result.products.length?`<section class="discover-catalog"><div class="discover-section-heading"><h2>Matching product families</h2><p>Exact pack availability and label values vary. Price comparisons do not score health outcomes.</p></div><div class="discover-products">${result.products.slice(0,productLimit).map(p=>productMarkup(p,snapshot)).join('')}</div>${result.products.length>productLimit?`<button type="button" data-discover-more="products" class="discover-more">Show more products (${result.products.length-productLimit} remaining)</button>`:''}</section>`:''}`:'<section class="discover-empty"><h2>No matching products or guides</h2><p>Try a broader ingredient name, remove a term, or choose all supplements.</p><button type="button" data-discover-clear>Clear search</button></section>';
 };
 const resetLimits=()=>{root.dataset.productLimit='12';root.dataset.guideLimit='6';};
 form.onsubmit=event=>{event.preventDefault();resetLimits();update();};form.onchange=()=>{resetLimits();update();};form.onreset=event=>{event.preventDefault();document.querySelector('#discover-query').value='';select.value='';document.querySelector('#discover-kind').value='all';resetLimits();update();};
 root.onclick=event=>{const more=event.target.closest('[data-discover-more]');if(more){const key=more.dataset.discoverMore==='products'?'productLimit':'guideLimit';root.dataset[key]=String((Number(root.dataset[key])||0)+(key==='productLimit'?12:6));update();}if(event.target.closest('[data-discover-clear]'))form.reset();};
 update();
}
