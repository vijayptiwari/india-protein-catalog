export const facets = [['brand','Brand'],['product','Product'],['type','Protein source'],['subclass','Protein subclass'],['flavour','Flavour'],['kg','Pack size (kg)'],['stock','Availability']];
export const metrics = [['price','Pack price (₹)'],['cost','Cost / g protein (₹)'],['protein','Protein (%)'],['scoop','Scoop size (g)'],['energy','Energy (kcal / 100 g)']];
export function filterOffers(offers,state){return offers.filter(r=>{
 if(state.q && ![r.brand,r.product,r.flavour,r.type,r.subclass].join(' ').toLowerCase().includes(state.q.toLowerCase()))return false;
 for(const [key] of facets)if(state[key]?.length&&!state[key].includes(String(r[key])))return false;
 for(const [key] of metrics){const min=state[key+'Min'],max=state[key+'Max'];if(min!==undefined&&min!==''&&(r[key]==null||r[key]<Number(min)))return false;if(max!==undefined&&max!==''&&(r[key]==null||r[key]>Number(max)))return false;}
 return !state.complete || ['protein','scoop','energy'].every(k=>r[k]!=null);
 });}
export function sortOffers(offers,key){return [...offers].sort((a,b)=>{if(key==='brand')return a.brand.localeCompare(b.brand)||a.product.localeCompare(b.product)||a.flavour.localeCompare(b.flavour)||a.kg-b.kg;if(a[key]==null)return b[key]==null?0:1;if(b[key]==null)return -1;return (a[key]-b[key])*(key==='protein'?-1:1);});}
export function csv(offers){const keys=['brand','product','type','subclass','flavour','kg','price','cost','protein','scoop','energy','stock','url','nutritionUrl','basis','notes'];return '\uFEFF'+[keys,...offers.map(r=>keys.map(k=>r[k]??''))].map(row=>row.map(x=>'"'+String(x).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');}
