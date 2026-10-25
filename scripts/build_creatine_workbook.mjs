import fs from 'node:fs/promises';
import path from 'node:path';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const root=process.cwd(),dir=path.join(root,'outputs/creatine_catalog_20261025');
const {offers}=JSON.parse(await fs.readFile(path.join(root,'docs/data/creatine.json'),'utf8'));
const wb=Workbook.create(),s=wb.worksheets.add('Creatine catalog'),m=wb.worksheets.add('Method');
const headers=['Brand','Product name','Chemical form','Processing subclass','Ingredient trademark','Formulation','Flavour','Packaging','Net pack weight (g)','Pack price (INR)','Cost / g powder (INR)','Labelled compound (g / 100g)','Cost / g compound (INR)','Cost / 3g compound (INR)','Scoop size (g)','Serving size (g)','Compound per serving (g)','Energy (kcal / 100g)','Availability','Checked date','Record ID','Evidence / limitations'];
const end=offers.length+5;
s.getRange('A1:V1').merge();s.getRange('A1').values=[['INDIA CREATINE CATALOG']];
s.getRange('A2:V2').merge();s.getRange('A2').values=[[`${new Set(offers.map(r=>r.brand)).size} brands | ${offers.length} exact single-pack offers | Research checked 25 October 2026`]];
s.getRange('A3:V3').merge();s.getRange('A3').values=[['Compound cost uses the labelled chemical form, not free-creatine equivalents. Blank means unverified. Filter rows to compare exact sizes. See Method.']];
s.getRange('A5:V5').values=[headers];
s.getRange(`A6:V${end}`).values=offers.map(r=>[r.brand,r.product,r.type,r.subclass,r.grade,r.formulation,r.flavour,r.packaging,r.grams,r.price,null,r.creatine,null,null,r.scoop,r.serving,r.creatineServing,r.energy,r.stock,new Date('2026-10-25T00:00:00Z'),r.id,[r.basis,r.notes].filter(Boolean).join(' ')]);
s.getRange(`K6:K${end}`).formulas=offers.map((r,i)=>[`=J${i+6}/I${i+6}`]);
s.getRange(`M6:N${end}`).formulas=offers.map((r,i)=>{const n=i+6;return [`=IF(OR(L${n}="",L${n}=0),"",J${n}/(I${n}*L${n}/100))`,`=IF(M${n}="","",M${n}*3)`];});
s.getRange('X5:AA5').values=[['Product / price source URL','Nutrition source URL','Quantity calculation basis','Energy basis']];
s.getRange(`X6:AA${end}`).values=offers.map(r=>[r.url,r.nutritionUrl,r.basis,r.energyBasis]);
s.tables.add(`A5:V${end}`,true,'CreatineCatalog').showFilterButton=true;s.freezePanes.freezeRows(5);s.showGridLines=false;s.tabColor='#254F38';
s.getRange(`A1:AA${end}`).format.font={name:'Arial',size:10,color:'#20362B'};
s.getRange(`A5:AA${end}`).format.wrapText=true;s.getRange(`A6:V${end}`).format.rowHeight=44;s.getRange(`A6:AA${end}`).format.verticalAlignment='center';
s.getRange('A1:V1').format={fill:'#254F38',font:{size:20,bold:true,color:'#FFFFFF'},rowHeight:38};
s.getRange('A2:V2').format={fill:'#EAF0E3',rowHeight:28};s.getRange('A3:V3').format={font:{size:10,color:'#627561'},rowHeight:28};
s.getRange('A5:V5').format={fill:'#254F38',font:{bold:true,color:'#FFFFFF'},rowHeight:48,wrapText:true};s.getRange('X5:AA5').format={fill:'#254F38',font:{bold:true,color:'#FFFFFF'},rowHeight:48,wrapText:true};
for(const c of ['A','C','D','E','F','G','H','S'])s.getRange(`${c}5:${c}${end}`).format.columnWidth=24;
for(const c of ['I','J','K','L','M','N','O','P','Q','R','T'])s.getRange(`${c}5:${c}${end}`).format.columnWidth=19;
s.getRange(`B5:B${end}`).format.columnWidth=49;s.getRange(`U5:U${end}`).format.columnWidth=14;s.getRange(`V5:V${end}`).format.columnWidth=75;s.getRange(`X5:AA${end}`).format.columnWidth=65;s.getRange(`X6:AA${end}`).format.rowHeight=44;
for(const c of ['I','O','P','Q','R','L'])s.getRange(`${c}6:${c}${end}`).setNumberFormat('0.00');
for(const c of ['J','K','M','N'])s.getRange(`${c}6:${c}${end}`).setNumberFormat('"₹"#,##0.00');
s.getRange(`T6:T${end}`).setNumberFormat('yyyy-mm-dd');
s.getRange(`I6:J${end}`).format.font.color='#1757A6';s.getRange(`L6:L${end}`).format.font.color='#1757A6';s.getRange(`M6:N${end}`).format.fill='#EAF2E2';
const method=[
 ['METHOD & COVERAGE','CREATINE CATALOG'],
 ['Research date','25 October 2026. Prices/stock are snapshots; confirm at checkout.'],
 ['Pack selection','Actual single-pack net weights, including small packs. No extrapolated 1kg/2kg/4kg prices. Excludes multipacks, accessory bundles, gifts, gummies and tablets.'],
 ['Chemical form','Monohydrate, hydrochloride (HCl), nitrate. HMB, taurine and piperine are co-ingredients, not chemical creatine forms.'],
 ['Processing subclass','Micronized, ultra-micronized, microfine and Nano 400 are brand descriptions. No unverified classification as normal, iso or concentrated. Not specified means not verified.'],
 ['Ingredient trademark','Creapure and Creasure are ingredient trademarks, not separate chemical forms. No inference of particle size or product concentration solely from a trademark.'],
 ['Powder cost','Pack price / labelled net pack grams. Available even when compound concentration is unknown.'],
 ['Compound concentration','Grams of the named creatine compound per 100g of finished powder. Explicit ingredient claims or paired serving/compound quantities; flavour-specific tables used where available.'],
 ['Compound cost','Price / (pack grams × compound g per 100g / 100). Not normalized to free-creatine equivalent; monohydrate includes water and HCl/nitrate includes counter-ion mass.'],
 ['3g comparison cost','3 × cost per gram of labelled compound. A comparison quantity only; not a dosage recommendation or equal-efficacy claim.'],
 ['Nitrate example','NutriJa states 2g nitrate compound in a 2g serving, and separately describes a 67% creatine / 33% nitrate composition. The cost denominator uses the full nitrate compound, not 67% free creatine.'],
 ['Missing information','Blank cells mean unverified, not zero or unavailable. No inferred zero calories. Brand serving claims may be rounded or inconsistent; evidence notes identify conflicts.'],
 ['Scoop vs serving','Scoop filled only where specified. Not inferred from number of servings, net weight, or ingredient amount. Review source notes for approximate scoop weights.'],
 ['Price basis','Official public selling prices before optional coupon codes, delivery, checkout adjustments or loyalty pricing. NutriJa uses exact child finalPrice including paise, while its headline rounds.'],
 ['Availability','Sold-out variants retained and labelled. Listed; confirm stock means no variant-level availability confirmation.'],
 ['Coverage','Research selection across brands available in India, not a sales ranking or exhaustive census. GNC canonical product families used to avoid duplicate obsolete landing offers.'],
 ['Evidence location','Product and nutrition URLs and calculation bases sit alongside the source inputs in columns X:AA of Creatine catalog.'],
 ['Offers',offers.length],['Brands',new Set(offers.map(r=>r.brand)).size],['Compound cost populated',offers.filter(r=>r.cost!=null).length],['Scoop populated',offers.filter(r=>r.scoop!=null).length],['Energy populated',offers.filter(r=>r.energy!=null).length],
 ];
