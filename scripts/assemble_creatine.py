"""Curate single-pack offers from saved official-store evidence. No weight extrapolation."""
from research_creatine import *
import urllib.parse, collections
pages=json.loads((OUT/'pages.json').read_text(encoding='utf-8'))
extra=json.loads((OUT/'extra.json').read_text(encoding='utf-8'))
variants=json.loads((OUT/'variants.json').read_text(encoding='utf-8'))
offers=[];exclusions=[]
def weight(s):
 m=re.search(r'(?<![\d.])(\d+(?:\.\d+)?)\s*(kg|g|gms?|grams?)\b',s,re.I)
 return float(m[1])*(1000 if m[2].lower()=='kg' else 1) if m else None
def add(brand,product,flavour,grams,price,url,stock,**kw):
 if not grams or not price:return
 r=dict(id='',brand=brand,product=product,type='Monohydrate',subclass='Not specified',grade='Not specified',formulation='Not specified',packaging='Standard pack',flavour=flavour,grams=grams,kg=grams/1000,price=float(price),stock=stock,creatine=None,scoop=None,serving=None,creatineServing=None,energy=None,url=url,nutritionUrl=url,basis='Creatine compound concentration not verified; compound cost omitted.',notes='',energyBasis='',checked='2026-10-25')
 r.update(kw);r['powderCost']=r['price']/grams;r['cost']=r['price']/(grams*r['creatine']/100) if r['creatine'] else None
 r['doseCost']=r['cost']*3 if r['cost'] else None
 offers.append(r)
