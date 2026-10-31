import {unitFacets,unitMetrics,completeUnitLabel} from './units.js';
export const facets = [['brand','Brand'],['product','Product'],['type','Protein source'],['subclass','Protein subclass'],['flavour','Flavour'],['kg','Pack size (kg)'],['stock','Availability']];
export const metrics = [['price','Pack price (₹)'],['cost','Cost / g protein (₹)'],['protein','Protein (%)'],['scoop','Scoop size (g)'],['energy','Energy (kcal / 100 g)']];
export const creatineFacets=[['brand','Brand'],['product','Product'],['type','Creatine chemical form'],['subclass','Processing / particle size'],['grade','Ingredient trademark'],['formulation','Formulation'],['flavour','Flavour'],['grams','Pack size (g)'],['packaging','Packaging'],['stock','Availability']];
export const creatineMetrics=[['price','Pack price (₹)'],['powderCost','Cost / g powder (₹)'],['cost','Cost / g compound (₹)'],['doseCost','Cost / 3 g compound (₹)'],['creatine','Labelled compound (%)'],['scoop','Scoop size (g)'],['energy','Energy (kcal / 100 g)']];
export function filterOffers(offers,state,category='protein',definition=null){const activeFacets=definition?.measurement==='units'?unitFacets(definition):category==='creatine'?creatineFacets:facets,activeMetrics=definition?.measurement==='units'?unitMetrics(definition):category==='creatine'?creatineMetrics:metrics;return offers.filter(r=>{
 if(state.historyQuarter&&!r.trend?.history?.some(h=>!h.isCurrent&&h.quarter===state.historyQuarter&&h.verified))return false;
 if(state.historyCoverage==='any'&&!(r.trend?.completedQuartersTracked>0))return false;
 if(state.historyCoverage==='full'&&!r.trend?.fullHistoryVerified)return false;
 if(state.historyCoverage==='none'&&r.trend?.completedQuartersTracked>0)return false;
 if(state.priceTrend && (r.trend?.status==='verified'?r.trend.direction:'unknown')!==state.priceTrend)return false;
 if(state.q && ![r.brand,r.product,r.flavour,r.type,r.subclass,r.grade,r.formulation,r.source,r.form].join(' ').toLowerCase().includes(state.q.toLowerCase()))return false;
 for(const [key] of activeFacets)if(state[key]?.length&&!state[key].includes(String(r[key])))return false;
 for(const [key] of activeMetrics){const min=state[key+'Min'],max=state[key+'Max'];if(min!==undefined&&min!==''&&(r[key]==null||r[key]<Number(min)))return false;if(max!==undefined&&max!==''&&(r[key]==null||r[key]>Number(max)))return false;}
 if(state.knownCost&&r.cost==null)return false;
 return !state.complete || (definition?.measurement==='units'?completeUnitLabel(r,definition):(category==='creatine'?['creatine','scoop','energy']:['protein','scoop','energy']).every(k=>r[k]!=null));
 });}
