from research_creatine import *
pages=json.loads((OUT/'pages.json').read_text(encoding='utf-8'))
for x in pages:
 p=x['product'];d=x['domain']
 if d=='gnc.in' and p['id'] not in [7641336676583,9517963247847]:continue
 if re.search('combo|gummies|gift|free|stack|duo|fish oil|shaker|carnitine|gym bag|clearance',p['title'],re.I):continue
 t=clean(p['body_html'])
 print('\n',d,p['id'],p['title'],[(v['title'],v['price']) for v in p['variants']])
 print(t[:4500])
urls=['https://nutrija.com/creatine-hcl','https://nutrija.com/creatine-nitrate','https://www.fuelone.in/sv/fuel-one-creatine-monohydrate/SP-123937','https://www.muscleblaze.com/sv/muscleblaze-micronised-creatine-monohydrate/SP-134811?navKey=VRNT-266179','https://www.muscleblaze.com/sv/muscleblaze-creatine-monohydrate/SP-33852','https://www.myprotein.co.in/p/sports-nutrition/creatine-monohydrate-powder/11654670/','https://www.myprotein.co.in/p/sports-nutrition/creapure-creatine-monohydrate/11654731/']
def fetchone(u):
 try:
  raw=get(u);return dict(url=u,html=raw,text=clean(raw))
 except Exception as e:return dict(url=u,error=str(e))
extra=list(concurrent.futures.ThreadPoolExecutor(max_workers=7).map(fetchone,urls))
(OUT/'extra.json').write_text(json.dumps(extra),encoding='utf-8')
for i,x in enumerate(extra):
 (OUT/f'extra_{i}.html').write_text(x.get('html',''),encoding='utf-8')
 print('\nEXTRA',i,x['url'],x.get('error',''))
 for ld in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',x.get('html',''),re.S):print(ld[:10000])
 if i<2:
  for m in re.finditer('spConfig|optionPrices|attributes|new Product.Config',x.get('html','')):print(x['html'][max(0,m.start()-50):m.start()+6000])
