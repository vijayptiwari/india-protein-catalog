import { scoreProtein, scoreCreatine } from './core.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = v => '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const number = (v, d = 1) => v == null ? '<span class="unknown">Unknown</span>' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: 0 });

let proteinOffers = [];
let creatineOffers = [];
let currentProteinFilter = 'all';
let currentCreatineFilter = 'all';

function renderProteinTable() {
  const top = computeTopProtein(currentProteinFilter);
  const container = $('#protein-rankings');
  if (!container) return;

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Specimen / Product</th>
            <th>Source / Subclass</th>
            <th>Pack Mass</th>
            <th>Market Price</th>
            <th>₹ / g Protein</th>
            <th>Protein %</th>
            <th>Energy (100g)</th>
            <th>PBES Score</th>
            <th>Audit Dossier</th>
          </tr>
        </thead>
        <tbody>
          ${top.map((r, i) => `
            <tr>
              <td><span class="rank-badge ${i < 3 ? 'rank-top' : ''}">#0${i + 1}</span></td>
              <td>
                <div class="brand">${esc(r.brand)}</div>
                <span class="product">${esc(r.product)}</span>
                <span class="muted">${esc(r.flavour)}</span>
              </td>
              <td><span class="badge">${esc(r.type)}</span><br><span class="muted">${esc(r.subclass || '')}</span></td>
              <td><span class="value">${r.kg} kg</span></td>
              <td class="value">${money(r.price)}</td>
              <td class="value cost">${money(r.cost)}</td>
              <td class="value">${number(r.protein)}%</td>
              <td class="value">${r.energy ? number(r.energy) + ' kcal' : '<span class="unknown">~390 kcal</span>'}</td>
              <td><span class="score-pill">${r.score.toFixed(1)}</span></td>
              <td><button data-cat="protein" data-id="${esc(r.id)}">Dossier [↗]</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCreatineTable() {
  const top = computeTopCreatine(currentCreatineFilter);
  const container = $('#creatine-rankings');
  if (!container) return;

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Specimen / Product</th>
            <th>Chemical Form</th>
            <th>Net Pack Mass</th>
            <th>Market Price</th>
            <th>₹ / g Compound</th>
            <th>Compound %</th>
            <th>Formulation</th>
            <th>CBES Score</th>
            <th>Audit Dossier</th>
          </tr>
        </thead>
        <tbody>
          ${top.map((r, i) => `
            <tr>
              <td><span class="rank-badge ${i < 3 ? 'rank-top' : ''}">#0${i + 1}</span></td>
              <td>
                <div class="brand">${esc(r.brand)}</div>
                <span class="product">${esc(r.product)}</span>
                <span class="muted">${esc(r.flavour)}${r.packaging ? ' · ' + esc(r.packaging) : ''}</span>
              </td>
              <td><span class="badge">${esc(r.type)}</span><br><span class="muted">${esc(r.subclass || '')}</span></td>
              <td><span class="value">${r.grams} g</span></td>
              <td class="value">${money(r.price)}</td>
              <td class="value cost">${money(r.cost)}</td>
              <td class="value">${number(r.creatine)}%</td>
              <td class="muted">${esc(r.grade !== 'Not specified' ? r.grade + ' · ' : '')}${esc(r.formulation)}</td>
              <td><span class="score-pill">${r.score.toFixed(1)}</span></td>
              <td><button data-cat="creatine" data-id="${esc(r.id)}">Dossier [↗]</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function computeTopProtein(filter = 'all') {
  let list = proteinOffers.filter(r => r.cost != null && r.protein != null);
  if (filter === 'whey') list = list.filter(r => r.type.includes('Whey'));
  else if (filter === 'plant') list = list.filter(r => !r.type.includes('Whey'));

  const productMap = new Map();
  for (const r of list) {
    const key = r.brand + ' - ' + r.product;
    const existing = productMap.get(key);
    if (!existing || r.score > existing.score) {
      productMap.set(key, r);
    }
  }

  return Array.from(productMap.values()).sort((a, b) => b.score - a.score).slice(0, 10);
}

function computeTopCreatine(filter = 'all') {
  let list = creatineOffers.filter(r => r.cost != null && r.creatine != null);
  if (filter === 'mono') list = list.filter(r => r.type === 'Monohydrate');
  else if (filter === 'hcl_nitrate') list = list.filter(r => r.type !== 'Monohydrate');

  const productMap = new Map();
  for (const r of list) {
    const key = r.brand + ' - ' + r.product;
    const existing = productMap.get(key);
    if (!existing || r.score > existing.score) {
      productMap.set(key, r);
    }
  }

  return Array.from(productMap.values()).sort((a, b) => b.score - a.score).slice(0, 10);
}

function safeLink(url, label) {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:') return `<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  } catch {}
  return 'Source unavailable';
}

function showDossier(cat, id) {
  const isCreatine = cat === 'creatine';
  const list = isCreatine ? creatineOffers : proteinOffers;
  const r = list.find(x => String(x.id) === String(id));
  if (!r) return;

  const concentration = isCreatine ? r.creatine : r.protein;
  const modal = $('#evidence');
  if (!modal) return;

  $('#evidence-title').textContent = `[SPECIMEN AUDIT] ${r.brand} // ${r.product}`;
  $('#evidence-body').innerHTML = `
    <p><strong>Specimen Classification</strong><br>${esc(r.brand)} · ${esc(r.flavour)} · ${isCreatine ? r.grams + ' g' : r.kg + ' kg'}</p>
    <p><strong>Archived Official Evidence Links</strong><br>${safeLink(r.url, 'Verified Product / Price Source')}<br>${safeLink(r.nutritionUrl, 'Verified Composition / Nutrition Panel')}</p>
    <p><strong>${isCreatine ? 'Creatine Compound' : 'Protein'} Evidence &amp; Assay Basis</strong><br>${esc(r.basis || 'Unverified assay claim')}</p>
    <p><strong>Laboratory Audit Notes</strong><br>${esc(r.notes || 'No anomalies logged.')}</p>
    <p><strong>Caloric &amp; Energy Telemetry</strong><br>${esc(r.energyBasis || 'Unverified energy basis')}</p>
    <p>Serving mass: ${number(r.serving)} g. Scoop mass: ${number(r.scoop)} g. (A standard serving may comprise multiple scoops).</p>
    <p><strong>Empirical Yield Formula:</strong><br>${money(r.price)} ÷ (${isCreatine ? r.grams : r.kg * 1000} g × ${number(concentration, 4)} / 100) = <strong>${money(r.cost)}</strong> per gram of ${isCreatine ? 'labelled active compound' : 'isolated protein'}.</p>
    <p><strong>Bio-Efficiency Score (${isCreatine ? 'CBES' : 'PBES'}):</strong> <span class="score-pill">${r.score.toFixed(1)}</span></p>
    ${isCreatine ? `
      <p>Disclosed active compound / serving: ${number(r.creatineServing)} g.<br>Empirical cost / 3 g active compound: <strong>${money(r.doseCost)}</strong> (analytical reference quantity, not clinical posology).</p>
      <p class="muted">Active compound mass encompasses hydrate, HCl, or nitrate counter-ion fractions. Chemical species are not normalized to free-creatine equivalents. Price ranking carries no clinical efficacy equivalence.</p>
    ` : ''}
    <p class="muted">Laboratory snapshot timestamp: 25 October 2026. Figures exclude promotional voucher codes, logistics tariffs, and checkout adjustments.</p>
  `;
  modal.showModal();
}

async function init() {
  try {
    const [pRes, cRes] = await Promise.all([
      fetch('data/catalog.json'),
      fetch('data/creatine.json')
    ]);
    if (!pRes.ok || !cRes.ok) throw Error('Data matrices unavailable');

    const pData = await pRes.json();
    const cData = await cRes.json();

    proteinOffers = pData.offers;
    creatineOffers = cData.offers;

    // Calculate score for each
    for (const r of proteinOffers) {
      r.score = scoreProtein(r);
    }
    for (const r of creatineOffers) {
      r.score = scoreCreatine(r);
    }

    renderProteinTable();
    renderCreatineTable();

    // Event listeners for protein tabs
    document.querySelectorAll('[data-protein-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-protein-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentProteinFilter = btn.dataset.proteinFilter;
        renderProteinTable();
      });
    });

    // Event listeners for creatine tabs
    document.querySelectorAll('[data-creatine-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-creatine-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCreatineFilter = btn.dataset.creatineFilter;
        renderCreatineTable();
      });
    });

    // Delegated click for dossier buttons
    document.addEventListener('click', e => {
      const btn = e.target.closest('button[data-cat][data-id]');
      if (btn) {
        showDossier(btn.dataset.cat, btn.dataset.id);
      }
    });

    const closeBtn = $('#close');
    if (closeBtn) closeBtn.onclick = () => $('#evidence').close();

  } catch (err) {
    console.error('Error initializing lab intelligence homepage:', err);
  }
}

init();