def pure(r,basis):r.update(creatine=100,basis=basis,formulation='Single ingredient')
for x in pages:
 p=x['product'];pid=p['id'];d=x['domain'];title=p['title'];body=clean(p.get('body_html'));text=x.get('text','');brand=SITES[d]
 if re.search(r'combo|gummies|gift|free\b|stack|duo|sachet|fish oil|shaker|carnitine|gym bag|clearance|benchmark|\+|protein',title,re.I):
  exclusions.append(dict(product=title,reason='Bundle, gift, non-powder or net weight not disclosed in options',url=x['url']));continue
 # GNC exposes many obsolete or duplicated landing products; use the canonical families only.
 if d=='gnc.in' and pid not in [7641336676583,9517963247847]:continue
 if pid==15381482602722:continue # Duplicate ON 100g unflavoured family landing SKU.
 if pid==7567538782291:
  exclusions.append(dict(product=title,reason='Box option does not disclose net weight; no inference from number of servings',url=x['url']));continue
 for v in p['variants']:
  vt=v['title']
  if re.search(r'\+|\b[2-9]\s*(?:x|boxes)|pack of [2-9]|[2-9]\s*boxes',vt,re.I):continue
  opts={o['name'].lower():v.get('option'+str(o['position'])) or '' for o in p['options']}
  fl=next((val for k,val in opts.items() if 'flav' in k),None)
  size=next((val for k,val in opts.items() if re.search('size|weight|quantity',k)),vt)
  grams=weight(size) or weight(title)
  if not grams:
   # Fast&Up net weights are explicitly in the product-page headings, not Shopify shipping weights.
   if pid in [7427394142283,7221929345099,7221605007435]:
    m=re.search(r'(\d+)g Pack\s*-',text);grams=float(m[1]) if m else None
  if not grams or float(v['price'])<=0:
   exclusions.append(dict(product=title,variant=vt,reason='No confirmed single-pack net weight or no paid offer',url=x['url']));continue
  name=title.split('|')[0].strip()
  if d=='beastlife.in':
   fl=next((f for f in ['Unflavoured','Blueberry','Shikanji','Tropical Tango','Watermelon','Peach','Litchi'] if f.lower() in title.lower()),'Unflavoured' if 'Super Micronized' in title else 'Not specified')
   name='Creatine Nano 400' if 'Nano 400' in title else 'Super Micronized Creatine Monohydrate' if 'Super Micronized' in title else 'Creatine Monohydrate'
  if d=='wellversed.in':
   fl=next((f for f in ['Cranberry Crush','Lemon Lime','Watermelon Wave','Kiwi Kick','Fruit Fusion','Tropical Tango'] if f.lower() in title.lower()),'Unflavoured')
   name='Creatine Monohydrate for Women' if 'For Women' in title else 'Creatine Monohydrate'
  if d=='www.optimumnutrition.co.in':
   brand='Isopure' if 'isopure' in title.lower() else 'Optimum Nutrition';name='Micronized Creatine Monohydrate';fl='Citrus Orange' if 'orange' in title.lower() else 'Unflavoured'
  if d=='www.fastandup.in':name='Creatine Monohydrate Essentials';fl='Orange' if 'orange' in title.lower() else 'Unflavoured'
  if d=='wellbeingnutrition.com':fl='Unflavoured'
  if fl is None:fl='Unflavoured' if re.search(r'unflav|no added flavours|no added flavor',title+' '+body,re.I) else 'Not specified'
  if fl.lower() in ['unflavored','unflavoured']:fl='Unflavoured'
  r={};label=title+' '+body
  r['subclass']='Ultra-micronized' if re.search('ultra.?micron|super micron',label,re.I) else 'Micronized' if re.search('microni[sz]',label,re.I) else 'Not specified'
  if 'Nano 400' in title:r['subclass']='Nano 400 (brand claim)'
  if 'creapure' in title.lower():r['grade']='Creapure®'
  if 'creasure' in title.lower():r['grade']='Creasure®'
  if 'HCL' in title.upper():r['type']='Hydrochloride (HCl)'
  if 'HMB' in title:r['formulation']='With HMB'
  elif 'taurine' in title.lower():r['formulation']='With taurine'
  elif 'piperine' in body.lower():r['formulation']='With piperine'
  elif fl not in ['Unflavoured','Not specified']:r['formulation']='Flavoured'
  if 'jar' in size.lower():r['packaging']='Jar'
  # Paired serving / ingredient quantities are used only where the exact flavour is supported.
  if d=='nakpro.com' and fl=='Unflavoured':pure(r,'Brand ingredient list: unflavoured contains only micronized creatine monohydrate.')
  if pid==554631397427:
   pure(r,'Brand single-ingredient statement; no flavours, colours, sweeteners or fillers.');r.update(scoop=3,serving=3,creatineServing=3,notes='Current FAQ uses 3g; older product description says 2.5g. Current FAQ used for scoop only.')
  if pid==7554908553267:pure(r,'Brand states creatine monohydrate with no added flavours, colours, sweeteners or fillers.');r['creatineServing']=3
  if pid==6763253366835:r.update(scoop=3.1,serving=3.1,creatineServing=3,creatine=3/3.1*100,basis='Family FAQ: 3g creatine monohydrate per 3.1g scoop. Flavour-specific label may differ.',notes='Product-family serving claim used across flavours; page also contains a generic 3g mixing instruction.')
  if brand=='Optimum Nutrition':
   if fl=='Unflavoured':pure(r,'Official ingredients: creatine monohydrate (100%).');r.update(energy=0,energyBasis='Brand explicitly states zero calories.',creatineServing=3)
   else:r['notes']='Flavoured powder has additives. Unflavoured 100% concentration was not applied.'
  if brand=='Isopure':r.update(creatineServing=3,notes='Brand states no fillers or flavours; exact serving weight/concentration not verified.')
  if pid==8635512553646:r.update(scoop=3,serving=3,creatineServing=3,creatine=100,formulation='Single ingredient',basis='Brand intake guide: 3g scoop; 3g creatine per serving.')
  if pid==7980847759534:pure(r,'Brand states 100% creatine hydrochloride.');r.update(scoop=3,serving=3,creatineServing=3)
  if pid==8070044516526:r.update(serving=6.5,creatineServing=3,creatine=3/6.5*100,basis='Brand: 3g creatine monohydrate plus 3g HMB in a 6.5g serving.',subclass='Micronized',notes='HMB is a co-ingredient; chemical creatine type remains monohydrate. Scoop weight not stated.')
  if pid==7535515664558:r.update(creatineServing=3,notes='Creapure is an ingredient trademark, not a distinct chemical form. Exact powder serving weight not verified.')
  if pid==7584912080979 and fl=='Unflavoured':r.update(scoop=3.1,serving=3.1,creatineServing=3,creatine=3/3.1*100,subclass='Microfine',basis='Selected unflavoured page: 3g creatine / 3.1g serving.',notes='Dosing section uses 3.1g; generic FAQ also says 3g. Dosing section used; flavour label not inferred.')
  if pid==7122193645648:r.update(creatineServing=3,notes='Contains 300mg taurine as well as monohydrate. Total serving weight is unverified, so concentration and compound cost are blank.')
  if d=='wellversed.in' and fl=='Unflavoured':pure(r,'Brand explicitly states 100% pure creatine powder, no fillers, flavours or sugar.');r.update(scoop=3,serving=3,creatineServing=3)
  if d=='gnc.in' and pid==7641336676583 and fl=='Unflavoured':r.update(serving=3,creatineServing=3,creatine=100,energy=0,energyBasis='Unflavoured nutrition table states 0 kcal.',basis='Unflavoured nutrition table: 3000mg monohydrate per 3g serving.',formulation='Single ingredient')
  if d=='gnc.in' and fl!='Unflavoured':r['notes']='Canonical family page includes an unflavoured table; not applied to flavoured variants.'
  add(brand,name,fl,grams,v['price'],x['url']+'?variant='+str(v['id']),'In stock' if v['available'] else 'Sold out',**r)
