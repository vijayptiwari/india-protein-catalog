"""Cache official public product feeds for the additional supplement catalogs."""
import concurrent.futures,json,pathlib,re,urllib.request,gzip
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'outputs/supplements_20261029';OUT.mkdir(exist_ok=True,parents=True)
STORES={
 'HK Vitals':'https://www.hkvitals.com','Himalaya':'https://himalayawellness.in',
 'Carbamide Forte':'https://www.carbamideforte.com','Naturaltein':'https://naturaltein.in',
 'Muscle Nectar':'https://musclenectar.com','Nutrabay':'https://nutrabay.com',
 'HealthyHey':'https://healthyhey.com','Wellbeing Nutrition':'https://wellbeingnutrition.com',
 'Swisse':'https://swisse.co.in','TrueBasics':'https://www.truebasics.com',
 'GNC':'https://www.guardian.in','Organic India':'https://organicindia.com'}
def run(item):
 brand,base=item;cache=OUT/(re.sub(r'\W+','_',brand)+'.json')
 try:
  if cache.exists():data=json.loads(cache.read_text(encoding='utf-8'))
  else:
   url=base+'/products.json?limit=250';req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'application/json'})
   with urllib.request.urlopen(req,timeout=20) as res:raw=res.read()
   if raw.startswith(b'\x1f\x8b'):raw=gzip.decompress(raw)
   data=json.loads(raw);cache.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
  products=[p for p in data.get('products',[]) if re.search(r'ash[wv]ag|fish.?oil|omega.?3|magnesium|vitamin.?d|calcium.*zinc|zinc.*calcium',p['title'],re.I) and not re.search(r'combo|pack of|\bwith.*protein|\bsipper\b',p['title'],re.I)]
  return {'brand':brand,'base':base,'allProducts':len(data.get('products',[])),'products':[{'id':p['id'],'handle':p['handle'],'title':p['title'],'variants':[{'id':v['id'],'title':v['title'],'price':v['price'],'available':v.get('available')} for v in p['variants']]} for p in products]}
 except Exception as e:return {'brand':brand,'base':base,'error':str(e)}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(run,STORES.items()))
 (OUT/'discovery.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
 for r in results:
  print(r['brand'],r.get('error',f"{r.get('allProducts')} products, {len(r.get('products',[]))} matches"))
  for p in r.get('products',[]):print(' ',p['handle'],[(v['title'],v['price']) for v in p['variants']])
