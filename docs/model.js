// Pure calculations shared by browser pages, validation, exports and the site build.
export const finite=n=>typeof n==='number'&&Number.isFinite(n);
export const positive=n=>finite(n)&&n>0;
export const isoDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export const https=s=>{try{return new URL(s).protocol==='https:';}catch{return false;}};
export const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function quarterFor(date){const year=Number(date.slice(0,4)),q=Math.floor((Number(date.slice(5,7))-1)/3)+1;return {year,q,label:`Q${q} ${year}`};}
export function previousQuarter(date){const now=quarterFor(date),q=now.q===1?4:now.q-1,year=now.q===1?now.year-1:now.year;return {year,q,label:`Q${q} ${year}`,start:`${year}-${String((q-1)*3+1).padStart(2,'0')}-01`,end:new Date(Date.UTC(year,q*3,0)).toISOString().slice(0,10)};}
export function formatDate(date){return isoDate(date)?new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z')):'Not recorded';}
export function stats(offers){return {offers:offers.length,products:new Set(offers.map(r=>JSON.stringify([r.brand,r.product]))).size,listings:new Set(offers.map(r=>JSON.stringify([r.brand,r.product,r.flavour,r.packaging||'']))).size,brands:new Set(offers.map(r=>r.brand)).size,knownCost:offers.filter(r=>r.cost!=null).length,knownEnergy:offers.filter(r=>r.energy!=null).length,knownScoop:offers.filter(r=>r.scoop!=null).length,verifiedPrices:offers.filter(r=>r.priceAudit?.status==='verified').length,verifiedTrends:offers.filter(r=>r.trend?.status==='verified').length};}
export function observationMatches(o,r,category){return o.category===category&&String(o.offerId)===String(r.id)&&o.currency==='INR'&&positive(o.price)&&isoDate(o.date)&&https(o.evidenceUrl)&&o.sourceUrl===r.url&&o.qualityStatus!=='excluded';}
function computeTrend(r,category,asOf,observations,maxAgeDays){
 const prior=previousQuarter(asOf),currentQuarter=quarterFor(asOf);
 const relevant=observations.filter(o=>observationMatches(o,r,category)&&o.date<=asOf).sort((a,b)=>b.date.localeCompare(a.date));
 const current=relevant.find(o=>o.kind==='official-live');
 const ambiguous=current&&new Set(relevant.filter(o=>o.kind==='official-live'&&o.date===current.date).map(o=>o.price)).size>1;
 const priceAge=current?Math.floor((Date.parse(asOf)-Date.parse(current.date))/86400000):null;
 const currentVerified=Boolean(current&&!ambiguous&&current.price===r.price&&priceAge<=maxAgeDays);
 const baseline=relevant.find(o=>o.date>=prior.start&&o.date<=prior.end&&o.qualityStatus==='verified');
 const comparable=Boolean(currentVerified&&baseline&&current.date>baseline.date);
 const pct=comparable?Math.round((r.price-baseline.price)/baseline.price*10000)/100:null;
 const direction=comparable?(r.price<baseline.price?'down':r.price>baseline.price?'up':'stable'):'unknown';
 const excluded=observations.find(o=>o.category===category&&String(o.offerId)===String(r.id)&&o.sourceUrl===r.url&&o.qualityStatus==='excluded'&&o.date>=prior.start&&o.date<=prior.end);
 const history=[{quarter:prior.label,date:baseline?.date??null,price:baseline?.price??null,verified:Boolean(baseline),status:baseline?'Verified listed-price snapshot':'No verified history',source:baseline?.evidenceUrl??null,qoqPct:null},{quarter:`${currentQuarter.label} as of ${formatDate(asOf)}`,date:current?.date??null,price:currentVerified?r.price:null,verified:currentVerified,status:currentVerified?'Verified listed-price snapshot':'Current price unverified',source:current?.evidenceUrl??null,qoqPct:pct}];
 const known=history.filter(h=>h.verified).map(h=>h.price);
 return {priceAudit:{status:currentVerified?'verified':current&&priceAge>maxAgeDays?'stale':'unverified',checked:current?.date??null,sourceUrl:current?.evidenceUrl??r.url,ageDays:priceAge},trend:{status:comparable?'verified':'unverified',pct,direction,prevPrice:baseline?.price??null,currentPrice:r.price,comparisonQuarter:prior.label,comparisonStart:prior.start,comparisonEnd:prior.end,currentAsOf:asOf,baselineDate:baseline?.date??null,baselineSource:baseline?.evidenceUrl??null,history,quartersTracked:known.length,lowestPrice:known.length?Math.min(...known):null,highestPrice:known.length?Math.max(...known):null,auditNote:excluded?.exclusionReason??null,twelveQuarterChangePct:null,launchQuarter:null}};
}
export function scoreProtein(r){return positive(r.cost)?100/r.cost:0;}
export function scoreCreatine(r){return positive(r.cost)?100/r.cost:0;}
export function normalizeOffer(raw,definition,asOf,observations,config){
 const category=definition.id,issues=[],r={...raw};
 const grams=category==='creatine'?raw.grams:positive(raw.kg)?raw.kg*1000:null;
 r.grams=positive(grams)?grams:null;r.kg=r.grams==null?null:r.grams/1000;
 r.price=positive(raw.price)?raw.price:null;
 if(r.price==null)issues.push({severity:'error',field:'price',message:'Price must be a positive INR number.'});
 if(r.grams==null)issues.push({severity:'error',field:'weight',message:'A positive net pack weight is required.'});
 if(positive(raw.kg)&&positive(raw.grams)&&Math.abs(raw.kg*1000-raw.grams)>.001)issues.push({severity:'error',field:'weight',message:'kg and gram weights disagree.'});
 for(const key of [definition.concentrationField,'scoop','serving','creatineServing','energy']){
  const value=raw[key];const valid=value==null||(finite(value)&&(key==='energy'?value>=0:value>0)&&(key!==definition.concentrationField||value<=100));
  r[key]=valid?(value??null):null;
  if(!valid)issues.push({severity:'error',field:key,message:'Invalid value or units; use null for unknown.'});
 }
 for(const field of ['brand','product','flavour','type','subclass'])if(typeof raw[field]!=='string'||!raw[field].trim())issues.push({severity:'error',field,message:'A non-empty label is required.'});
 if(raw.id==null||!['string','number'].includes(typeof raw.id)||!String(raw.id).trim()||(typeof raw.id==='number'&&!finite(raw.id)))issues.push({severity:'error',field:'id',message:'Stable offer ID is required.'});
 if(!https(raw.url))issues.push({severity:'error',field:'url',message:'HTTPS official product source is required.'});
 if(raw.nutritionUrl&&!https(raw.nutritionUrl))issues.push({severity:'error',field:'nutritionUrl',message:'Nutrition sources must use HTTPS.'});
 if(!['In stock','Out of stock','Unknown','Unavailable','Sold out','Listed; confirm stock'].includes(raw.stock))issues.push({severity:'warning',field:'stock',message:'Availability is not a recognized in-stock status; excluded from rankings.'});
 if(r.scoop!=null&&r.grams!=null&&r.scoop>r.grams)issues.push({severity:'error',field:'scoop',message:'Scoop weight exceeds net pack weight.'});
 if(r.energy!=null&&r.energy>900)issues.push({severity:'error',field:'energy',message:'Energy must be kcal per 100 g, at most 900.'});
 const concentration=r[definition.concentrationField];
 r.cost=r.price!=null&&r.grams!=null&&concentration!=null?r.price/(r.grams*concentration/100):null;
 r.powderCost=r.price!=null&&r.grams!=null?r.price/r.grams:null;
 r.referenceCost=r.cost==null?null:r.cost*definition.referenceGrams;
 r.referenceGrams=definition.referenceGrams;r.compoundLabel=definition.compoundLabel;
 r.doseCost=category==='creatine'?r.referenceCost:null;
 r.proteinPerScoop=category==='protein'&&concentration!=null&&r.scoop!=null?concentration*r.scoop/100:null;
 r.category=category;r.checked=asOf;
 Object.assign(r,computeTrend(r,category,asOf,observations,config.maxPriceAgeDays));
 r.score=category==='protein'?scoreProtein(r):scoreCreatine(r);
 r.rankingEligible=r.priceAudit.status==='verified'&&r.stock==='In stock'&&r.cost!=null&&!issues.some(i=>i.severity==='error');
 if(r[definition.concentrationField]==null)issues.push({severity:'warning',field:definition.concentrationField,message:'Concentration unknown; compound cost and ranking excluded.'});
 if(r.energy==null)issues.push({severity:'warning',field:'energy',message:'Calories unknown; no default substituted.'});
 if(r.priceAudit.status!=='verified')issues.push({severity:'warning',field:'priceEvidence',message:'Current price lacks matching recent verified evidence.'});
 if(/conflict|differs|indicative|family|rounding|across.*sizes/i.test(raw.notes+' '+raw.basis))issues.push({severity:'warning',field:'nutritionEvidence',message:'Review the brand claim, shared label or conflicting values in the notes.'});
 r.quality={issues,errors:issues.filter(i=>i.severity==='error').length,warnings:issues.filter(i=>i.severity==='warning').length};
 return r;
}
export function createSnapshot(bundle){
 const {config,brands,categories,observations}=bundle;
 if(config?.schemaVersion!==1||!Array.isArray(config.categories)||!config.categories.length)throw Error('Unsupported or missing dataset configuration.');
 if(!positive(config.rankingLimit)||!positive(config.maxPriceAgeDays)||!positive(config.refreshIntervalMs))throw Error('Invalid display or freshness settings.');
 if(config.currency!=='INR'||!https(config.baseUrl)||!config.baseUrl.endsWith('/')||!config.name?.trim())throw Error('INR currency, site name and HTTPS base URL ending in / are required.');
 if(!Array.isArray(config.quickPicks)||config.quickPicks.some(r=>!config.categories.some(c=>c.id===r.category)||!Array.isArray(r.typeIncludes)||!r.typeIncludes.every(s=>typeof s==='string')))throw Error('Invalid quick-comparison rules.');
 if(!Array.isArray(observations))throw Error('Missing dated observation ledger.');
 const result={},errors=[],warnings=[];
 const categoryIds=config.categories.map(c=>c.id);
 if(new Set(categoryIds).size!==categoryIds.length)throw Error('Duplicate category ID.');
 if(!positive(config.pageSizes?.flat)||!positive(config.pageSizes?.grouped))throw Error('Positive pagination sizes are required.');
 if(![config.rankingLimit,config.pageSizes.flat,config.pageSizes.grouped].every(Number.isInteger))throw Error('Ranking and pagination limits must be integers.');
 for(const o of observations){
  if(o.qualityStatus==='excluded')continue;
  if(!categoryIds.includes(o.category)||o.offerId==null||!isoDate(o.date)||!positive(o.price)||o.currency!==config.currency||!https(o.sourceUrl)||!https(o.evidenceUrl)||!['official-live','official-archive'].includes(o.kind))errors.push({category:o.category,id:o.offerId,severity:'error',field:'observation',message:'Invalid dated observation, currency, price or source URL.'});
 }
 for(const definition of config.categories){
  if(!['protein','creatine'].includes(definition.concentrationField)||!definition.id?.match(/^[a-z][a-z0-9-]*$/)||!definition.label?.trim()||!definition.compoundLabel?.trim())throw Error('Category needs valid labels, ID and concentration field.');
  const input=categories[definition.id];if(!input||!Array.isArray(input.offers)||!isoDate(input.checked))throw Error(`Category ${definition.id} needs offers and an ISO checked date.`);
  if(!positive(definition.referenceGrams))throw Error(`Invalid reference quantity for ${definition.id}.`);
  const ids=new Set(),variants=new Set();
  const offers=input.offers.map(raw=>{
   const r=normalizeOffer(raw,definition,input.checked,observations,config);
   if(ids.has(String(r.id))){r.quality.issues.push({severity:'error',field:'id',message:'Duplicate offer ID.'});r.quality.errors++;r.rankingEligible=false;}ids.add(String(r.id));
   const variant=JSON.stringify([r.brand,r.product,r.flavour,r.grams,r.packaging||'']);
   if(variants.has(variant)){r.quality.issues.push({severity:'error',field:'variant',message:'Duplicate exact pack variant.'});r.quality.errors++;r.rankingEligible=false;}variants.add(variant);
   for(const issue of r.quality.issues)(issue.severity==='error'?errors:warnings).push({category:definition.id,id:r.id,...issue});return r;
  });
  result[definition.id]={...definition,asOf:input.checked,previousQuarter:previousQuarter(input.checked),offers,stats:stats(offers)};
 }
 const all=Object.values(result).flatMap(c=>c.offers),dates=Object.values(result).map(c=>c.asOf).sort();
 return {config,brands:brands||{},categories:result,observations,asOf:dates.at(-1),stats:stats(all),quality:{errors,warnings},assets:bundle.assets||{}};
}
export function rankedOffers(category,limit=10,predicate=()=>true){
 const best=new Map();for(const r of category.offers.filter(r=>r.rankingEligible&&predicate(r))){const key=JSON.stringify([r.brand,r.product]);if(!best.has(key)||r.score>best.get(key).score)best.set(key,r);}
 return [...best.values()].sort((a,b)=>b.score-a.score||a.brand.localeCompare(b.brand)||String(a.id).localeCompare(String(b.id))).slice(0,limit);
}
export function quickPick(snapshot,rule){
 const c=snapshot.categories[rule.category];if(!c)return null;
 const fits=r=>rule.typeIncludes.some(t=>r.type.toLowerCase().includes(t))&&(rule.unflavoured==null||/unflavou?red/i.test(r.flavour)===rule.unflavoured);
 const eligible=c.offers.filter(r=>r.rankingEligible&&fits(r)).sort((a,b)=>a.referenceCost-b.referenceCost);
 return eligible.length?{...rule,offer:eligible[0],count:eligible.length,min:eligible[0].referenceCost,max:eligible.at(-1).referenceCost,referenceGrams:c.referenceGrams,compoundLabel:c.compoundLabel}:null;
}
export function auditRows(snapshot){return Object.values(snapshot.categories).flatMap(c=>c.offers.map(r=>({category:c.id,offerId:r.id,brand:r.brand,product:r.product,flavour:r.flavour,packGrams:r.grams,currentPrice:r.price,currentStatus:r.priceAudit.status,currentChecked:r.priceAudit.checked,baselinePrice:r.trend.prevPrice,baselineDate:r.trend.baselineDate,changePct:r.trend.pct,direction:r.trend.direction,baselineSource:r.trend.baselineSource,currentSource:r.priceAudit.sourceUrl,historyAuditNote:r.trend.auditNote})));}
export function pageMetadata(snapshot,categoryId){
 const c=snapshot.categories[categoryId],s=c?.stats||snapshot.stats,page=c?.page||'index.html';
 const title=`${c?c.label+' catalog':snapshot.config.name} · ${s.offers.toLocaleString(snapshot.config.locale)} pack offers`;
 const description=`Compare ${s.offers.toLocaleString(snapshot.config.locale)} ${c?c.label.toLowerCase()+' ':''}pack offers across ${s.brands} brands. Dated sources, calculated compound costs and data quality coverage. Dataset as of ${c?.asOf||snapshot.asOf}.`;
 const structured={'@context':'https://schema.org','@type':'Dataset',name:title,description,dateModified:c?.asOf||snapshot.asOf,url:snapshot.config.baseUrl+(page==='index.html'?'':page),distribution:snapshot.config.categories.filter(k=>!c||k.id===c.id).map(k=>({'@type':'DataDownload',encodingFormat:'application/json',contentUrl:snapshot.config.baseUrl+'data/'+k.file}))};
 return {title,description,structured};
}