# NutriJa: exact size-to-child-price mapping from official configurable-product data.
for i in [0,1]:
 x=extra[i];j=json.loads(re.search(r'new Product.Config\((\{.*?\})\);',x['html'],re.S)[1]);typ='Hydrochloride (HCl)' if i==0 else 'Nitrate'
 for opt in j['attributes']['140']['options']:
  child=opt['products'][0];price=float(j['childProducts'][child]['finalPrice']);grams=weight(opt['label'])
  add('NutriJa','Creatine HCL' if i==0 else 'Creatine Nitrate','Unflavoured',grams,price,x['url'],'Listed; confirm stock',type=typ,creatine=100,serving=2,scoop=2 if i==0 else None,creatineServing=2,formulation='Single ingredient',basis='Official supplement facts: 2g of the named creatine compound in a 2g serving.',notes='Exact child finalPrice used, including paise; headline price is rounded. Select the stated pack size on the source page. Compound mass includes the HCl/nitrate portion; not free-creatine mass.'+(' Brand separately describes nitrate as 67% creatine and 33% nitrate.' if i else ''))
# MuscleBlaze / Fuel One: named selected variant JSON-LD and exact composition table.
mbseen=set()
for x in [extra[2],extra[3],extra[4],*variants,*([json.loads((OUT/'creapro.json').read_text())] if (OUT/'creapro.json').exists() else [])]:
 if not any(d in x['url'] for d in ['muscleblaze.com','fuelone.in']):continue
 for s in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',x.get('html',''),re.S):
  try:j=json.loads(s)
  except:continue
  if 'Product' not in j.get('@type',[]):continue
  sku=j.get('sku');key=(j.get('brand',{}).get('name'),sku)
  if key in mbseen:continue
  mbseen.add(key);title=j['name'];o=j['offers'];grams=weight(title);text=x['text'];brand='Fuel One' if 'fuelone' in x['url'] else 'MuscleBlaze'
  if grams is None:
   selected=re.search(r'(?:Unflavoured|Fruit Punch|Melon Twist|Tangy Orange)\s*•\s*(\d+(?:\.\d+)?)\s*g\b',text)
   if selected:grams=float(selected[1])
  fl=next((f for f in ['Unflavoured','Watermelon Kool Aid','Fruit Punch','Melon Twist','Tangy Orange'] if f.lower() in title.lower()),'Not specified')
  name=title.split(',')[0].replace('MuscleBlaze ','').replace('Fuel One ','')
  r={};m=re.search(r'Serving Size:\s*1 Level Scoop \((\d+(?:\.\d+)?)g\).*?Creatine Monohydrate\s*(?:\(g\)\s*)?(\d+(?:\.\d+)?)\s*(?:g\b|(?=\*))',text,re.I)
  if m:r.update(scoop=float(m[1]),serving=float(m[1]),creatineServing=float(m[2]),creatine=float(m[2])/float(m[1])*100,basis='Selected variant composition table: grams of monohydrate per scoop.')
  if not m:
   sm=re.search(r'Serving Size:\s*1 Level Scoop \((\d+(?:\.\d+)?)g\)',text,re.I)
   cm=re.search(r'Creatine Monohydrate\s*\(g\)\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)',text,re.I)
   if sm and cm:r.update(scoop=float(sm[1]),serving=float(sm[1]),creatine=float(cm[1]),creatineServing=float(cm[2]),basis='Selected variant table, explicit QTY./100g and QTY./SERVING columns.')
  em=re.search(r'Energy\s*\(kcal\)\s*-?\s*(\d+(?:\.\d+)?)',text,re.I)
  if em:r.update(energy=float(em[1]),energyBasis='Selected variant nutrition table, Qty./100g column.')
  sub='Micronized' if re.search('microni[sz]',name+' '+text[text.find('Description'):text.find('Description')+2000],re.I) else 'Not specified'
  if 'CreaPRO' in name:r['grade']='Creapure®'
  add(brand,name,fl,grams,o['price'],x['url'],'In stock' if o.get('availability','').endswith('/InStock') else 'Sold out',subclass=sub,formulation='With CreAbsorb' if 'CreAMP' in name else 'Not specified',**r)
