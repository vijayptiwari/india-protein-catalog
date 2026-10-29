import {escapeHtml as esc} from './model.js';

const selectedValues=value=>(Array.isArray(value)?value:value==null||value===''?[]:[value]).filter(v=>v!=null&&v!=='').map(String);
export function isFacetChecked(value,inputValue){return selectedValues(value).includes(String(inputValue));}

export function facetMarkup(offers,definitions,previous={},openKeys=new Set()){
 return definitions.map(([key,label])=>{
  const counts=new Map();
  for(const offer of offers){const raw=offer[key];if(raw==null||raw==='')continue;const value=String(raw);counts.set(value,(counts.get(value)||0)+1);}
  const selected=selectedValues(previous[key]),values=[...new Set([...counts.keys(),...selected])],numeric=['kg','grams','packCount'].includes(key);
  values.sort((a,b)=>{if(numeric){const x=Number(a),y=Number(b),xf=Number.isFinite(x),yf=Number.isFinite(y);if(xf&&yf)return x-y||a.localeCompare(b);if(xf!==yf)return xf?-1:1;}return a.localeCompare(b);});
  const open=openKeys.has(key)||selected.length>0;
  return `<details data-facet="${esc(key)}"${open?' open':''}><summary><span class="filter-label">${esc(label)}</span><span class="filter-count" aria-label="${counts.size} available options">${counts.size}</span></summary>${values.length>7?`<input type="search" data-facet-search="${esc(key)}" aria-label="Find ${esc(label)}" placeholder="Find ${esc(label)}" autocomplete="off">`:''}<div class="facet-options">${values.map(value=>{const count=counts.get(value)||0,stale=!counts.has(value);return `<label class="facet-option"><input type="checkbox" name="${esc(key)}" value="${esc(value)}" aria-label="${esc(label+': '+value)}"${isFacetChecked(previous[key],value)?' checked':''}><span>${esc(value)}${stale?' <em>no current offers</em>':''}</span><small aria-label="${count} matching offers">${count}</small></label>`;}).join('')}</div></details>`;
 }).join('');
}
