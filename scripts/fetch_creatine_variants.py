from research_creatine import *
import urllib.parse
extra=json.loads((OUT/'extra.json').read_text())
urls=[]
for i in [3,4]:
 for u in re.findall(r'href=["\']([^"\']+)',extra[i]['html']):
  if ('SP-33852' in u or 'SP-134811' in u) and 'VRNT-' in u:urls.append(urllib.parse.urljoin(extra[i]['url'],html.unescape(u)))
if (OUT/'creapro.json').exists():
 cp=json.loads((OUT/'creapro.json').read_text())
 for u in re.findall(r'href=["\']([^"\']+)',cp['html']):
  if 'SP-38004' in u and 'VRNT-' in u:urls.append(urllib.parse.urljoin(cp['url'],html.unescape(u)))
for i in [5,6]:
 for s in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',extra[i]['html'],re.S):
  try:j=json.loads(s)
  except:continue
  for group in j.get('@graph',[]):
   for v in group.get('hasVariant',[]):urls.append(v['offers']['url'])
def run(u):
 try:
  raw=get(u);return dict(url=u,html=raw,text=clean(raw))
 except Exception as e:return dict(url=u,error=str(e))
res=list(concurrent.futures.ThreadPoolExecutor(max_workers=12).map(run,dict.fromkeys(urls)))
(OUT/'variants.json').write_text(json.dumps(res),encoding='utf-8')
print('Fetched',len(res),'variant pages')
for x in res:
 print(x['url'])
 print(x.get('text','')[max(0,x.get('text','').find('Serving Size')-50):x.get('text','').find('Serving Size')+550])