# Myprotein: structured variants and selected flavour nutrition, never a table from another flavour.
for i in [5,6]:
 x=extra[i]
 for s in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',x['html'],re.S):
  try:j=json.loads(s)
  except:continue
  for group in j.get('@graph',[]):
   for v in group.get('hasVariant',[]):
    w=v['weight'];grams=float(w['value'])*(1000 if w['unitText']=='kg' else 1);o=v['offers'];fl=next(a['value'] for a in v['additionalProperty'] if a['name']=='flavour');page=next((a for a in variants if a['url']==o['url']),None);t=page.get('text','') if page else '';r={}
    if fl=='Unflavoured':pure(r,'Selected variant ingredients: creatine monohydrate (100%).');r.update(scoop=3,serving=3,creatineServing=3)
    else:
     m=re.search(r'Serving Size\s*[–-]\s*(\d+(?:\.\d+)?)g.*?Per 100g.*?Creatine Monohydrate\s*(\d+(?:\.\d+)?)\s*g\s*(\d+(?:\.\d+)?)\s*g',t,re.I)
     if m:r.update(scoop=float(m[1]),serving=float(m[1]),creatine=float(m[2]),creatineServing=float(m[3]),basis='Flavour-selected table explicitly states monohydrate grams per 100g; label rounding retained.',formulation='Flavoured')
    em=re.search(r'Per 100g.*?Energy\s*(\d+(?:\.\d+)?)\s*kcal',t,re.I)
    if em:r.update(energy=float(em[1]),energyBasis='Selected variant nutrition table, Per 100g column.')
    if i==6:r.update(grade='Creapure®',subclass='Micronized',notes='Table header says per 4g serving while serving heading says 3g; per100g quantity used independently, scoop uses heading.')
    add('Myprotein',group['name'],fl,grams,o['price'],o['url'],'In stock' if o.get('availability','').endswith('/InStock') else 'Sold out',**r)
