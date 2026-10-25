"""Apply exact-variant dated observations, preserving unverified catalog prices explicitly."""
from quarter_price_audit import *
import html,csv,functools
def read_response(source):return (OUT/'responses'/source['evidence']).read_text(encoding='utf-8') if source.get('evidence') else ''
def ld_nodes(raw):
 def walk(n):
  if isinstance(n,dict):
   yield n
   for key in ['@graph','hasVariant','mainEntity']:
    for child in n.get(key,[]) if isinstance(n.get(key),list) else [n.get(key)]:
     if child is not None:yield from walk(child)
  elif isinstance(n,list):
   for child in n:yield from walk(child)
 for block in re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',raw,re.S|re.I):
  try:yield from walk(json.loads(block))
  except (ValueError,TypeError):continue
def query(url,key):return urllib.parse.parse_qs(urllib.parse.urlsplit(url).query).get(key,[None])[0]
def heading_matches(r,title):
 w=re.search(r'(?<![\d.])(\d+(?:\.\d+)?)\s*(kg|g)\b',title,re.I)
 if not w:return False
 grams=float(w[1])*(1000 if w[2].lower()=='kg' else 1)
 return abs(grams-r['kg']*1000)<.01 and re.sub(r'\W','',r['flavour']).lower() in re.sub(r'\W','',title).lower()
@functools.lru_cache(maxsize=24)
def variant_candidates(raw):
 values=collections.defaultdict(set);decoder=json.JSONDecoder()
 decoded=html.unescape(raw)
 for match in re.finditer(r'"variants"\s*:\s*\[',decoded):
  try:array,_=decoder.raw_decode(decoded[match.end()-1:])
  except ValueError:continue
  for v in array:
   if not isinstance(v,dict) or 'id' not in v or 'price' not in v:continue
   # Shopify embedded product JSON uses integer paise. API JSON string prices use INR.
   price=v['price']
   if isinstance(price,dict):
    if price.get('currencyCode',price.get('currency_code'))!='INR' or 'amount' not in price:continue
    price=float(price['amount'])
   elif isinstance(price,(int,float)):
    if 'available' not in v or not ('options' in v or 'option1' in v):continue
    price=float(price)/100
   elif isinstance(price,str):price=float(price)
   else:continue
   if price>0:values[str(v['id']).removeprefix('gid://shopify/ProductVariant/')].add(price)
 return values
@functools.lru_cache(maxsize=24)
def variant_identities(raw):
 result=collections.defaultdict(list);decoded=html.unescape(raw);decoder=json.JSONDecoder()
 for match in re.finditer(r'"variants"\s*:\s*\[',decoded):
  try:array,_=decoder.raw_decode(decoded[match.end()-1:])
  except ValueError:continue
  for v in array:
   if isinstance(v,dict) and v.get('id') is not None and (v.get('title') or v.get('options')):result[str(v['id']).removeprefix('gid://shopify/ProductVariant/')].append(v)
 return result
def historical_identity_issue(r,raw,current_variant,previous,current_price):
 vid=query(r['url'],'variant') or (str(current_variant['id']) if current_variant else None)
 if not vid:return None
 vs=variant_identities(raw).get(vid,[])
 normalize=lambda s:re.sub(r'\W','',s.lower().replace('unflavored','unflavoured'))
 for v in vs:
  title=v.get('title') or '';w=re.search(r'(\d+(?:\.\d+)?)\s*(kg|g)\b',title,re.I)
  if w and abs(float(w[1])*(1000 if w[2].lower()=='kg' else 1)-r['kg']*1000)>.01:return 'Archived variant ID used a different pack weight; not comparable.'
  if title and title!='Default Title' and normalize(r['flavour']) not in normalize(title):return 'Archived variant flavour differs from current listing; not comparable.'
 if current_price and previous and abs(current_price/previous-1)>1 and vs and any(v.get('available') is False for v in vs) and not any(v.get('available') is True for v in vs):return 'Archived unavailable quote implies over 100% change; corroboration required before using as a baseline.'
 return None