export function sortOffers(offers,key){return [...offers].sort((a,b)=>{if(key==='brand')return a.brand.localeCompare(b.brand)||a.product.localeCompare(b.product)||a.flavour.localeCompare(b.flavour)||a.kg-b.kg;if(a[key]==null)return b[key]==null?0:1;if(b[key]==null)return -1;return (a[key]-b[key])*(key==='protein'||key==='creatine'?-1:1);});}
export function csv(offers,category='protein'){
 const keys=category==='creatine'?['brand','product','type','subclass','grade','formulation','flavour','grams','packaging','price','powderCost','cost','doseCost','creatine','scoop','serving','creatineServing','energy','stock','checked','url','nutritionUrl','basis','notes']:['brand','product','type','subclass','flavour','kg','price','cost','protein','scoop','energy','stock','url','nutritionUrl','basis','notes'];
 keys.unshift('id','category');
 for(const key of ['checked','grams','referenceCost','referenceGrams','compoundLabel','proteinPerScoop'])if(!keys.includes(key))keys.push(key);
 keys.push('historyWindowQuarters','completedQuartersTracked','fullHistoryVerified','endpointQuarter','endpointChangePct');
 keys.push('currentPriceStatus','quarterComparisonStatus','baselinePrice','baselineDate','changePct','direction','baselineSource','currentPriceSource');
 const rows=offers.map(r=>({...r,historyWindowQuarters:r.trend?.historyWindowQuarters,completedQuartersTracked:r.trend?.completedQuartersTracked,fullHistoryVerified:r.trend?.fullHistoryVerified,endpointQuarter:r.trend?.endpointQuarter,endpointChangePct:r.trend?.endpointChangePct,currentPriceStatus:r.priceAudit?.status,quarterComparisonStatus:r.trend?.status,baselinePrice:r.trend?.prevPrice,baselineDate:r.trend?.baselineDate,changePct:r.trend?.pct,direction:r.trend?.direction,baselineSource:r.trend?.baselineSource,currentPriceSource:r.priceAudit?.sourceUrl}));
 return '\uFEFF'+[keys,...rows.map(r=>keys.map(k=>r[k]??''))].map(row=>row.map(x=>'"'+(typeof x==='string'?x.replace(/^[=+@-]/,"'$&"):String(x)).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
export {scoreProtein,scoreCreatine} from './model.js';

export function groupOffersByProduct(offers, category='protein'){
  const groups = new Map();
  for(const r of offers){
    const key = [r.brand, r.product].join(' — ');
    if(!groups.has(key)){
      groups.set(key, {
        key,
        brand: r.brand,
        product: r.product,
        type: r.type,
        subclass: r.subclass,
        grade: r.grade,
        formulation: r.formulation,
        protein: r.protein,
        creatine: r.creatine,
        energy: r.energy,
        scoop: r.scoop,
        serving: r.serving,
        creatineServing: r.creatineServing,
        nutritionUrl: r.nutritionUrl,
        variations: []
      });
    }
    groups.get(key).variations.push(r);
  }
  const result = [];
  for(const g of groups.values()){
    const vars = g.variations;
    vars.sort((a,b) => (a.packCount ?? a.kg ?? a.grams) - (b.packCount ?? b.kg ?? b.grams) || a.flavour.localeCompare(b.flavour));
    const prices = vars.map(v => v.price);
    const costs = vars.filter(v => v.cost != null).map(v => v.cost);
    const weights = [...new Set(vars.map(v => category === 'creatine' ? v.grams + ' g' : v.kg + ' kg'))];
    const flavours = [...new Set(vars.map(v => v.flavour))];
    const hasNew = vars.some(v => v.isNew);
    const trends = vars.filter(v => v.trend?.status === 'verified' && Number.isFinite(v.trend.pct)).map(v => v.trend.pct);
    let avgTrend = null;
    if(trends.length > 0){
      avgTrend = Math.round((trends.reduce((a,b) => a + b, 0) / trends.length) * 10) / 10;
    }
    const t12List = vars.filter(v => v.trend && v.trend.twelveQuarterChangePct != null).map(v => v.trend.twelveQuarterChangePct);
    let avg12QTrend = null;
    if(t12List.length > 0){
      avg12QTrend = Math.round((t12List.reduce((a,b) => a + b, 0) / t12List.length) * 10) / 10;
    }
    result.push({
      ...g,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      minCost: costs.length ? Math.min(...costs) : null,
      maxCost: costs.length ? Math.max(...costs) : null,
      weights,
      flavours,
      hasNew,
      avgTrend,
      trendSummary: summarizeTrends(vars.map(v=>v.trend)),
      avg12QTrend,
      count: vars.length
    });
  }
  return result;
}

export function formatTrendBadge(trend, isNew){
  if(trend?.status==='partial')return `<span class="trend-badge trend-mixed">${trend.verifiedCount}/${trend.total} variants verified</span>`;
  if(trend?.status==='mixed')return '<span class="trend-badge trend-mixed">↕ Mixed variant changes</span>';
  if(trend?.status!=='verified'||!Number.isFinite(trend.pct))return '<span class="trend-badge trend-unknown" title="No verified adjacent-quarter comparison. Other dated history may be available.">? QoQ unverified</span>';
  const n=trend.pct===0&&trend.direction!=='stable'?'&lt;0.01':Math.abs(trend.pct).toLocaleString('en-IN',{maximumFractionDigits:2});
  const title='Compared with a dated official-store observation from the previous completed quarter; not a quarterly average.';
  if(trend.direction==='down')return `<span class="trend-badge trend-down" title="${title}">▼ ${n}%</span>`;
  if(trend.direction==='up')return `<span class="trend-badge trend-up" title="${title}">▲ +${n}%</span>`;
  return `<span class="trend-badge trend-stable" title="${title}">─ Unchanged 0%</span>`;
}

export function summarizeTrends(trends){
 const valid=trends.filter(t=>t?.status==='verified'&&Number.isFinite(t.pct));
 if(!valid.length)return {status:'unverified',pct:null,direction:'unknown',verifiedCount:0,total:trends.length};
 if(valid.length!==trends.length)return {status:'partial',pct:null,direction:'mixed',verifiedCount:valid.length,total:trends.length};
 const directions=new Set(valid.map(t=>t.direction));
 if(directions.size>1)return {status:'mixed',pct:null,direction:'mixed',verifiedCount:valid.length,total:trends.length};
 return {status:'verified',pct:Math.round(valid.reduce((n,t)=>n+t.pct,0)/valid.length*100)/100,direction:valid[0].direction,verifiedCount:valid.length,total:trends.length};
}

export function priceAuditFlag(offer){return offer.priceAudit?.status==='verified'?'':'<span class="price-unverified" title="No matching recent dated observation verifies this catalog price. Open details for the evidence date.">Price unverified</span>';}

