import {escapeHtml as esc,formatDate} from './model.js';
export function selectResearch(research,{category='',kind='',q=''}={}){
 const query=q.trim().toLowerCase(),articles=research.articles.filter(a=>(!category||a.category===category)&&(!query||[a.title,a.summary,a.evidence,a.catalogReading,...(a.bodySteps||[]),a.treatment,a.whoMayBenefit,a.routineUse,a.safety].join(' ').toLowerCase().includes(query)));
 const ids=new Set(research.articles.filter(a=>!category||a.category===category).flatMap(a=>a.sourceIds));
 const sources=research.sources.filter(s=>ids.has(s.id)&&(!kind||s.kind===kind)&&(!query||[s.title,s.summary,s.limitations].join(' ').toLowerCase().includes(query)));
 return {articles,sources};
}
const external=(s)=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`;
export function renderResearch(snapshot){
 const data=snapshot.research;if(!data)return;
 const root=document.querySelector('#research-library');if(!root)return;
 if(!root.dataset.ready){
  root.innerHTML=`<div class="research-controls"><label for="research-category">Supplement category<select id="research-category"><option value="">All supplements</option>${snapshot.config.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('')}</select></label><label for="research-query">Find a topic<input id="research-query" type="search" placeholder="Search evidence, forms or outcomes"></label><label for="research-kind">Reference type<select id="research-kind"><option value="">All reference types</option>${[...new Set(data.sources.map(s=>s.kind))].map(k=>`<option>${esc(k)}</option>`).join('')}</select></label></div><p id="research-count" role="status"></p><section><h2>Supplement guides</h2><div id="research-guides"></div></section><section><h2>Research &amp; further reading</h2><p class="hint">Reference-type filters apply to this reading list. Guides remain available for context.</p><div id="research-sources" class="research-grid"></div></section>`;
  const params=new URLSearchParams(location.search);document.querySelector('#research-category').value=snapshot.categories[params.get('category')]?params.get('category'):'';document.querySelector('#research-query').value=params.get('q')||'';document.querySelector('#research-kind').value=params.get('kind')||'';
  root.dataset.ready='true';
 }
 const categorySelect=document.querySelector('#research-category'),kindSelect=document.querySelector('#research-kind'),selectedCategory=categorySelect.value,selectedKind=kindSelect.value;
 categorySelect.innerHTML=`<option value="">All supplements</option>${snapshot.config.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('')}`;
 kindSelect.innerHTML=`<option value="">All reference types</option>${[...new Set(data.sources.map(s=>s.kind))].map(k=>`<option>${esc(k)}</option>`).join('')}`;
 categorySelect.value=snapshot.categories[selectedCategory]?selectedCategory:'';kindSelect.value=[...kindSelect.options].some(o=>o.value===selectedKind)?selectedKind:'';
 const update=()=>{
  const state={category:document.querySelector('#research-category').value,q:document.querySelector('#research-query').value,kind:document.querySelector('#research-kind').value};const {articles,sources}=selectResearch(data,state),refs=new Map(data.sources.map(s=>[s.id,s]));
  const params=new URLSearchParams(Object.entries(state).filter(([,v])=>v));history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);
  document.querySelector('#research-count').textContent=`${articles.length} ${articles.length===1?'guide':'guides'} · ${sources.length} ${sources.length===1?'reference':'references'} · editorial review ${formatDate(data.reviewed)}`;
  document.querySelector('#research-scope').textContent=data.scope;
  document.querySelector('#research-guides').innerHTML=articles.map(a=>`<article class="method-card research-article" id="${esc(a.id)}"><span class="badge-type">${esc(snapshot.categories[a.category].label)}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><p class="hint">${esc(a.author)} · Reviewed ${formatDate(a.reviewed)}</p><section class="body-process"><h4>How the body processes it</h4><ol>${a.bodySteps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><p class="hint">Mechanism sources: ${a.bodySources.map(id=>external(refs.get(id))).join(' · ')}</p></section>${[['Supported benefits',a.evidence],['What it can treat — and what it cannot',a.treatment],['Who may benefit or need assessment',a.whoMayBenefit],['Does anyone need to always take it?',a.routineUse]].map(([heading,text])=>`<h4>${heading}</h4><p>${esc(text)}</p>`).join('')}<p class="hint">Evidence and clinical context: ${a.sectionSources.map(id=>external(refs.get(id))).join(' · ')}</p>${[['Limitations',a.limitations],['How to read the catalog',a.catalogReading],['Who should avoid it or seek advice',a.safety]].map(([heading,text])=>`<h4>${heading}</h4><p>${esc(text)}</p>`).join('')}<h4>Sources for this guide</h4><ul>${a.sourceIds.map(id=>`<li>${external(refs.get(id))}</li>`).join('')}</ul><a href="${esc(snapshot.categories[a.category].page)}">Compare ${esc(snapshot.categories[a.category].label)} products →</a></article>`).join('')||'<p>No guides match these filters. Clear the search or choose another category.</p>';
  document.querySelector('#research-sources').innerHTML=sources.map(s=>`<article class="method-card"><span class="badge-type">${esc(s.kind)}</span><h3>${external(s)}</h3><p>${esc(s.summary)}</p><p><strong>Scope &amp; limitations:</strong> ${esc(s.limitations)}</p><p class="hint">${s.year?'Published '+s.year+' · ':''}Link and summary checked ${formatDate(s.checked)}. Consult the source for full methods, funding and disclosures.</p></article>`).join('')||'<p>No references match these filters.</p>';
 };
 root.oninput=update;root.onchange=update;update();
}
