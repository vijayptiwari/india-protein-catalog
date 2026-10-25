from research_creatine import *
manifest=json.loads((OUT/'label_manifest.json').read_text());ocr=json.loads((OUT/'label_ocr.json').read_text(encoding='utf-8-sig'))
for a in ocr:
 t=a.get('text','')
 if not re.search('serving size|size per serving|energy.*kcal|nutrition|supplement facts',t,re.I):continue
 m=next(x for x in manifest if x['id']==a['id'])
 print('\nLABEL',a['id'],m['domain'],m['pid'],m['title'],m['variant_ids']);print(t[:2000])
