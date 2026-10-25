"""Check exported values, formulas and native Excel controls against the website data."""
import pathlib,json,zipfile,xml.etree.ElementTree as ET,shutil
root=pathlib.Path(__file__).resolve().parents[1];out=root/'outputs/creatine_catalog_20261025';file=out/'India_Creatine_Catalog.xlsx'
offers=json.loads((root/'docs/data/creatine.json').read_text(encoding='utf-8'))['offers'];ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'};tag='{'+ns['s']+'}'
with zipfile.ZipFile(file) as z:
 sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));strings=[]
 if 'xl/sharedStrings.xml' in z.namelist():strings=[''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
 cells={c.attrib['r']:c for c in sheet.findall('.//s:sheetData/s:row/s:c',ns)}
 def value(ref):
  c=cells.get(ref)
  if c is None:return None
  assert c.get('t')!='e',f'Formula error at {ref}'
  if c.get('t')=='inlineStr':return ''.join(c.find('s:is',ns).itertext())
  v=c.find('s:v',ns)
  if v is None:return None
  if c.get('t')=='s':return strings[int(v.text)]
  return v.text
 for i,r in enumerate(offers,6):
  assert value(f'U{i}')==r['id'];assert float(value(f'I{i}'))==r['grams'];assert float(value(f'J{i}'))==r['price'];assert value(f'A{i}')==r['brand'];assert value(f'G{i}')==r['flavour']
  for c,key in [('K','powderCost'),('M','cost'),('N','doseCost')]:
   actual=value(f'{c}{i}');expected=r[key]
   assert cells[f'{c}{i}'].find('s:f',ns) is not None
   if expected is None:assert actual in [None,'']
   else:assert abs(float(actual)-expected)<1e-8
 assert not any(r.get('hidden')=='1' for r in sheet.findall('.//s:row',ns))
 pane=sheet.find('.//s:pane',ns);assert pane is not None and pane.get('ySplit')=='5'
 tables=[n for n in z.namelist() if n.startswith('xl/tables/') and n.endswith('.xml')]
 assert len(tables)==1
 table=ET.fromstring(z.read(tables[0]));assert table.get('ref')==f'A5:V{len(offers)+5}'
 # Artifact export sometimes omits autoFilter despite showFilterButton=true.
 missing_filter=table.find('s:autoFilter',ns) is None
 if missing_filter:
  ET.SubElement(table,tag+'autoFilter',{'ref':table.get('ref')})
  contents={n:z.read(n) for n in z.namelist()};contents[tables[0]]=ET.tostring(table,encoding='utf-8',xml_declaration=True)
if missing_filter:
 with zipfile.ZipFile(file,'w',zipfile.ZIP_DEFLATED) as z:
  for name,data in contents.items():z.writestr(name,data)
shutil.copyfile(file,root/'docs/data/India_Creatine_Catalog.xlsx')
print(json.dumps(dict(offers=len(offers),formula_checks=len(offers)*3,autoFilter=True,file_bytes=file.stat().st_size)))