m.getRange(`A1:B${method.length}`).values=method;m.getRange(`A1:B${method.length}`).format={font:{name:'Arial',size:11,color:'#20362B'},wrapText:true,verticalAlignment:'center',rowHeight:58};m.getRange('A:A').format.columnWidth=29;m.getRange('B:B').format.columnWidth=113;m.getRange('A1:B1').format={fill:'#254F38',font:{bold:true,color:'#FFFFFF'},rowHeight:32};m.showGridLines=false;m.freezePanes.freezeRows(1);
wb.recalculate();
for(let i=0;i<offers.length;i++){const r=offers[i],n=i+6;for(const [col,expected]of [['K',r.powderCost],['M',r.cost],['N',r.doseCost]]){const actual=s.getRange(`${col}${n}`).values[0][0];if(expected==null){if(actual!==''&&actual!==null)throw Error(`${col}${n} expected blank`);}else if(Math.abs(actual-expected)>1e-8)throw Error(`${col}${n} mismatch`);}}
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!',options:{useRegex:true,maxResults:20},summary:'Creatine formula verification'})).ndjson);
for(const [sheetName,range,file]of [['Creatine catalog','A5:F12','catalog_preview.png'],['Creatine catalog','I5:R14','pricing_preview.png'],['Method','A1:B12','method_preview.png']]){const blob=await wb.render({sheetName,range,scale:1.5});await fs.writeFile(path.join(dir,file),new Uint8Array(await blob.arrayBuffer()));}
const output=await SpreadsheetFile.exportXlsx(wb);await output.save(path.join(dir,'India_Creatine_Catalog.xlsx'));
await fs.copyFile(path.join(dir,'India_Creatine_Catalog.xlsx'),path.join(root,'docs/data/India_Creatine_Catalog.xlsx'));
console.log(JSON.stringify({offers:offers.length,file:'India_Creatine_Catalog.xlsx',formulaChecks:offers.length*3}));
