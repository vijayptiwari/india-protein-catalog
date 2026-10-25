from research_creatine import *
from PIL import Image
import io,hashlib
pages=json.loads((OUT/'pages.json').read_text(encoding='utf-8'));manifest=[]
for x in pages:
 p=x['product'];title=p['title'];d=x['domain']
 if re.search(r'combo|gummies|gift|free\b|stack|duo|sachet|fish oil|shaker|carnitine|gym bag|clearance|\+|protein',title,re.I):continue
 if d=='gnc.in' and p['id'] not in [7641336676583,9517963247847]:continue
 if d not in ['nakpro.com','beastlife.in','wellversed.in','musclenectar.com','www.bigmusclesnutrition.com','wellbeingnutrition.com','naturaltein.in','www.fastandup.in']:continue
 images=p['images'];selected=[a for a in images if re.search('nutri|fact|bop|back|info|label',a['src'],re.I)]
 if not selected:selected=images[1:7]
 for a in selected:
  url=a['src'];ident=hashlib.md5(url.encode()).hexdigest()[:12];file=OUT/'labels'/(ident+'.jpg');manifest.append(dict(id=ident,file=str(file),url=url,pid=p['id'],domain=d,title=title,variant_ids=a.get('variant_ids',[])))
(OUT/'labels').mkdir(exist_ok=True)
def run(m):
 try:
  b=urllib.request.urlopen(urllib.request.Request(m['url'],headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read();im=Image.open(io.BytesIO(b)).convert('RGB');im.thumbnail((2100,2100));im.save(m['file']);return True
 except:return False
results=list(concurrent.futures.ThreadPoolExecutor(max_workers=16).map(run,manifest));manifest=[m for m,ok in zip(manifest,results) if ok]
(OUT/'label_manifest.json').write_text(json.dumps(manifest),encoding='utf-8');print('Downloaded',len(manifest),'labels')
# Extra Creapure family and its exact linked weights.
u='https://www.muscleblaze.com/sv/muscleblaze-creapro-creatine-with-creapure-powder-from-germany/SP-38004?navKey=VRNT-168473'
raw=get(u);(OUT/'creapro.json').write_text(json.dumps(dict(url=u,html=raw,text=clean(raw))),encoding='utf-8')
