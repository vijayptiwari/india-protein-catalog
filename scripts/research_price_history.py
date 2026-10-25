"""Collect exact-variant public archived prices for completed calendar quarters.

Never generates, interpolates or carries forward a price. Raw responses and failed
requests are cached locally; only verified matches enter the public evidence ledger.
"""
import argparse,collections,concurrent.futures,datetime,hashlib,html,json,pathlib,re,urllib.parse
from quarter_price_audit import get,canonical,norm
from apply_quarter_audit import price_from_html,historical_identity_issue,query
ROOT=pathlib.Path(__file__).resolve().parents[1]
def quarters(as_of,count):
    date=datetime.date.fromisoformat(as_of);index=date.year*4+(date.month-1)//3
    result=[]
    for i in range(index-count,index):
        year,q=divmod(i,4);start=datetime.date(year,q*3+1,1)
        end=datetime.date(year+1,1,1) if q==3 else datetime.date(year,(q+1)*3+1,1)
        result.append(dict(label=f'Q{q+1} {year}',start=start.isoformat(),end=(end-datetime.timedelta(days=1)).isoformat()))
    return result
def page_weight_issue(r,raw):
    """Catch a reused variant ID when its page explicitly names another net weight.

    A page with multiple stated weights is ambiguous, so its selected variant
    identity remains the stronger evidence; do not borrow weights from recommendations.
    """
    headings=re.findall(r'<h1\b[^>]*>(.*?)</h1>',raw,re.S|re.I)
    if len(headings)!=1:return None
    text=html.unescape(re.sub('<[^>]+>',' ',headings[0]))
    weights=[]
    for match in re.finditer(r'(?<![\d.])(\d+(?:\.\d+)?)\s*(kg|g)\b',text,re.I):
        tail=text[match.end():]
        if re.match(r'\s*(?:protein|creatine|per\b|/|of\b|daily|dose|scoop|serving)',tail,re.I) or re.match(r'\s+(?:[a-z-]+\s+){0,3}(?:protein|creatine)\b',tail,re.I):continue
        weights.append(float(match[1])*(1000 if match[2].lower()=='kg' else 1))
    if len(weights)==1 and abs(weights[0]-r['kg']*1000)>.01:
        # Multi-weight selected variants are checked by historical_identity_issue.
        from apply_quarter_audit import variant_identities
        vid=query(r['url'],'variant');selected=variant_identities(raw).get(vid,[]) if vid else []
        if any(re.search(r'\d\s*(kg|g)\b',v.get('title',''),re.I) for v in selected):return None
        return 'Archived product heading explicitly names a different pack weight; variant ID alone is not comparable.'
    return None
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--quarters',type=int,default=12);parser.add_argument('--workers',type=int,default=4);parser.add_argument('--alternatives',type=int,default=1,help='Maximum distinct capture dates to try per page and quarter.');parser.add_argument('--structured',action='store_true',help='Also discover archived public product JSON/JS feeds.');parser.add_argument('--skip-known-failures',action='store_true');parser.add_argument('--discover-only',action='store_true');parser.add_argument('--cached-only',action='store_true',help='Re-audit cached public captures without making network requests.');args=parser.parse_args()
    if not 1<=args.quarters<=40 or not 1<=args.workers<=12 or not 1<=args.alternatives<=5:parser.error('Use 1–40 quarters, 1–12 workers and 1–5 alternative capture dates.')
    config=json.loads((ROOT/'docs/data/site.json').read_text(encoding='utf-8-sig'))
    data={c['id']:json.loads((ROOT/'docs/data'/c['file']).read_text(encoding='utf-8-sig')) for c in config['categories']}
    as_of=max(d['checked'] for d in data.values());window=quarters(as_of,args.quarters);first=window[0]['start'].replace('-','');last=window[-1]['end'].replace('-','')
    out=ROOT/'outputs'/f'history_{first}_{last}';out.mkdir(parents=True,exist_ok=True);(out/'responses').mkdir(exist_ok=True)
    def save(url,raw):
        name=hashlib.sha256(url.encode()).hexdigest()+'.txt';(out/'responses'/name).write_text(raw,encoding='utf-8');return name
    groups=collections.defaultdict(list)
    for cat,d in data.items():
        for r in d['offers']:groups[canonical(r['url'])].append((cat,r))
    hosts=sorted({urllib.parse.urlsplit(base).netloc.removeprefix('www.') for base in groups}|{'guardian.in'})
    def discover(host,structured=False):
        cache=out/('index_'+host+('_structured' if structured else '')+'.json')
        old={}
        if cache.exists():
            old=json.loads(cache.read_text())
            if args.cached_only or (not old.get('error') and not old.get('truncated')):return old
        if args.cached_only:return dict(domain=host,rows=[],requests=[],error='No cached public archive index.',truncated=True)
        rows=old.get('rows',[]);resume=old.get('resumeKey');requests=old.get('requests',[])
        if not resume and rows and requests:
            prior=(out/'responses'/requests[-1]['response']).read_text(encoding='utf-8').strip().splitlines()
            tail=[line.strip() for line in prior if line.strip() and not re.match(r'^\d{14} ',line)]
            if len(tail)==1 and '<' not in tail[0] and ' ' not in tail[0]:resume=tail[0]
        try:
            for page in range(30):
                params=[('url',host+('/products/*' if structured else '/*')),('from',first),('to',last),('fl','timestamp,original'),('filter','statuscode:200'),('filter',r'original:.*\.(json|js)(\?.*)?$' if structured else 'mimetype:text/html'),('limit','10000'),('showResumeKey','true')]
                if resume:params.append(('resumeKey',resume))
                url='https://web.archive.org/cdx/search/cdx?'+urllib.parse.urlencode(params);raw=get(url,25);requests.append(dict(url=url,response=save(url,raw)))
                lines=raw.strip().splitlines();page_rows=[line.split(' ',1) for line in lines if re.match(r'^\d{14} ',line)]
                # A resume key is separated from CDX rows by an empty line.
                tail=[line.strip() for line in lines if line.strip() and not re.match(r'^\d{14} ',line)]
                if tail and (len(tail)!=1 or '<' in tail[0] or ' ' in tail[0]):raise ValueError('Unexpected archive index response.')
                rows.extend(page_rows);resume=tail[-1] if tail else None
                if not resume:break
            result=dict(domain=host,format='structured' if structured else 'html',rows=rows,requests=requests,truncated=bool(resume),resumeKey=resume)
        except Exception as e:result=dict(domain=host,format='structured' if structured else 'html',rows=rows,requests=requests,error=str(e),truncated=True,resumeKey=resume)
        cache.write_text(json.dumps(result),encoding='utf-8');print('Archive index',host,len(rows),result.get('error',''),flush=True);return result
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:indices=list(pool.map(discover,hosts))
    if args.structured:
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:indices.extend(pool.map(lambda host:discover(host,True),hosts))
    # Seed known successful captures; research never replaces evidence with a failed fetch.
    sources={};old=ROOT/'outputs/quarter_audit_20261025'
    if (old/'archive_sources.json').exists():
        for s in json.loads((old/'archive_sources.json').read_text()):
            if s.get('evidence') and (old/'responses'/s['evidence']).exists():sources[s['url']]={**s,'cacheDir':str(old/'responses')}
    cache_path=out/'sources.json'
    if cache_path.exists():sources.update({s.get('requestUrl',s['url']):s for s in json.loads(cache_path.read_text())})
    def product_key(url):
        key=norm(url)
        return re.sub(r'\.(json|js)$','',key) if '/products/' in key else key
    by_base=collections.defaultdict(list)
    for index in indices:
        for stamp,url in index['rows']:by_base[product_key(url)].append((stamp,url))
    jobs=[]
    for base in groups:
        for quarter in window:
            captures=sorted(set((stamp,url) for stamp,url in by_base.get(product_key(base),[]) if quarter['start'].replace('-','')<=stamp[:8]<=quarter['end'].replace('-','')),reverse=True)
            if captures:
                dates=set()
                for stamp,url in captures:
                    if stamp[:8] in dates:continue
                    dates.add(stamp[:8]);replay=f'https://web.archive.org/web/{stamp}id_/{url}'
                    jobs.append(dict(base=base,quarter=quarter['label'],timestamp=stamp,url=replay,original=url))
                    if len(dates)>=args.alternatives:break
    print('Matched product-quarter captures',len(jobs),'across',len(groups),'product pages',flush=True)
    if args.discover_only:return
    def capture(job):
        cached=sources.get(job['url'])
        if cached and cached.get('evidence') and (pathlib.Path(cached['cacheDir'])/cached['evidence']).exists():return {**job,**cached,'base':job['base'],'quarter':job['quarter']}
        if cached and cached.get('error') and args.skip_known_failures:return {**job,**cached}
        if args.cached_only:return {**job,**(cached or {}),'error':cached.get('error','No cached public capture.') if cached else 'No cached public capture.'}
        try:
            url=job['url']
            if cached and ('10061' in cached.get('error','') or '10060' in cached.get('error','')):url=url.replace(job['timestamp']+'id_/',job['timestamp']+'/')
            raw=get(url,15);return {**job,'url':url,'requestUrl':job['url'],'evidence':save(url,raw),'cacheDir':str(out/'responses')}
        except Exception as e:return {**job,'error':str(e)}
    fetched=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        for i,s in enumerate(pool.map(capture,jobs),1):
            fetched.append(s)
            if i%25==0:
                cache_path.write_text(json.dumps(fetched),encoding='utf-8');print('Retrieved',i,'/',len(jobs),'readable',sum(bool(x.get('evidence')) for x in fetched),flush=True)
    cache_path.write_text(json.dumps(fetched),encoding='utf-8')
    live={}
    if (old/'live_sources.json').exists():live={s['base']:s for s in json.loads((old/'live_sources.json').read_text())}
    observations=[];matched=collections.Counter();excluded=collections.Counter()
    for s in fetched:
        if not s.get('evidence'):continue
        raw=(pathlib.Path(s['cacheDir'])/s['evidence']).read_text(encoding='utf-8')
        for cat,r in groups[s['base']]:
            variants=live.get(s['base'],{}).get('product',{}).get('variants',[]);vid=query(r['url'],'variant')
            current=next((v for v in variants if str(v['id'])==vid),None) if vid else variants[0] if len(variants)==1 else None
            try:price,basis,variant=price_from_html(r,raw,current)
            except (ValueError,KeyError,TypeError,IndexError):continue
            if price is None:continue
            issue=historical_identity_issue(r,raw,current,price,r['price']) or page_weight_issue(r,raw)
            record=dict(category=cat,offerId=r['id'],date=f"{s['timestamp'][:4]}-{s['timestamp'][4:6]}-{s['timestamp'][6:8]}",price=price,currency='INR',sourceUrl=r['url'],evidenceUrl=s['url'],kind='official-archive',matchBasis=basis,variantId=variant,qualityStatus='excluded' if issue else 'verified',exclusionReason=issue)
            observations.append(record);(excluded if issue else matched)[s['quarter']]+=1
    ledger_path=ROOT/'docs/data'/config['observationsFile'];ledger=json.loads(ledger_path.read_text(encoding='utf-8-sig'))
    key=lambda o:(o['category'],str(o['offerId']),o['date'],o['price'],o['evidenceUrl'])
    def snapshot_key(o):
        capture=re.search(r'/web/(\d{14})',o['evidenceUrl'])
        return (o['category'],str(o['offerId']),o['date'],o['price'],o['sourceUrl'],capture[1] if capture else o['evidenceUrl'])
    manual={snapshot_key(o):o for o in ledger['observations'] if o.get('qualityStatus')=='excluded'}
    for o in observations:
        previous=manual.get(snapshot_key(o))
        if previous:o.update(qualityStatus='excluded',exclusionReason=previous.get('exclusionReason','Previously excluded exact capture.'))
    # Existing manual exclusions take precedence when the same quote is encountered again.
    merged={key(o):o for o in ledger['observations']}
    for o in observations:
        previous=merged.get(key(o))
        if not previous or previous.get('qualityStatus')!='excluded':merged[key(o)]={**(previous or {}),**o}
    ledger['observations']=list(merged.values())
    temporary=ledger_path.with_suffix('.json.tmp');temporary.write_text(json.dumps(ledger,ensure_ascii=False),encoding='utf-8');temporary.replace(ledger_path)
    matched=collections.Counter();excluded=collections.Counter()
    for o in observations:
        date=datetime.date.fromisoformat(o['date']);label=f'Q{(date.month-1)//3+1} {date.year}';(excluded if o.get('qualityStatus')=='excluded' else matched)[label]+=1
    report=dict(asOf=as_of,completedQuarters=args.quarters,captureDatesAttemptedPerPageQuarter=args.alternatives,start=window[0]['start'],end=window[-1]['end'],method='Latest indexed distinct capture dates per exact product page and completed quarter; only exact-variant prices accepted. The site selects the latest verified quote per variant and quarter. No interpolation or carried-forward values.',indices=[{k:v for k,v in s.items() if k not in ['rows','resumeKey']} for s in indices],captures=[{k:v for k,v in s.items() if k not in ['cacheDir','evidence']} for s in fetched],quarters=[{**q,'verifiedQuotesCollected':matched[q['label']],'excludedQuotes':excluded[q['label']]} for q in window])
    (ROOT/'docs/data/history-research.json').write_text(json.dumps(report,ensure_ascii=False),encoding='utf-8');print('Collected verified quotes',dict(matched),'excluded',dict(excluded),flush=True)
if __name__=='__main__':main()
