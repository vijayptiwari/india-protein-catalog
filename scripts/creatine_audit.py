from research_creatine import *
pages=json.loads((OUT/'pages.json').read_text(encoding='utf-8'))
for x in pages:
 p=x['product'];d=x['domain'];pid=p['id']
 if d=='gnc.in' and pid not in [7641336676583,9517963247847]:continue
 if re.search('combo|gummies|gift|free|stack|duo|sachet|fish oil|shaker|carnitine|gym bag|clearance',p['title'],re.I):continue
 t=x.get('text','');body=clean(p.get('body_html'))
 print('\n',d,pid,p['title']);print('OPTS',p['options'])
 for pat in [r'Serving Size.{0,180}',r'one (?:level )?scoop.{0,90}',r'\d+(?:\.\d+)?\s*g\s*(?:per serving|per scoop)',r'Creatine (?:Monohydrate|HCL).{0,100}',r'Net (?:Weight|Quantity|Qty).{0,70}']:
  matches=list(dict.fromkeys(re.findall(pat,t,re.I)))
  print(pat,matches[:7])
 if d in ['wellversed.in','www.fastandup.in','naturaltein.in','www.bigmusclesnutrition.com']: print('BODY',body[-1700:])
extra=json.loads((OUT/'extra.json').read_text())
for i,x in enumerate(extra):
 print('\nEXTRA',i)
 raw=x.get('html','');t=x.get('text','')
 if i<2:
  m=re.search(r'new Product.Config\((\{.*?\})\);',raw,re.S)
  if m:
   j=json.loads(m[1]);print({k:j[k] for k in ['attributes','basePrice','childProducts']})
 else:
  for s in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',raw,re.S):
   try:j=json.loads(s)
   except:continue
   if j.get('@type')=='ProductGroup':
    for v in j['hasVariant']:print(v['name'],v.get('weight'),v.get('additionalProperty'),v['offers'])
   elif 'Product' in j.get('@type',[]):print({k:j.get(k) for k in ['name','offers','sku']})
 for pat in [r'Serving Size.{0,400}',r'Nutrition.{0,1100}',r'creatine monohydrate.{0,100}']:
  print(pat,list(dict.fromkeys(re.findall(pat,t,re.I)))[:3])