def price_from_html(r,raw,current_variant=None):
 vid=query(r['url'],'variant') or (str(current_variant['id']) if current_variant else None);sku=query(r['url'],'variation') or query(r['url'],'navKey')
 if vid:
  values=variant_candidates(raw).get(vid,set())
  if len(values)==1:return next(iter(values)),'Shopify exact embedded variant ID',vid
 # Product JSON-LD must explicitly identify the chosen variant, never a default/related product.
 found=[]
 for n in ld_nodes(raw):
  typ=n.get('@type',[])
  if not ('Product' in typ or typ=='Product'):continue
  candidates=n.get('offers',[]);candidates=candidates if isinstance(candidates,list) else [candidates]
  for o in candidates:
   if not isinstance(o,dict) or o.get('priceCurrency')!='INR' or 'price' not in o:continue
   matches=sku and str(n.get('sku',o.get('sku','')))==sku
   if not sku and not vid:
    matches=heading_matches(r,n.get('name','')) and (canonical(o.get('url',''))==canonical(r['url']) or (re.search(r'SP-\d+',o.get('url','')) and re.search(r'SP-\d+',r['url']) and re.search(r'SP-\d+',o['url'])[0]==re.search(r'SP-\d+',r['url'])[0]))
   if sku and sku.startswith('PA-'):
    matches=str(n.get('sku',''))=='VRNT-'+sku[3:] and heading_matches(r,n.get('name',''))
   if vid:
    matches=query(o.get('url',''),'variant')==vid or (current_variant and current_variant.get('sku') and str(n.get('sku'))==str(current_variant['sku'])) or (not query(r['url'],'variant') and not sku and heading_matches(r,n.get('name','')) and canonical(o.get('url',''))==canonical(r['url']))
   if matches and float(o['price'])>0:found.append(float(o['price']))
 if len(set(found))==1:return found[0],'Exact SKU JSON-LD INR offer',sku or vid
 if r['brand']=='NutriJa':
  match=re.search(r'new Product.Config\((\{.*?\})\);',raw,re.S)
  if match:
   j=json.loads(match[1]);opts=j.get('attributes',{}).get('140',{}).get('options',[])
   for opt in opts:
    w=re.fullmatch(r'(\d+)g',opt['label'])
    if w and int(w[1])==r.get('grams'):
     price=float(j['childProducts'][opt['products'][0]]['finalPrice']);return price,'Exact configured pack weight and child finalPrice',opt['products'][0]
 if r['brand']=='Avvatar':
  titles=[html.unescape(re.sub('<[^>]+>',' ',h)) for h in re.findall(r'<h1[^>]*>(.*?)</h1>',raw,re.S|re.I)];text=html.unescape(re.sub('<[^>]+>',' ',raw));text=re.sub(r'\s+',' ',text)
  p=re.search(r'(?:Offer )?Price:\s*₹\s*([\d,]+(?:\.\d+)?)',text)
  if any(heading_matches(r,title) for title in titles) and p:return float(p[1].replace(',','')),'Exact product heading, flavour, weight and labelled selling price',None
 return None,None,None
