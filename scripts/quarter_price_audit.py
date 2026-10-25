"""Evidence-only audit. Never estimates prices or infers history from today's MRP."""
import concurrent.futures,datetime,hashlib,json,pathlib,re,urllib.parse,urllib.request,collections,sys,gzip,zlib
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'outputs/quarter_audit_20261025';OUT.mkdir(parents=True,exist_ok=True)
CHECKED='2026-10-25';START='20260701';END='20260930'
DATA={k:json.loads((ROOT/'docs/data'/f).read_text(encoding='utf-8')) for k,f in [('protein','catalog.json'),('creatine','creatine.json')]}
def canonical(url):
 p=urllib.parse.urlsplit(url);return urllib.parse.urlunsplit((p.scheme,p.netloc,p.path.rstrip('/'),'',''))
def get(url,timeout=25):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (Supplement Research; price evidence audit)','Accept':'application/json,text/html;q=0.9,*/*;q=0.8'})
 with urllib.request.urlopen(req,timeout=timeout) as res:
  requested_capture=re.search(r'web.archive.org/web/(\d{14})',url)
  if requested_capture:
   actual_capture=re.search(r'web.archive.org/web/(\d{14})',res.geturl())
   if not actual_capture or actual_capture[1]!=requested_capture[1]:raise ValueError('Archive redirected to a different date or live resource; not historical evidence.')
  body=res.read()
  if body.startswith(b'\x1f\x8b') or res.headers.get('Content-Encoding')=='gzip':body=gzip.decompress(body)
  elif res.headers.get('Content-Encoding')=='deflate':body=zlib.decompress(body)
  return body.decode('utf-8','replace')
def save_raw(url,text):
 name=hashlib.sha256(url.encode()).hexdigest()+'.txt';(OUT/'responses').mkdir(exist_ok=True);(OUT/'responses'/name).write_text(text,encoding='utf-8');return name
def cdx(domain):
 params=dict(url=domain+'/*',output='json',fl='timestamp,original',from_=START,to=END,limit='10000')
 params['from']=params.pop('from_');url='https://web.archive.org/cdx/search/cdx?'+urllib.parse.urlencode(params)+'&filter=statuscode:200&filter=mimetype:text/html'
 try:
  raw=get(url,40);rows=json.loads(raw);return dict(domain=domain,url=url,rows=rows[1:],evidence=save_raw(url,raw),truncated=len(rows)>=10001)
 except Exception as e:return dict(domain=domain,url=url,rows=[],error=str(e))
def archive_discovery():
 domains=sorted({urllib.parse.urlsplit(r['url']).netloc for d in DATA.values() for r in d['offers']})
 results=list(concurrent.futures.ThreadPoolExecutor(max_workers=8).map(cdx,domains))
 (OUT/'archive_index.json').write_text(json.dumps(results),encoding='utf-8')
 print('Archive indices',[(r['domain'],len(r['rows']),r.get('error')) for r in results],flush=True)
def groups():
 result=collections.defaultdict(list)
 for cat,d in DATA.items():
  for r in d['offers']:result[canonical(r['url'])].append((cat,r))
 return result
def live(base):
 try:
  is_shop='/products/' in urllib.parse.urlsplit(base).path
  url=base+'.json' if is_shop else base
  raw=get(url);evidence=save_raw(url,raw)
  if is_shop:
   j=json.loads(raw);p=j['product'];return dict(base=base,url=url,kind='shopify',product=p,evidence=evidence,checked=CHECKED)
  # Query-bearing variants must be fetched separately, never borrow default page prices.
  return dict(base=base,url=url,kind='html',evidence=evidence,checked=CHECKED)
 except Exception as e:return dict(base=base,error=str(e),checked=CHECKED)
def live_discovery():
 result=list(concurrent.futures.ThreadPoolExecutor(max_workers=12).map(live,groups()))
 (OUT/'live_sources.json').write_text(json.dumps(result),encoding='utf-8');print('Live bases',len(result),'successful',sum('error' not in x for x in result),flush=True)
def selected_live():
 urls=sorted({r['url'] for d in DATA.values() for r in d['offers'] if '/products/' not in urllib.parse.urlsplit(r['url']).path})
 def run(url):
  try:
   raw=get(url);return dict(url=url,evidence=save_raw(url,raw),checked=CHECKED)
  except Exception as e:return dict(url=url,error=str(e),checked=CHECKED)
 result=list(concurrent.futures.ThreadPoolExecutor(max_workers=12).map(run,urls))
 (OUT/'selected_sources.json').write_text(json.dumps(result),encoding='utf-8');print('Selected live pages',len(result),'successful',sum('error' not in r for r in result),flush=True)
def norm(url):
 p=urllib.parse.urlsplit(url);host=p.netloc.lower().removeprefix('www.');host='gnc.in' if host=='guardian.in' else host;path=urllib.parse.unquote(p.path).rstrip('/');return host+path
def archive_capture(job):
 base,stamp,original=job;url=f'https://web.archive.org/web/{stamp}id_/{original}'
 try:
  raw=get(url,30);return dict(base=base,url=url,original=original,timestamp=stamp,evidence=save_raw(url,raw))
 except Exception as e:return dict(base=base,url=url,timestamp=stamp,error=str(e))
def archive_fetch():
 idx=json.loads((OUT/'archive_index.json').read_text());by_url=collections.defaultdict(list)
 old_path=OUT/'archive_sources.json';old={s['base']:s for s in json.loads(old_path.read_text())} if old_path.exists() else {}
 for host in idx:
  for stamp,original in host['rows']:by_url[norm(original)].append((stamp,original))
 jobs=[]
 for base in groups():
  captures=by_url.get(norm(base),[])
  if captures:
   stamp,original=max(captures)
   if old.get(base,{}).get('evidence') and old[base]['timestamp']>=stamp:continue
   jobs.append((base,stamp,original))
 print('Matched archive product pages',len(jobs),flush=True)
 fetched=list(concurrent.futures.ThreadPoolExecutor(max_workers=10).map(archive_capture,jobs))
 for s in fetched:
  if s.get('evidence') or not old.get(s['base'],{}).get('evidence'):old[s['base']]=s
 result=list(old.values())
 (OUT/'archive_sources.json').write_text(json.dumps(result),encoding='utf-8');print('Archive captures fetched',sum('error' not in x for x in result),flush=True)
def archive_aliases():
 path=OUT/'archive_index.json';idx=json.loads(path.read_text())
 additions=list(concurrent.futures.ThreadPoolExecutor(max_workers=4).map(cdx,['guardian.in','myprotein.co.in','optimumnutrition.co.in','fastandup.in']))
 path.write_text(json.dumps([*idx,*additions]),encoding='utf-8');print('Additional official-store archive indices',[(a['domain'],len(a['rows']),a.get('error')) for a in additions],flush=True)
def archive_retry():
 path=OUT/'archive_sources.json';sources=json.loads(path.read_text());pending=[s for s in sources if 'error' in s]
 def run(s):
  # Standard public replay endpoint; retain the original capture timestamp and source.
  url=s['url'].replace(s['timestamp']+'id_/',s['timestamp']+'/')
  try:
   raw=get(url,15);return dict(base=s['base'],url=url,timestamp=s['timestamp'],evidence=save_raw(url,raw))
  except Exception:return s
 retried=list(concurrent.futures.ThreadPoolExecutor(max_workers=6).map(run,pending));by_base={s['base']:s for s in retried}
 result=[by_base.get(s['base'],s) for s in sources];path.write_text(json.dumps(result),encoding='utf-8');print('Public replay captures retrieved',sum('error' not in x for x in result),flush=True)
if __name__=='__main__':
 if '--archives' in sys.argv:archive_discovery()
 if '--live' in sys.argv:live_discovery()
 if '--fetch-archives' in sys.argv:archive_fetch()
 if '--selected' in sys.argv:selected_live()
 if '--retry-archives' in sys.argv:archive_retry()
 if '--archive-aliases' in sys.argv:archive_aliases()
