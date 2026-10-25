from research_creatine import *
pages=json.loads((OUT/'pages.json').read_text(encoding='utf-8'))
for x in pages:
 p=x['product'];pid=p['id'];d=x['domain']
 if d in ['naturaltein.in','www.fastandup.in','www.bigmusclesnutrition.com'] or pid in [7122193645648,9517963247847]:
  t=x.get('text','');print('\n',pid,p['title'])
  for pat in [r'.{0,70}\b(?:100|125|250|300|310|3\.3|3\.4|3\.1|3\.8|6\.5)\s*(?:g|grams)\b.{0,140}',r'.{0,80}Ingredients.{0,400}',r'.{0,80}Serving.{0,90}']:
   print(list(dict.fromkeys(re.findall(pat,t,re.I)))[:16])
extra=json.loads((OUT/'extra.json').read_text())
for i in [2,3,4]:
 raw=extra[i]['html'];urls=list(dict.fromkeys(html.unescape(u) for u in re.findall(r'href=["\']([^"\']+)',raw) if '/sv/' in u and 'VRNT-' in u));print('LINKS',i,urls)
