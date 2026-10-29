"""Import curated label profiles and exact official pack prices.

Inputs are data/additional-sources.json, not UI constants. Unknown label amounts
stay null. Multi-bottle bundles and packs whose count cannot be established are
excluded. --refresh fetches product prices again; label dates remain separate.
"""
import argparse,datetime,html,json,pathlib,re,urllib.request
from html.parser import HTMLParser
ROOT=pathlib.Path(__file__).resolve().parents[1]
class VisibleText(HTMLParser):
 def __init__(self):super().__init__();self.skip=False;self.parts=[]
 def handle_starttag(self,t,a):
  if t in ['script','style']:self.skip=True
 def handle_endtag(self,t):
  if t in ['script','style']:self.skip=False
 def handle_data(self,d):
  if not self.skip:self.parts.append(d)
def get(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (Supplement Research)','Accept':'application/json,text/html;q=0.9'}),timeout=25) as response:return response.read().decode('utf-8')
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--as-of',required=True);parser.add_argument('--refresh',action='store_true');args=parser.parse_args();datetime.date.fromisoformat(args.as_of)
 manifest=json.loads((ROOT/'docs/data/additional-sources.json').read_text(encoding='utf-8'));cache=ROOT/'outputs'/('supplements_'+args.as_of.replace('-',''));cache.mkdir(exist_ok=True,parents=True)
 categories={c:[] for c in ['ashwagandha','fish-oil','vitamin-d','magnesium','zmc']};observations=[];excluded=[]
 for entry in manifest['products']:
  brand=entry['brand'];base=entry['base'];handle=entry['handle'];url=base+'/products/'+handle
  if entry.get('kind')=='html':
   raw_path=cache/(entry['cacheKey']+'.txt');raw=get(url) if args.refresh or not raw_path.exists() else raw_path.read_text(encoding='utf-8');raw_path.write_text(raw,encoding='utf-8')
   reader=VisibleText();reader.feed(raw);text=re.sub(r'\s+',' ',' '.join(reader.parts));start=text.find('Key Features');primary=text[start:start+3500] if start>=0 else ''
   match=re.search(r'₹\s*([\d,]+(?:\.\d+)?)\s+MRP',primary)
   if not match:raise ValueError('Exact primary price not established: '+url)
   variants=[dict(id=entry['id'],title=entry['form'],price=match[1].replace(',',''),available=None)];evidence=url
  else:
   feed_path=cache/(re.sub(r'\W+','_',brand)+'.json');product_path=cache/(handle+'.json')
   if not args.refresh and feed_path.exists():
    product=next((p for p in json.loads(feed_path.read_text(encoding='utf-8')).get('products',[]) if p['handle']==handle),None);evidence=base+'/products.json?limit=250'
   else:product=None
   if product is None:
    evidence=url+'.json';text=get(evidence) if args.refresh or not product_path.exists() else product_path.read_text(encoding='utf-8');product_path.write_text(text,encoding='utf-8');product=json.loads(text)['product']
   variants=product['variants']
  for variant in variants:
   title=variant['title']
   if entry.get('variantTitles') and title not in entry['variantTitles']:continue
   count_title=re.fullmatch(r'Pack of (\d+)',title,re.I) if entry.get('countFromPackTitle') else None
   if not count_title and re.search(r'pack\s+of\s*[2-9]\b|\b[2-9]\s*boxes|\bx\s*[2-9]|\b[2-9]\s*x\b',title,re.I):continue
   quantity=entry.get('packCount');count=re.search(r'(\d+)\s*(?:tablets?|tabs?|capsules?|softgels?|gummies|oral strips?|\bN\b)',title,re.I)
   if count_title:quantity=int(count_title[1])
   elif count:quantity=int(count[1])
   elif title.isdigit():quantity=int(title)
   if not quantity:excluded.append(dict(url=url,variant=variant['id'],reason='Pack count not verified.'));continue
   row={k:v for k,v in entry.items() if k not in ['category','base','handle','variantTitles','cacheKey','kind','id']}
   row.update(id=entry.get('id') or f"{entry['category']}-{variant['id']}",product=entry['product'],packCount=quantity,price=float(variant['price']),currency='INR',stock='In stock' if variant.get('available') is True else 'Sold out' if variant.get('available') is False else 'Listed; confirm stock',url=url if entry.get('kind')=='html' else url+'?variant='+str(variant['id']),nutritionUrl=entry.get('nutritionUrl',url),flavour=entry.get('flavour','Unflavoured'),packaging=entry.get('packaging','Single retail pack'),labelChecked=entry.get('labelChecked',manifest['labelChecked']))
   categories[entry['category']].append(row);observations.append(dict(category=entry['category'],offerId=row['id'],date=args.as_of,price=row['price'],currency='INR',sourceUrl=row['url'],evidenceUrl=evidence,kind='official-live',matchBasis='Official primary product page and explicitly selected pack' if entry.get('kind')=='html' else 'Official Shopify exact variant ID; single-pack count verified',variantId=None if entry.get('kind')=='html' else str(variant['id'])))
 for category,offers in categories.items():
  if not offers:raise ValueError('No verified packs for '+category)
  (ROOT/'docs/data'/(category+'.json')).write_text(json.dumps(dict(checked=args.as_of,category=category,offers=offers),ensure_ascii=False,indent=2),encoding='utf-8');print(category,len(offers),'offers',len({r['brand'] for r in offers}),'brands')
 ledger_path=ROOT/'docs/data/price-observations.json';ledger=json.loads(ledger_path.read_text(encoding='utf-8'));key=lambda r:(r['category'],str(r['offerId']),r['date'],r['price'],r['evidenceUrl']);merged={key(r):r for r in ledger['observations']}
 merged.update({key(r):r for r in observations});ledger.update(checked=max(ledger.get('checked',''),args.as_of),observations=list(merged.values()));ledger_path.write_text(json.dumps(ledger,ensure_ascii=False),encoding='utf-8')
 (cache/'excluded.json').write_text(json.dumps(excluded,indent=2),encoding='utf-8')
if __name__=='__main__':main()
