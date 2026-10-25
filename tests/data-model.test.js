import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createSnapshot,previousQuarter,completedQuarters,historyRows,rankedOffers,quickPick} from '../docs/model.js';
import {filterOffers,sortOffers,csv,groupOffersByProduct,formatTrendBadge,summarizeTrends} from '../docs/core.js';
import {createDataStore} from '../docs/data-store.js';
import {loadBundle,buildSite} from '../scripts/build_site.mjs';
const config={schemaVersion:1,name:'Test research',baseUrl:'https://test.example/',quickPicks:[],locale:'en-IN',currency:'INR',rankingLimit:10,refreshIntervalMs:60000,maxPriceAgeDays:100,pageSizes:{flat:40,grouped:15},categories:[{id:'protein',label:'Protein',concentrationField:'protein',compoundLabel:'protein',referenceGrams:24},{id:'creatine',label:'Creatine',concentrationField:'creatine',compoundLabel:'compound',referenceGrams:3}]};
const protein={id:'p1',brand:'Brand',product:'Whey',flavour:'Vanilla',type:'Whey',subclass:'Concentrate',kg:1,price:1600,protein:80,scoop:30,energy:null,stock:'In stock',url:'https://brand.example/whey'};
const creatine={id:'c1',brand:'Other brand',product:'Creatine',flavour:'Unflavoured',type:'Monohydrate',subclass:'Micronized',grams:250,price:500,creatine:100,scoop:null,energy:0,stock:'In stock',url:'https://other.example/creatine'};
const observation=(category,r,date,price,kind='official-live')=>({category,offerId:r.id,date,price,currency:'INR',sourceUrl:r.url,evidenceUrl:`https://evidence.example/${category}/${date}`,kind,qualityStatus:'verified'});
function fixture(){return {config:structuredClone(config),categories:{protein:{checked:'2026-10-25',offers:[structuredClone(protein)]},creatine:{checked:'2026-10-25',offers:[structuredClone(creatine)]}},observations:[observation('protein',protein,'2026-10-25',1600),observation('protein',protein,'2026-09-20',2000,'official-archive'),observation('creatine',creatine,'2026-10-25',500)],brands:{}};}
const offer=b=>createSnapshot(b).categories.protein.offers[0];
test('raw price, weight and concentration recalculate costs, portions, scores and trends; legacy derived fields are ignored',()=>{
 const b=fixture();Object.assign(b.categories.protein.offers[0],{cost:999,score:999,referenceCost:999,trend:{pct:999,direction:'up'}});
 const r=offer(b);assert.equal(r.cost,2);assert.equal(r.referenceCost,48);assert.equal(r.score,50);assert.equal(r.proteinPerScoop,24);assert.equal(r.trend.pct,-20);assert.equal(r.energy,null);assert.equal(r.rankingEligible,true);
 b.categories.protein.offers[0].price=2400;b.observations[0].price=2400;assert.equal(offer(b).cost,3);assert.equal(offer(b).referenceCost,72);assert.equal(offer(b).trend.pct,20);
 b.categories.protein.offers[0].kg=2;assert.equal(offer(b).cost,1.5);b.categories.protein.offers[0].protein=40;assert.equal(offer(b).cost,3);
});
test('new offers, brands, flavours and ranking order respond to data-only changes',()=>{
 const b=fixture(),r={...protein,id:'p2',brand:'New brand',flavour:'Chocolate',price:800};b.categories.protein.offers.push(r);b.observations.push(observation('protein',r,'2026-10-25',800));
 const s=createSnapshot(b);assert.equal(s.stats.offers,3);assert.equal(s.stats.brands,3);assert.equal(s.categories.protein.stats.listings,2);assert.equal(rankedOffers(s.categories.protein)[0].id,'p2');
 assert.equal(quickPick(s,{category:'protein',typeIncludes:['whey'],unflavoured:false}).min,24);
 b.categories.protein.offers[1].stock='Out of stock';assert.equal(rankedOffers(createSnapshot(b).categories.protein)[0].id,'p1');
});
test('unknown concentration stays unknown; zero calories remain zero; no energy assumptions affect ranking',()=>{
 const b=fixture();b.categories.protein.offers[0].protein=null;const r=offer(b);assert.equal(r.cost,null);assert.equal(r.referenceCost,null);assert.equal(r.score,0);assert.equal(r.rankingEligible,false);assert.equal(r.energy,null);
 const c=createSnapshot(b).categories.creatine.offers[0];assert.equal(c.energy,0);assert.equal(c.cost,2);assert.equal(c.doseCost,6);assert.equal(c.scoop,null);
});
test('new quarter including year rollover changes comparison window without UI edits',()=>{
 assert.deepEqual(previousQuarter('2027-01-15'),{year:2026,q:4,label:'Q4 2026',start:'2026-10-01',end:'2026-12-31'});
 assert.equal(previousQuarter('2028-04-01').end,'2028-03-31');
 const b=fixture();b.categories.protein.checked='2027-01-25';b.observations.push(observation('protein',protein,'2027-01-25',1600),observation('protein',protein,'2026-10-25',1600,'official-archive'));const r=offer(b);assert.equal(r.trend.comparisonQuarter,'Q4 2026');assert.equal(r.trend.baselineDate,'2026-10-25');assert.equal(r.trend.direction,'stable');
});
test('history contains twelve completed quarters plus a separate current observation, with no invented launch dates',()=>{
 const periods=completedQuarters('2026-10-25',12);assert.equal(periods.length,12);assert.deepEqual(periods[0],{year:2023,q:4,label:'Q4 2023',start:'2023-10-01',end:'2023-12-31'});assert.equal(periods.at(-1).label,'Q3 2026');assert.equal(periods.at(-1).end,'2026-09-30');
 const r=offer(fixture());assert.equal(r.trend.history.length,13);assert.equal(r.trend.history.filter(h=>h.isCurrent).length,1);assert.equal(r.trend.history.at(-1).isCurrent,true);assert.equal(r.trend.completedQuartersTracked,1);assert.equal(r.trend.history[0].price,null);assert.equal(r.trend.launchQuarter,null);
 const rollover=completedQuarters('2027-01-01');assert.equal(rollover[0].label,'Q1 2024');assert.equal(rollover.at(-1).label,'Q4 2026');
});
test('adjacent quarter changes stop at missing data; endpoint change never implies complete intervening history',()=>{
 const b=fixture(),periods=completedQuarters('2026-10-25');b.observations=b.observations.filter(o=>o.kind!=='official-archive');
 for(const [i,q] of periods.entries())b.observations.push(observation('protein',protein,q.end,1000+i*100,'official-archive'));
 let r=offer(b);assert.equal(r.trend.completedQuartersTracked,12);assert.equal(r.trend.history[1].qoqPct,10);assert.equal(r.trend.endpointChangePct,60);assert.equal(r.trend.twelveQuarterChangePct,60);assert.equal(r.trend.fullHistoryVerified,true);
 b.observations=b.observations.filter(o=>o.date!==periods[4].end);r=offer(b);assert.equal(r.trend.history[4].price,null);assert.equal(r.trend.history[4].qoqPct,null);assert.equal(r.trend.history[5].qoqPct,null);assert.notEqual(r.trend.history[6].qoqPct,null);assert.equal(r.trend.completedQuartersTracked,11);assert.equal(r.trend.fullHistoryVerified,false);assert.equal(r.trend.twelveQuarterChangePct,null);assert.equal(r.trend.endpointChangePct,60);
 b.observations=b.observations.filter(o=>o.date!==periods[0].end);assert.equal(offer(b).trend.endpointChangePct,null);
});
test('conflicting historical quotes are withheld and current-quarter prices cannot be borrowed from an older quarter',()=>{
 const b=fixture();b.observations.push(observation('protein',protein,'2026-09-20',2100,'official-archive'));const r=offer(b);assert.equal(r.trend.history.at(-2).verified,false);assert.equal(r.trend.pct,null);assert.match(r.trend.history.at(-2).auditNote,/Different prices/);
 const c=fixture();c.observations[0].date='2026-09-25';assert.equal(offer(c).priceAudit.status,'stale');assert.equal(offer(c).trend.history.at(-1).price,null);
});
test('past live quotes are not promoted to historical evidence and archive dates must match public capture timestamps',()=>{
 const b=fixture();b.observations[1].kind='official-live';assert.equal(offer(b).trend.history.at(-2).verified,false);
 const c=fixture();c.observations[1].evidenceUrl='https://web.archive.org/web/20240615104145id_/https://brand.example/whey';assert.ok(createSnapshot(c).quality.errors.some(e=>e.field==='observationDate'));
});
test('long-format history export preserves every missing quarter, exact-variant identity and source',()=>{
 const s=createSnapshot(fixture()),rows=historyRows(s);assert.equal(rows.length,s.stats.offers*13);assert.equal(rows.filter(r=>r.isCurrent).length,s.stats.offers);assert.equal(rows.filter(r=>!r.isCurrent).length,s.stats.historicalSlots);assert.equal(s.stats.historicalVerified,1);assert.equal(s.stats.fullHistoryOffers,0);assert.ok(rows.some(r=>r.price===null&&r.source===null&&r.quarter==='Q4 2023'));assert.ok(rows.filter(r=>r.verified).every(r=>r.source.startsWith('https://')));
});
test('historical quarter and coverage filters select exact offers without confusing missing data with verified history',()=>{
 const b=fixture(),missing={...protein,id:'missing',brand:'No history'};b.categories.protein.offers.push(missing);const rows=createSnapshot(b).categories.protein.offers;
 assert.equal(filterOffers(rows,{historyQuarter:'Q3 2026'})[0].id,'p1');assert.equal(filterOffers(rows,{historyQuarter:'Q4 2023'}).length,0);assert.equal(filterOffers(rows,{historyCoverage:'any'}).length,1);assert.equal(filterOffers(rows,{historyCoverage:'none'})[0].id,'missing');assert.equal(filterOffers(rows,{historyCoverage:'full'}).length,0);
});
test('missing, excluded, wrong-variant, conflicting and stale observations cannot verify a price or manufacture trends',()=>{
 for(const mutate of [b=>b.observations=[],b=>b.observations[0].sourceUrl='https://brand.example/different',b=>b.observations[0].offerId='different',b=>b.observations[0].qualityStatus='excluded',b=>b.categories.protein.checked='2027-09-01',b=>b.observations.push(observation('protein',protein,'2026-10-25',1900))]){
  const b=fixture();mutate(b);const r=offer(b);assert.notEqual(r.priceAudit.status,'verified');assert.equal(r.trend.pct,null);assert.equal(r.rankingEligible,false);
 }
 const b=fixture();b.observations[1].qualityStatus='excluded';b.observations[1].exclusionReason='Wrong flavour';const r=offer(b);assert.equal(r.trend.prevPrice,null);assert.equal(r.trend.auditNote,'Wrong flavour');assert.match(formatTrendBadge(r.trend),/QoQ unverified/);
});
test('invalid units, unsafe URLs, impossible values, malformed observations and duplicate IDs fail validation',()=>{
 for(const patch of [{price:-1},{price:'1600'},{kg:0},{kg:1,grams:500},{protein:101},{energy:-1},{energy:950},{scoop:1100},{url:'javascript:alert(1)'},{nutritionUrl:'http://insecure.example'},{id:null}]){
  const b=fixture();Object.assign(b.categories.protein.offers[0],patch);assert.ok(createSnapshot(b).quality.errors.length,JSON.stringify(patch));
 }
 const b=fixture();b.categories.protein.offers.push({...protein});assert.ok(createSnapshot(b).quality.errors.some(e=>e.message.includes('Duplicate')));
 const c=fixture();c.observations[0].currency='USD';assert.ok(createSnapshot(c).quality.errors.some(e=>e.field==='observation'));
});
test('filters combine exact variants and ranges while retaining unknowns only when unconstrained',()=>{
 const s=createSnapshot(fixture()),rows=s.categories.protein.offers;
 assert.equal(filterOffers(rows,{brand:['Brand'],kg:['1'],q:'Vanilla',costMax:2}).length,1);
 assert.equal(filterOffers(rows,{energyMax:500}).length,0);assert.equal(filterOffers(rows,{complete:true}).length,0);assert.equal(filterOffers(rows,{}).length,rows.length);
 assert.equal(filterOffers(rows,{priceTrend:'down'}).length,1);assert.equal(filterOffers(rows,{priceTrend:'stable'}).length,0);
 const cr=s.categories.creatine.offers;assert.equal(filterOffers(cr,{grams:['250'],type:['Monohydrate'],knownCost:true},'creatine').length,1);
 assert.deepEqual(sortOffers([{cost:null},{cost:3},{cost:1}],'cost').map(r=>r.cost),[1,3,null]);
});
test('group summaries disclose partial and opposing histories and verified zero changes',()=>{
 const down={status:'verified',pct:-10,direction:'down'},up={status:'verified',pct:10,direction:'up'},zero={status:'verified',pct:0,direction:'stable'};
 assert.equal(summarizeTrends([down,up]).status,'mixed');assert.equal(summarizeTrends([down,{}]).status,'partial');assert.equal(summarizeTrends([zero,zero]).direction,'stable');assert.match(formatTrendBadge(zero),/Unchanged 0%/);assert.match(formatTrendBadge({pct:0,direction:'stable'}),/QoQ unverified/);
 const g=groupOffersByProduct(createSnapshot(fixture()).categories.protein.offers);assert.equal(g[0].trendSummary.total,g[0].count);
});
test('CSV exports normalized costs, source evidence and nulls, and escapes spreadsheet formulas',()=>{
 const s=createSnapshot(fixture()),out=csv([{...s.categories.protein.offers[0],brand:'=1+1',product:'A "test"'}]);assert.ok(out.includes('"\'=1+1"'));assert.ok(out.includes('"A ""test"""'));assert.ok(out.includes('baselineSource'));assert.ok(out.includes('https://evidence.example/'));
 const cr=csv(s.categories.creatine.offers,'creatine');assert.ok(cr.includes('"creatineServing"'));assert.ok(cr.includes('"powderCost"'));assert.ok(!cr.split('\r\n')[0].includes('"protein"'));
 assert.ok(out.includes('"-20"'));assert.ok(!out.includes('"\'-20"'));
});
test('production dataset validates without hardcoded counts, supports arbitrary future packs and has evidence-backed trends',async()=>{
 const b=await loadBundle(),s=createSnapshot(b);assert.deepEqual(s.quality.errors,[]);assert.equal(s.stats.offers,Object.values(b.categories).reduce((n,c)=>n+c.offers.length,0));
 for(const c of Object.values(s.categories))for(const r of c.offers){
  if(r.cost!=null)assert.ok(Math.abs(r.cost-r.price/(r.grams*r[c.concentrationField]/100))<1e-9);
  if(r.trend.status==='verified'){assert.ok(r.trend.baselineDate>=c.previousQuarter.start&&r.trend.baselineDate<=c.previousQuarter.end);assert.equal(r.trend.pct,Math.round((r.price-r.trend.prevPrice)/r.trend.prevPrice*10000)/100);assert.ok(b.observations.some(o=>o.category===c.id&&o.offerId===r.id&&o.price===r.trend.prevPrice&&o.evidenceUrl===r.trend.baselineSource&&o.qualityStatus!=='excluded'));}
 }
});
test('build publishes content-addressed snapshot, computed downloads and dataset-driven SEO',async()=>{
 const destination=await fs.mkdtemp(path.join(os.tmpdir(),'supplement-build-'));try{
  const {snapshot:s,hash,assetVersion}=await buildSite(destination),pointer=JSON.parse(await fs.readFile(path.join(destination,'data/version.json'),'utf8')),raw=await fs.readFile(path.join(destination,'data',pointer.file),'utf8');
  assert.equal(createHash('sha256').update(raw).digest('hex'),hash);assert.equal(pointer.version,hash);
  const html=await fs.readFile(path.join(destination,'protein.html'),'utf8');assert.ok(html.includes(`${s.categories.protein.stats.offers.toLocaleString('en-IN')} pack offers`));assert.ok(html.includes('application/ld+json'));assert.ok(!html.includes('DATA_METADATA'));
  const download=JSON.parse(await fs.readFile(path.join(destination,'data/catalog.json'),'utf8'));assert.equal(download.offers[0].cost,s.categories.protein.offers[0].cost);
  const history=JSON.parse(await fs.readFile(path.join(destination,'data/price-history.json'),'utf8'));assert.equal(history.rows.length,s.stats.offers*(s.config.historyQuarters+1));assert.equal(history.completedQuarters,12);
  assert.ok(html.includes(`data-ui.css?v=${assetVersion}`));assert.ok(html.includes(`site.js?v=${assetVersion}`));
  for(const file of ['site.js','core.js','data-store.js']){const js=await fs.readFile(path.join(destination,file),'utf8');assert.ok(js.includes(`./model.js?v=${assetVersion}`));assert.ok(!js.includes("from './model.js'"));}
 }finally{await fs.rm(destination,{recursive:true,force:true});}
});
test('client swaps whole validated revisions, avoids unchanged downloads, rejects corrupt updates and retains last good data',async()=>{
 let bundle=fixture(),version,raw,fail=false,downloads=0;const statuses=[];
 const prepare=()=>{raw=JSON.stringify(bundle);version=createHash('sha256').update(raw).digest('hex');};prepare();
 const fetcher=async url=>{if(fail)throw Error('Network unavailable');if(String(url).includes('version.json'))return {ok:true,json:async()=>({schemaVersion:1,version,file:`snapshot.${version}.json`})};downloads++;return {ok:true,text:async()=>raw};};
 const store=createDataStore({fetcher,baseUrl:new URL('https://test.example/data/')} );store.subscribe((s,status)=>statuses.push(status));await store.refresh();const first=store.current;await store.refresh();assert.equal(downloads,1);
 bundle.categories.protein.offers[0].price=800;bundle.observations[0].price=800;prepare();await store.refresh();assert.notEqual(store.current,first);assert.equal(store.current.categories.protein.offers[0].referenceCost,24);
 const good=store.current;raw='corrupt';version='a'.repeat(64);await store.refresh();assert.equal(store.current,good);assert.equal(statuses.at(-1).state,'error');
 bundle.categories.protein.offers[0].protein=900;prepare();await store.refresh();assert.equal(store.current,good);assert.equal(statuses.at(-1).state,'error');
 fail=true;await store.refresh();assert.equal(store.current,good);assert.equal(statuses.at(-1).state,'error');
});
