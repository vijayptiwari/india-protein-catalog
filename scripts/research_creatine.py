import urllib.request, concurrent.futures, json, pathlib, re, html, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/creatine_catalog_20261025'; OUT.mkdir(parents=True,exist_ok=True)
SITES={'nakpro.com':'NAKPRO','asitisnutrition.com':'AS-IT-IS Nutrition','www.optimumnutrition.co.in':'Optimum Nutrition','naturaltein.in':'Naturaltein','nutrabox.in':'Nutrabox','musclenectar.com':'Muscle Nectar','beastlife.in':'Beastlife','gnc.in':'GNC','www.fastandup.in':'Fast&Up','wellbeingnutrition.com':'Wellbeing Nutrition','www.bigmusclesnutrition.com':'BigMuscles Nutrition','wellversed.in':'Wellcore'}
def get(url):
 return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=35).read().decode('utf-8')
def clean(raw):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',re.sub(r'<(script|style)\b[^>]*>.*?</\1>','',raw or '',flags=re.S))))
def fetch(domain):
 products=[]
 try:
  for page in range(1,5):
   chunk=json.loads(get(f'https://{domain}/products.json?limit=250&page={page}'))['products'];products+=chunk
   if len(chunk)<250:break
  selected=[p for p in products if re.search('creatine',p['title'],re.I) and not re.search(r'combo|\+|whey|gainer|pre.?workout|pack of|bundle|[23]\s*[xX]',p['title'],re.I)]
  (OUT/(domain+'.json')).write_text(json.dumps(selected),encoding='utf-8')
  return domain,len(selected)
 except Exception as e:return domain,str(e)
if __name__=='__main__':
 print(list(concurrent.futures.ThreadPoolExecutor(max_workers=12).map(fetch,SITES)))
 jobs=[]
 for domain in SITES:
  path=OUT/(domain+'.json')
  if path.exists():
   for p in json.loads(path.read_text()):jobs.append((domain,p))
 def detail(job):
  d,p=job;url=f'https://{d}/products/{p["handle"]}'
  try:return dict(domain=d,product=p,url=url,text=clean(get(url)))
  except Exception as e:return dict(domain=d,product=p,url=url,error=str(e))
 pages=list(concurrent.futures.ThreadPoolExecutor(max_workers=12).map(detail,jobs))
 (OUT/'pages.json').write_text(json.dumps(pages,ensure_ascii=False),encoding='utf-8')
 for x in pages:
  p=x['product'];print(x['domain'],p['id'],p['title'],[(v['title'],v['price']) for v in p['variants']])