# Visually verified official label photos. Unknown or ambiguous flavour images are not assigned.
if (OUT/'label_manifest.json').exists():
 manifest=json.loads((OUT/'label_manifest.json').read_text());labels={m['id']:m for m in manifest}
 def label(r,ident,scoop,serving,compound,concentration,energy,note=''):
  r.update(scoop=scoop,serving=serving,creatineServing=compound,creatine=concentration,energy=energy,nutritionUrl=labels[ident]['url'],basis='Official product label, visually verified: named creatine compound quantity; per100g stated or calculated from serving.',energyBasis='Official label per100g energy or serving kcal × 100 / serving grams.',notes=' '.join(filter(None,[r['notes'],note])))
 for r in offers:
  if r['brand']=='Wellcore':
   if r['flavour']=='Cranberry Crush':label(r,'cadc811a00ba',4.07,4.07,3,3/4.07*100,0,'338g label used for same product/flavour in both pack sizes. Contains iron and vitamins.');r['formulation']='With vitamins and iron'
   elif r['flavour']=='Lemon Lime':label(r,'3d03d41ca32a',4.5,4.5,3,3/4.5*100,0,'374g label used for same product/flavour in both pack sizes.')
   elif r['flavour'] in ['Watermelon Wave','Kiwi Kick','Fruit Fusion','Tropical Tango']:
    ident={'Watermelon Wave':'41eea5a83e53','Kiwi Kick':'46f93ea85004','Fruit Fusion':'07c4d4bf89f4','Tropical Tango':'4720d98b6e8a'}[r['flavour']]
    label(r,ident,3.7,3.7,3,3/3.7*100,0,'Same product/flavour label used across both pack sizes.')
   elif r['flavour']=='Unflavoured':
    label(r,'9be8e5eb1e9b',3,3,3,100,0,'Label includes antioxidant INS300. 3g compound / approx. 3g serving is rounded, not a 100% purity assay.');r['formulation']='With antioxidant'
  if r['brand']=='Wellbeing Nutrition':label(r,'73625cd1b020',3.3,3.3,3,3/3.3*100,0,'3g monohydrate and 0.3g taurine per approximate 3.3g scoop.');r['notes']=r['notes'].replace('Total serving weight is unverified, so concentration and compound cost are blank.','Verified label establishes the serving weight.')
  if r['brand']=='NAKPRO' and r['flavour']=='Unflavoured':label(r,'319c6dc3c333',3,3,3,100,0,'250g unflavoured label used across same formula pack sizes.')
  if r['brand']=='Muscle Nectar':
   if r['grade']=='Creapure®':label(r,'c1b93e7a6f4d',None,3,2.998,99.9,0,'Brand per100g column states 99.9g, while 2.998g / 3g differs slightly due to label rounding; per100g retained. Same formula across sizes.')
   else:label(r,'11b1d6782523',3,3,2.998,2.998/3*100,0,'100g label used for same unflavoured formula at 250g. Contains 2.5mg piperine per serving.');r['formulation']='With piperine'
   r['notes']=r['notes'].replace('Exact powder serving weight not verified.','')
  if r['brand']=='Beastlife' and r['product']=='Creatine Nano 400' and r['flavour']=='Shikanji':label(r,'0eb2a81b07c5',3.8,3.8,3,78.95,6.12,'115g label used for same formula at 305g. Label per100g energy 6.12 differs from 0.19kcal per serving after scaling; per100g retained.')
  r['cost']=r['price']/(r['grams']*r['creatine']/100) if r['creatine'] else None;r['doseCost']=r['cost']*3 if r['cost'] else None
offers.sort(key=lambda r:(r['brand'],r['product'],r['flavour'],r['packaging'],r['grams']))
for i,r in enumerate(offers):r['id']='cr-'+str(i)
assert len(set((r['url'],r['grams']) for r in offers))==len(offers)
payload=dict(checked='2026-10-25',category='creatine',costBasis='Labelled creatine compound mass; not free-creatine equivalent or equal efficacy across chemical forms.',offers=offers)
(ROOT/'docs/data/creatine.json').write_text(json.dumps(payload,ensure_ascii=False),encoding='utf-8')
(OUT/'exclusions.json').write_text(json.dumps(exclusions,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps(dict(offers=len(offers),brands=collections.Counter(r['brand'] for r in offers),types=collections.Counter(r['type'] for r in offers),compoundCost=sum(r['cost'] is not None for r in offers),scoop=sum(r['scoop'] is not None for r in offers),energy=sum(r['energy'] is not None for r in offers))))
