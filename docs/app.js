import {facets,metrics,creatineFacets,creatineMetrics,filterOffers,sortOffers,csv,groupOffersByProduct,formatTrendBadge,summarizeTrends,priceAuditNotice,priceAuditFlag} from './core.js';
import {getBrandInfo} from './brands.js';

const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const category=document.body.dataset.category||'protein',isCreatine=category==='creatine',activeFacets=isCreatine?creatineFacets:facets,activeMetrics=isCreatine?creatineMetrics:metrics;
let offers=[],filtered=[],page=1,viewMode='grouped';
const sizeGrouped=15,sizeFlat=40;

const number=(v,d=1)=>v==null?'<span class="unknown">Unknown</span>':Number(v).toLocaleString('en-IN',{maximumFractionDigits:d,minimumFractionDigits:0});
const money=v=>'₹'+Number(v).toLocaleString('en-IN',{maximumFractionDigits:2});
const optionalMoney=v=>v==null?number(null):money(v);
const identity=r=>[r.brand,r.product,r.flavour,isCreatine?r.packaging:''].join('|');

function state(){
  const f=new FormData($('#filters')),s={q:f.get('q')||'',complete:f.has('complete'),knownCost:f.has('knownCost'),priceTrend:f.get('priceTrend')||''};
  for(const[k]of activeFacets)s[k]=f.getAll(k);
  for(const[k]of activeMetrics)for(const end of ['Min','Max'])s[k+end]=f.get(k+end)||'';
  return s;
}

