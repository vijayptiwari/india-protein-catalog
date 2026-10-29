import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadBundle} from '../scripts/build_site.mjs';
import {createSnapshot} from '../docs/model.js';
import {selectResearch} from '../docs/research.js';
test('every catalog category has a dated guide with resolvable official or scientific sources',async()=>{const b=await loadBundle(),s=createSnapshot(b);assert.deepEqual(s.quality.errors,[]);for(const c of b.config.categories){const {articles,sources}=selectResearch(s.research,{category:c.id});assert.ok(articles.length);assert.ok(sources.length);assert.ok(articles.every(a=>a.sourceIds.every(id=>sources.some(r=>r.id===id))));}});
test('research filters combine category, text and study type, including empty results',async()=>{const {research}=await loadBundle();assert.equal(selectResearch(research,{category:'fish-oil',kind:'Randomized trial'}).sources.length,1);assert.equal(selectResearch(research,{q:'not-a-research-topic'}).articles.length,0);assert.ok(selectResearch(research,{q:'elemental'}).articles.some(a=>a.category==='magnesium'));});
test('unsafe references and unresolved citations invalidate a dataset update',async()=>{const b=await loadBundle();b.research.sources[0].url='javascript:alert(1)';assert.ok(createSnapshot(b).quality.errors.some(e=>e.field==='research'));b.research.articles[0].sourceIds=['missing'];assert.ok(createSnapshot(b).quality.errors.some(e=>e.field==='research'));});