def apply():
 live={x['base']:x for x in json.loads((OUT/'live_sources.json').read_text())};selected={x['url']:x for x in json.loads((OUT/'selected_sources.json').read_text())};archives={x['base']:x for x in json.loads((OUT/'archive_sources.json').read_text())}
 observations=[];report=[];stats=collections.Counter()
 for cat,d in DATA.items():
  backup=OUT/f'{cat}_before_audit.json'
  if not backup.exists():backup.write_text(json.dumps(d),encoding='utf-8')
  for r in d['offers']:
   stats['offers']+=1;base=canonical(r['url']);source=live.get(base,{});v=None;price=None;basis=None;variant_id=None;verified_source=None;prior_catalog=r['price']
   if source.get('kind')=='shopify':
    vs=source['product']['variants'];vid=query(r['url'],'variant')
    v=next((a for a in vs if str(a['id'])==vid),None) if vid else vs[0] if len(vs)==1 else None
    if v and float(v['price'])>0:price=float(v['price']);basis='Official Shopify exact variant ID' if vid else 'Official single-variant product';variant_id=str(v['id']);verified_source=source
   else:
    selected_source=selected.get(r['url'],source)
    if selected_source.get('evidence'):price,basis,variant_id=price_from_html(r,read_response(selected_source));verified_source=selected_source if price is not None else None
   r['priceAudit']={'checked':CHECKED,'status':'verified' if price is not None else 'unverified','sourceUrl':verified_source.get('url') if verified_source else r['url'],'basis':basis or 'Exact variant price not established in this audit; prior catalog value retained.','previousCatalogPrice':prior_catalog}
   if price is not None:
    stats['current_verified']+=1
    if abs(price-r['price'])>.001:stats['current_corrected']+=1
    r['price']=price;r['checked']=CHECKED
    if v and 'available' in v:r['stock']='In stock' if v['available'] else 'Sold out'
    observations.append(dict(category=cat,offerId=r['id'],date=CHECKED,price=price,currency='INR',sourceUrl=r['url'],evidenceUrl=verified_source['url'],kind='official-live',matchBasis=basis,variantId=variant_id))
   arc=archives.get(base,{});previous=None;historical_basis=None;historical_variant=None;historical_issue=None;rejected_previous=None
   if arc.get('evidence'):
    previous,historical_basis,historical_variant=price_from_html(r,read_response(arc),v)
    if previous is not None:
     historical_issue=historical_identity_issue(r,read_response(arc),v,previous,price)
     observations.append(dict(category=cat,offerId=r['id'],date=arc['timestamp'][:4]+'-'+arc['timestamp'][4:6]+'-'+arc['timestamp'][6:8],price=previous,currency='INR',sourceUrl=r['url'],evidenceUrl=arc['url'],kind='official-archive',matchBasis=historical_basis,variantId=historical_variant,qualityStatus='excluded' if historical_issue else 'verified',exclusionReason=historical_issue))
     if historical_issue:rejected_previous=previous;previous=None;stats['historical_quotes_excluded']+=1
   trend=dict(status='verified' if previous is not None and price is not None else 'unverified',pct=None,direction='unknown',prevPrice=previous,currentPrice=r['price'],comparisonQuarter='Q3 2026',comparisonStart='2026-07-01',comparisonEnd='2026-09-30',currentAsOf=CHECKED,baselineDate=arc['timestamp'][:4]+'-'+arc['timestamp'][4:6]+'-'+arc['timestamp'][6:8] if previous is not None else None,baselineSource=arc.get('url') if previous is not None else None,twelveQuarterChangePct=None,launchQuarter=None,quartersTracked=0,history=[])
   if previous is not None and price is not None:
    pct=round((price-previous)/previous*100,2);trend.update(pct=pct,direction='down' if price<previous else 'up' if price>previous else 'stable');stats['quarter_comparable']+=1;stats[trend['direction']]+=1
   # A quarter chip is a dated observed snapshot, never a quarterly average or price range.
   trend['history']=[dict(quarter='Q3 2026',date=trend['baselineDate'],price=previous,status='Verified snapshot' if previous is not None else 'No verified history',verified=previous is not None,source=trend['baselineSource'],qoqPct=None),dict(quarter='Q4 2026 to date',date=CHECKED,price=r['price'] if price is not None else None,status='Verified snapshot' if price is not None else 'Current price unverified',verified=price is not None,source=verified_source['url'] if verified_source else None,qoqPct=trend['pct'])]
   known=[a['price'] for a in trend['history'] if a['verified']];trend.update(lowestPrice=min(known) if known else None,highestPrice=max(known) if known else None,quartersTracked=len(known))
   trend['auditNote']=historical_issue
   r['trend']=trend;r.pop('addedDate',None);r['isNew']=False # Old launch flags were also generated from flavour keywords.
   concentration=r.get('protein') if cat=='protein' else r.get('creatine');r['cost']=(r['price']/(r['kg']*10*concentration) if cat=='protein' else r['price']/(r['grams']*concentration/100)) if concentration else None
   if cat=='creatine':r['powderCost']=r['price']/r['grams'];r['doseCost']=3*r['cost'] if r['cost'] is not None else None
   report.append(dict(category=cat,offerId=r['id'],brand=r['brand'],product=r['product'],flavour=r['flavour'],packGrams=r['kg']*1000,currentPrice=r['price'],currentStatus=r['priceAudit']['status'],priorCatalogPrice=prior_catalog,baselinePrice=previous,baselineDate=trend['baselineDate'],changePct=trend['pct'],direction=trend['direction'],baselineSource=trend['baselineSource'],currentSource=r['priceAudit']['sourceUrl'],excludedHistoricalQuote=rejected_previous,historyAuditNote=historical_issue))
  d['trendAudit']=dict(checked=CHECKED,comparisonQuarter='Q3 2026',method='Latest retrievable exact-variant official-store archived observation within July–September 2026 versus verified current selling price. Not a quarter average or completed Q4 comparison.',unknownMeaning='No defensible comparison; not unchanged.',syntheticHistoryRemoved=True)
  (ROOT/'docs/data'/('catalog.json' if cat=='protein' else 'creatine.json')).write_text(json.dumps(d,ensure_ascii=False),encoding='utf-8')
 ledger_path=ROOT/'docs/data/price-observations.json'
 old=json.loads(ledger_path.read_text(encoding='utf-8')).get('observations',[]) if ledger_path.exists() else []
 unique={(o['category'],str(o['offerId']),o['date'],o['price'],o['evidenceUrl']):o for o in [*old,*observations]}
 ledger_path.write_text(json.dumps(dict(checked=CHECKED,observations=list(unique.values())),ensure_ascii=False),encoding='utf-8')
 (ROOT/'docs/data/price-audit.json').write_text(json.dumps(dict(checked=CHECKED,summary=dict(stats),offers=report),ensure_ascii=False),encoding='utf-8')
 with (ROOT/'docs/data/price-audit.csv').open('w',encoding='utf-8-sig',newline='') as f:
  writer=csv.DictWriter(f,fieldnames=list(report[0]));writer.writeheader();writer.writerows(report)
 print(json.dumps(dict(stats)),flush=True)
if __name__=='__main__':apply()