function safeLink(url,label){
  try{
    const u=new URL(url);
    if(u.protocol==='https:')return `<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  }catch{}
  return 'Not provided';
}

function renderSparklineSvg(history, width=130, height=26){
  const pts = (history || []).filter(h => h.verified===true && h.price != null);
  if(pts.length < 2) return '';
  const prices = pts.map(h => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 3;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const coords = pts.map((pt, i) => {
    const x = pad + (i / (pts.length - 1)) * w;
    const y = pad + h - ((pt.price - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color = pts[pts.length - 1].price > pts[0].price ? '#e11d48' : (pts[pts.length - 1].price < pts[0].price ? '#059669' : '#64748b');
  const lastCoord = coords[coords.length - 1].split(',');
  return `<svg class="trend-sparkline-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="Verified price observations; missing periods are not interpolated">
    <polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${coords.join(' ')}" />
    <circle cx="${lastCoord[0]}" cy="${lastCoord[1]}" r="3" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
  </svg>`;
}

function renderQuarterTimeline(history){
  if(!history || !history.length) return '';
  return `
  <div class="quarter-timeline-wrap">
    <div class="quarter-timeline-header">
      <span>Verified snapshots: Q3 2026 → Q4 2026 to date</span>
      <span class="timeline-hint">⇄ Swipe / scroll horizontally</span>
    </div>
    <div class="quarter-chips-scroll">
      ${history.map((h, i) => {
        const isCurrent = i === history.length - 1;
        if(h.verified!==true || h.price == null){
          return `
          <div class="quarter-chip unlaunched">
            <div class="chip-q">${esc(h.quarter)}</div>
            <div class="chip-price">—</div>
            <div class="chip-status">${esc(h.status||'No verified history')}</div>
          </div>`;
        }
        const delta = h.qoqPct;
        const deltaHtml = delta == null ? '<span class="chip-delta delta-unknown">No prior verified comparison</span>' : delta === 0
          ? '<span class="chip-delta delta-stable">─ Unchanged 0%</span>'
          : (delta < 0
            ? `<span class="chip-delta delta-down">▼ ${Math.abs(delta)}%</span>`
            : `<span class="chip-delta delta-up">▲ +${Math.abs(delta)}%</span>`);
        return `
        <div class="quarter-chip ${isCurrent ? 'current' : ''}">
          <div class="chip-q">${esc(h.quarter)}${isCurrent ? ' <span class="chip-now-tag">Current</span>' : ''}</div>
          <div class="chip-price">${money(h.price)}</div>
          <div class="chip-status">Observed ${esc(h.date)}</div>
          <div class="chip-status">${safeLink(h.source,'Dated source')}</div>
          ${deltaHtml}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function renderModal(productOffers, activeWeight){
  if(!productOffers||!productOffers.length)return;
  const sample=productOffers[0];
  const brandInfo=getBrandInfo(sample.brand,sample.url);
  const weights=[...new Set(productOffers.map(r=>isCreatine?r.grams:r.kg))].sort((a,b)=>a-b);
  if(activeWeight==null||!weights.includes(activeWeight))activeWeight=weights[0];

  const wOffers=productOffers.filter(r=>(isCreatine?r.grams:r.kg)===activeWeight);
  const wSample=wOffers[0]||sample;
  const concentration=isCreatine?wSample.creatine:wSample.protein;

  // Summarize comparable variants without presenting missing evidence as stable.
  const allPrices=productOffers.map(p=>p.price);
  const globalMin=Math.min(...allPrices);
  const globalMax=Math.max(...allPrices);
  const productTrend=summarizeTrends(productOffers.map(p=>p.trend));

  $('#evidence-title').textContent=`${sample.brand} — ${sample.product}`;
  $('#evidence-body').innerHTML=`
  <div class="modal-12q-summary-card">
    <div class="m-stat">
      <span class="m-lbl">Comparison period</span>
      <span class="m-val">Q3 2026 vs 25 October 2026</span>
    </div>
    <div class="m-stat">
      <span class="m-lbl">Catalog Price Range</span>
      <span class="m-val">${money(globalMin)} – ${money(globalMax)}</span>
    </div>
    <div class="m-stat">
      <span class="m-lbl">Verified quarter comparisons</span>
      <span class="m-val">${productTrend.verifiedCount} / ${productOffers.length} variants</span>
    </div>
  </div>

  <div class="direct-dispatch-box">
    <div class="direct-dispatch-header">
      <span class="direct-dispatch-badge">FACTORY DIRECT DISPATCH</span>
      <span class="anti-counterfeit-tag">✓ 100% Guaranteed Authentic</span>
    </div>
    <p class="direct-dispatch-text">
      Dispatched directly from the verified <strong>${esc(brandInfo.name)}</strong> manufacturer warehouse. Zero 3rd-party marketplace sellers.
    </p>
    ${brandInfo.couponCode ? `
    <div class="coupon-pill-wrap">
      <span>Brand Coupon Code:</span>
      <code class="coupon-code">${esc(brandInfo.couponCode)}</code>
      <span class="coupon-discount">(${esc(brandInfo.discount)})</span>
    </div>` : ''}
    <a class="direct-buy-btn" href="${esc(brandInfo.purchaseUrl)}" target="_blank" rel="noopener noreferrer">
      Buy on Official ${esc(brandInfo.name)} Store ↗
    </a>
    <div class="verification-hint">
      <strong>Anti-Counterfeit Check:</strong> ${esc(brandInfo.verification)}
    </div>
  </div>

  <div style="margin-top: 18px;">
    <strong>Select Pack Weight / Size:</strong>
    <div class="modal-weight-tabs" role="tablist">
      ${weights.map(w=>{
        const count=productOffers.filter(x=>(isCreatine?x.grams:x.kg)===w).length;
        const hasNew=productOffers.some(x=>(isCreatine?x.grams:x.kg)===w&&x.isNew);
        const isActive=w===activeWeight;
        return `<button class="weight-tab-btn ${isActive?'active':''}" data-weight="${w}" type="button">
          ${isCreatine?w+' g':w+' kg'}
          <span class="weight-tab-count">${count} flav</span>
          ${hasNew?'<span class="new-pill-sm">✨ New</span>':''}
        </button>`;
      }).join('')}
    </div>
  </div>

  <div class="flavour-trends-list">
    ${wOffers.map(f=>{
      const fBrand=getBrandInfo(f.brand,f.url);
      const fConc=isCreatine?f.creatine:f.protein;
      const t=f.trend||{};
      const history=t.history||[];
      const quarterChange=t.status==='verified'?t.pct:null;
      const minP=t.lowestPrice||f.price;
      const maxP=t.highestPrice||f.price;
      const trackedCount=t.quartersTracked||history.filter(h=>h.price!=null).length||1;
      const sparklineHtml=renderSparklineSvg(history,130,26);
      const timelineHtml=renderQuarterTimeline(history);

      return `
      <div class="flavour-trend-card">
        <div class="flavour-top-row">
          <div class="flavour-info">
            <div class="flavour-header-line">
              <span class="flavour-name-title">${esc(f.flavour)}${isCreatine&&f.packaging?' · '+esc(f.packaging):''}</span>
              ${f.isNew?'<span class="new-pill">✨ Newly Added</span>':''}
            </div>
            <div class="flavour-specs-line">
              Purity: <strong>${number(fConc)}%</strong> · Cost: <strong>${optionalMoney(f.cost)} / g</strong>
              ${isCreatine?`· 3g Dose: <strong>${optionalMoney(f.doseCost)}</strong>`:`· 24g Scoop: <strong>${f.cost?money(f.cost*24):'Unknown'}</strong>`}
            </div>
          </div>
          <div class="flavour-trend-right">
            <div class="flavour-price-col">
              <div class="flavour-price-num">${money(f.price)}${priceAuditFlag(f)}</div>
              <div>${formatTrendBadge(f.trend,f.isNew)}</div>
            </div>
            <a class="btn-buy-variant" href="${esc(fBrand.purchaseUrl)}" target="_blank" rel="noopener noreferrer">
              Buy Direct ↗
            </a>
          </div>
        </div>

        <div class="flavour-12q-summary">
          <div class="summary-left">
            <div class="summary-stat">
              <span class="lbl">Since Q3 observation:</span>
              <span class="val ${quarterChange<0?'text-green':(quarterChange>0?'text-red':'')}">
                ${quarterChange!=null?(quarterChange>0?'+':'')+quarterChange+'%': 'No verified comparison'}
              </span>
              <span class="timeline-meta">(${trackedCount} verified period snapshots)</span>
            </div>
            <div class="summary-stat">
              <span class="lbl">Observed prices:</span>
              <span class="val">${t.quartersTracked?money(minP)+' – '+money(maxP):'No verified observations'}</span>
            </div>
          </div>
          <div class="summary-right">
            ${sparklineHtml}
          </div>
        </div>

        ${timelineHtml}
        ${t.auditNote?`<p class="muted">Historical evidence excluded: ${esc(t.auditNote)}</p>`:''}
      </div>`;
    }).join('')}
  </div>

  <p><strong>Serving &amp; Scoop Information:</strong><br>Serving Size: ${number(wSample.serving)} g · Scoop Size: ${number(wSample.scoop)} g${isCreatine?`<br>Disclosed active creatine / serving: ${number(wSample.creatineServing)} g`:''}</p>
  <p><strong>Verified Lab Nutrition Label:</strong><br>${safeLink(wSample.nutritionUrl,'View Official Manufacturer Nutrition Panel')}</p>
  ${wSample.notes?`<p><strong>Label &amp; Ingredient Notes:</strong><br>${esc(wSample.notes)}</p>`:''}
  <p class="muted">Q3 means 1 July–30 September 2026. Baseline is the latest retrievable exact-variant official-store observation in that quarter, not a quarterly average. Q4 is incomplete. Unverified history is grey, never assumed unchanged. Current price check: ${esc(wSample.priceAudit?.status||'unverified')}. ${safeLink(wSample.priceAudit?.sourceUrl,'Current price source')}.</p>`;

  // Bind tab click events inside modal
  const tabBtns=$('#evidence-body').querySelectorAll('.weight-tab-btn');
  tabBtns.forEach(btn=>{
    btn.onclick=()=>{
      const w=Number(btn.dataset.weight);
      renderModal(productOffers,w);
    };
  });
}

function openModalForProduct(brand, product, preferredWeight=null){
  const productOffers=offers.filter(x=>x.brand===brand&&x.product===product);
  if(!productOffers.length)return;
  renderModal(productOffers,preferredWeight);
  $('#evidence').showModal();
}

function openModalForOffer(offerId){
  const r=offers.find(x=>String(x.id)===String(offerId));
  if(!r)return;
  const productOffers=offers.filter(x=>x.brand===r.brand&&x.product===r.product);
  renderModal(productOffers,isCreatine?r.grams:r.kg);
  $('#evidence').showModal();
}

function render(){
  const s=state();
  filtered=sortOffers(filterOffers(offers,s,category),$('#sort').value);

  const groupedContainer=$('#grouped-container');
  const tableWrap=$('.table-wrap');
  const currentSize=viewMode==='grouped'?sizeGrouped:sizeFlat;

  if(viewMode==='grouped'){
    const groups=groupOffersByProduct(filtered,category);
    const pages=Math.max(1,Math.ceil(groups.length/sizeGrouped));
    page=Math.min(page,pages);
    $('#count').textContent=`${groups.length.toLocaleString()} products (${filtered.length.toLocaleString()} pack options) · ${new Set(filtered.map(identity)).size} unique items`;

    if(groupedContainer){
      groupedContainer.hidden=false;
      groupedContainer.innerHTML=groups.slice((page-1)*sizeGrouped,page*sizeGrouped).map(g=>`
      <div class="product-group-card">
        <div class="group-header">
          <div class="group-header-left">
            <div class="brand">${esc(g.brand)}</div>
            <div class="group-title-row">
              <h3 class="group-title">${esc(g.product)}</h3>
              ${g.hasNew?'<span class="new-pill">✨ New Variants</span>':''}
            </div>
            <div class="group-meta-tags">
              <span>${esc(g.type)} · ${esc(g.subclass)}</span>
              <span>•</span>
              <span><strong>${number(isCreatine?g.creatine:g.protein)}%</strong> ${isCreatine?'Creatine':'Protein'}</span>
              <span>•</span>
              <span>${g.weights.join(' · ')}</span>
              <span>•</span>
              <span>${g.count} variation${g.count>1?'s':''}</span>
            </div>
          </div>
          <div class="group-header-right">
            <div class="group-price-summary">
              <div class="group-price-from">Starting Price</div>
              <div class="group-price-val">${money(g.minPrice)}</div>
              ${g.minCost!=null?`<div class="group-cost-from">from ${money(g.minCost)} / g</div>`:''}
            </div>
            <div>
              ${formatTrendBadge(g.trendSummary,false)}
            </div>
            <button class="btn-group-inspect" data-group-brand="${esc(g.brand)}" data-group-product="${esc(g.product)}" type="button">
              Inspect Trends &amp; Tabs ↗
            </button>
          </div>
        </div>
        <div class="group-variations-wrap">
          <table class="group-variations-table">
            <thead>
              <tr>
                <th>Pack Size</th>
                <th>Flavour</th>
                <th>Status</th>
                <th>Price</th>
                <th>Price Trend</th>
                <th>${isCreatine?'₹ / g Creatine':'Cost / g Protein'}</th>
                <th>Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${g.variations.map(v=>`
              <tr>
                <td><span class="badge">${isCreatine?v.grams+' g':v.kg+' kg'}</span></td>
                <td>
                  <span class="product-title-sm">${esc(v.flavour)}${isCreatine&&v.packaging?' · '+esc(v.packaging):''}</span>
                </td>
                <td>${v.isNew?'<span class="new-pill">✨ Newly Added</span>':'<span class="muted">—</span>'}</td>
                <td class="value">${money(v.price)}${priceAuditFlag(v)}</td>
                <td>${formatTrendBadge(v.trend,v.isNew)}</td>
                <td class="value cost">${optionalMoney(v.cost)}</td>
                <td class="${/out|sold|unavailable/i.test(v.stock)?'out':'muted'}">${esc(v.stock)}</td>
                <td>
                  <button data-id="${esc(v.id)}" class="btn-sm" type="button">Inspect ↗</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`).join('');
    }

    if(tableWrap)tableWrap.hidden=true;
    // Keep #rows synced as well
    $('#rows').innerHTML=filtered.slice((page-1)*sizeFlat,page*sizeFlat).map(r=>`<tr><td><div class="brand">${esc(r.brand)}</div><span class="product">${esc(r.product)}</span><span class="muted">${esc(r.flavour)}${isCreatine?' · '+esc(r.packaging):''}</span>${r.isNew?' <span class="new-pill-sm">✨ New</span>':''}</td><td>${esc(r.type)}<br><span class="muted">${esc(r.subclass)}${isCreatine?'<br>'+esc(r.grade)+' · '+esc(r.formulation):''}</span></td><td><span class="badge">${isCreatine?r.grams+' g':r.kg+' kg'}</span></td><td class="value">${money(r.price)}${priceAuditFlag(r)}</td><td>${formatTrendBadge(r.trend,r.isNew)}</td>${isCreatine?`<td class="value">${optionalMoney(r.powderCost)}</td>`:''}<td class="value cost">${optionalMoney(r.cost)}</td><td class="value">${number(isCreatine?r.creatine:r.protein)}${(isCreatine?r.creatine:r.protein)==null?'':'%'}</td><td class="value">${number(r.scoop)}${r.scoop==null?'':' g'}</td><td class="value">${number(r.energy)}</td><td class="${/out|sold|unavailable/i.test(r.stock)?'out':'muted'}">${esc(r.stock)}</td><td><button data-id="${esc(r.id)}">View Details ↗</button></td></tr>`).join('');
    $('#page').textContent=`Page ${page} of ${pages}`;
    $('#prev').disabled=page<=1;
    $('#next').disabled=page>=pages;
  } else {
    // Flat Mode
    const pages=Math.max(1,Math.ceil(filtered.length/sizeFlat));
    page=Math.min(page,pages);
    $('#count').textContent=`${filtered.length.toLocaleString()} pack offers · ${new Set(filtered.map(identity)).size} unique items`;

    if(groupedContainer)groupedContainer.hidden=true;
    if(tableWrap)tableWrap.hidden=false;

    $('#rows').innerHTML=filtered.slice((page-1)*sizeFlat,page*sizeFlat).map(r=>`<tr><td><div class="brand">${esc(r.brand)}</div><span class="product">${esc(r.product)}</span><span class="muted">${esc(r.flavour)}${isCreatine?' · '+esc(r.packaging):''}</span>${r.isNew?' <span class="new-pill-sm">✨ New</span>':''}</td><td>${esc(r.type)}<br><span class="muted">${esc(r.subclass)}${isCreatine?'<br>'+esc(r.grade)+' · '+esc(r.formulation):''}</span></td><td><span class="badge">${isCreatine?r.grams+' g':r.kg+' kg'}</span></td><td class="value">${money(r.price)}${priceAuditFlag(r)}</td><td>${formatTrendBadge(r.trend,r.isNew)}</td>${isCreatine?`<td class="value">${optionalMoney(r.powderCost)}</td>`:''}<td class="value cost">${optionalMoney(r.cost)}</td><td class="value">${number(isCreatine?r.creatine:r.protein)}${(isCreatine?r.creatine:r.protein)==null?'':'%'}</td><td class="value">${number(r.scoop)}${r.scoop==null?'':' g'}</td><td class="value">${number(r.energy)}</td><td class="${/out|sold|unavailable/i.test(r.stock)?'out':'muted'}">${esc(r.stock)}</td><td><button data-id="${esc(r.id)}">View Details ↗</button></td></tr>`).join('');
    $('#page').textContent=`Page ${page} of ${pages}`;
    $('#prev').disabled=page<=1;
    $('#next').disabled=page>=pages;
  }

  $('#empty').hidden=filtered.length>0;
  if(!filtered.length){
    if(groupedContainer)groupedContainer.hidden=true;
    if(tableWrap)tableWrap.hidden=true;
  }

  const params=new URLSearchParams();
  for(const[k,v]of Object.entries(s)){
    if(Array.isArray(v))v.forEach(x=>params.append(k,x));
    else if(v)params.set(k,v);
  }
  if($('#sort').value!=='brand')params.set('sort',$('#sort').value);
  if(viewMode!=='grouped')params.set('view',viewMode);
  history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));
}

function reset(){
  $('#filters').reset();
  $('#sort').value='brand';
  page=1;
  render();
}

// Event Listeners
$('#filters').addEventListener('submit',e=>e.preventDefault());
$('#filters').addEventListener('input',()=>{page=1;render();});
$('#sort').onchange=()=>{page=1;render();};
$('#reset').onclick=reset;
$('#empty-reset').onclick=reset;
$('#prev').onclick=()=>{page--;render();};
$('#next').onclick=()=>{page++;render();};

const btnGrouped=$('#view-grouped');
const btnFlat=$('#view-flat');
if(btnGrouped&&btnFlat){
  btnGrouped.onclick=()=>{
    viewMode='grouped';
    btnGrouped.classList.add('active');
    btnFlat.classList.remove('active');
    btnGrouped.setAttribute('aria-pressed','true');
    btnFlat.setAttribute('aria-pressed','false');
    page=1;
    render();
  };
  btnFlat.onclick=()=>{
    viewMode='flat';
    btnFlat.classList.add('active');
    btnGrouped.classList.remove('active');
    btnFlat.setAttribute('aria-pressed','true');
    btnGrouped.setAttribute('aria-pressed','false');
    page=1;
    render();
  };
}

$('#csv').onclick=()=>{
  const url=URL.createObjectURL(new Blob([csv(filtered,category)],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');
  a.href=url;
  a.download=category+'-catalog-filtered.csv';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};

// Click delegation for tables and product cards
document.addEventListener('click',e=>{
  const groupBtn=e.target.closest('[data-group-product]');
  if(groupBtn){
    openModalForProduct(groupBtn.dataset.groupBrand, groupBtn.dataset.groupProduct);
    return;
  }
  const idBtn=e.target.closest('[data-id]');
  if(idBtn){
    openModalForOffer(idBtn.dataset.id);
  }
});

$('#close').onclick=()=>$('#evidence').close();

// Initial Data Fetch
try{
  const response=await fetch(isCreatine?'data/creatine.json':'data/catalog.json');
  if(!response.ok)throw Error('Catalog unavailable');
  const data=await response.json();
  offers=data.offers;
  $('.results').insertAdjacentHTML('afterbegin',priceAuditNotice(offers));
  $('#filters').insertAdjacentHTML('beforeend','<label>Price trend since Q3<select name="priceTrend"><option value="">All evidence states</option><option value="down">Decreased</option><option value="up">Increased</option><option value="stable">Unchanged (verified)</option><option value="unknown">No verified comparison</option></select></label>');

  $('#stats').innerHTML=`<div><strong>${new Set(offers.map(r=>r.brand)).size}</strong><span>brands tracked</span></div><div><strong>${new Set(offers.map(identity)).size}</strong><span>unique products</span></div><div><strong>${offers.length}</strong><span>pack options</span></div>`;
  $('#categorical').innerHTML=activeFacets.map(([k,label])=>`<details ${k==='brand'?'open':''}><summary>${label}</summary><div class="options">${[...new Set(offers.map(r=>String(r[k])))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(v=>`<label class="check"><input type="checkbox" name="${k}" value="${esc(v)}">${esc(v)}</label>`).join('')}</div></details>`).join('');
  $('#numeric').innerHTML=activeMetrics.map(([k,label])=>`<div class="metric"><span>${label}</span><div class="range"><input type="number" min="0" step="any" name="${k}Min" aria-label="Minimum ${label}" placeholder="Min"><input type="number" min="0" step="any" name="${k}Max" aria-label="Maximum ${label}" placeholder="Max"></div></div>`).join('');

  const params=new URLSearchParams(location.search);
  for(const el of $('#filters').elements){
    if(el.type==='checkbox')el.checked=['complete','knownCost'].includes(el.name)?params.has(el.name):params.getAll(el.name).includes(el.value);
    else if(params.has(el.name))el.value=params.get(el.name);
  }
  if([...$('#sort').options].some(o=>o.value===params.get('sort')))$('#sort').value=params.get('sort');
  if(params.get('view')==='flat'){
    viewMode='flat';
    if(btnFlat&&btnGrouped){
      btnFlat.classList.add('active');
      btnGrouped.classList.remove('active');
    }
  }
  render();
}catch(e){
  $('#count').textContent='Could not load the catalog. Please refresh to retry.';
  console.error(e);
}
