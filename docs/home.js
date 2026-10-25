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
    <div class="table-wrap" role="region" aria-label="Top 10 Protein Powders by Value">
      <table class="rankings-table">
        <thead>
          <tr>
            <th class="col-rank">Rank</th>
            <th class="col-product">Brand &amp; Product</th>
            <th class="col-price">Price &amp; Size</th>
            <th class="col-scoop">Cost / Scoop</th>
            <th class="col-protein">Protein % &amp; Calories</th>
            <th class="col-score">Value Score &amp; Details</th>
          </tr>
        </thead>
        <tbody>
          ${top.map((r, i) => `
            <tr>
              <td class="col-rank">
                <span class="rank-badge ${i < 3 ? 'rank-top' : ''}">#${i + 1}</span>
              </td>
              <td class="col-product">
                <div class="brand">${esc(r.brand)}</div>
                <div class="product">${esc(r.product)}</div>
                <div class="product-tags">
                  <span class="badge">${esc(r.type)}</span>
                  <span class="flavour-tag">${esc(r.flavour)}</span>
                </div>
              </td>
              <td class="col-price">
                <div class="value price-main">${money(r.price)}</div>
                <div class="muted">${r.kg} kg pack</div>
              </td>
              <td class="col-scoop">
                <div class="value cost">${money(r.cost * 24)}</div>
                <div class="muted">(${money(r.cost)} / g protein)</div>
              </td>
              <td class="col-protein">
                <div class="value">${number(r.protein)}% protein</div>
                <div class="muted">${r.energy ? number(r.energy) + ' kcal' : '~390 kcal'}</div>
              </td>
              <td class="col-score">
                <div class="score-action-cell">
                  <span class="score-pill">${r.score.toFixed(1)}</span>
                  <button data-cat="protein" data-id="${esc(r.id)}">Details ↗</button>
                </div>
              </td>
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
    <div class="table-wrap" role="region" aria-label="Top 10 Creatine Powders by Value">
      <table class="rankings-table">
        <thead>
          <tr>
            <th class="col-rank">Rank</th>
            <th class="col-product">Brand &amp; Product</th>
            <th class="col-price">Price &amp; Size</th>
            <th class="col-scoop">Cost / 3g Dose</th>
            <th class="col-protein">Purity &amp; Form</th>
            <th class="col-score">Value Score &amp; Details</th>
          </tr>
        </thead>
        <tbody>
          ${top.map((r, i) => `
            <tr>
              <td class="col-rank">
                <span class="rank-badge ${i < 3 ? 'rank-top' : ''}">#${i + 1}</span>
              </td>
              <td class="col-product">
                <div class="brand">${esc(r.brand)}</div>
                <div class="product">${esc(r.product)}</div>
                <div class="product-tags">
                  <span class="badge">${esc(r.type)}</span>
                  <span class="flavour-tag">${esc(r.flavour)}${r.packaging ? ' · ' + esc(r.packaging) : ''}</span>
                </div>
              </td>
              <td class="col-price">
                <div class="value price-main">${money(r.price)}</div>
                <div class="muted">${r.grams} g pack</div>
              </td>
              <td class="col-scoop">
                <div class="value cost">${money(r.cost * 3)}</div>
                <div class="muted">(${money(r.cost)} / g compound)</div>
              </td>
              <td class="col-protein">
                <div class="value">${number(r.creatine)}% pure</div>
                <div class="muted">${esc(r.grade !== 'Not specified' ? r.grade : r.formulation)}</div>
              </td>
              <td class="col-score">
                <div class="score-action-cell">
                  <span class="score-pill">${r.score.toFixed(1)}</span>
                  <button data-cat="creatine" data-id="${esc(r.id)}">Details ↗</button>
                </div>
              </td>
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
  return 'Not provided';
}

function showDossier(cat, id) {
  const isCreatine = cat === 'creatine';
  const list = isCreatine ? creatineOffers : proteinOffers;
  const r = list.find(x => String(x.id) === String(id));
  if (!r) return;

  const concentration = isCreatine ? r.creatine : r.protein;
  const modal = $('#evidence');
  if (!modal) return;

  $('#evidence-title').textContent = `${r.brand} — ${r.product}`;
  $('#evidence-body').innerHTML = `
    <p><strong>Product Details</strong><br>${esc(r.brand)} · ${esc(r.flavour)} · Pack: ${isCreatine ? r.grams + ' g' : r.kg + ' kg'}</p>
    <p><strong>Verified Links</strong><br>
      ${safeLink(r.url, 'Check Retail Price on Store')}<br>
      ${safeLink(r.nutritionUrl, 'View Official Nutrition Label')}
    </p>
    <p><strong>Serving &amp; Scoop Information:</strong><br>
      Serving Size: ${number(r.serving)} g · Scoop Size: ${number(r.scoop)} g
      ${isCreatine ? `<br>Active Creatine per Serving: ${number(r.creatineServing)} g` : ''}
    </p>
    <p><strong>Exact Price &amp; Value Breakdown:</strong><br>
      Pack Price: <strong>${money(r.price)}</strong> for ${isCreatine ? r.grams + ' g' : r.kg + ' kg'}<br>
      Protein / Creatine Purity: <strong>${number(concentration)}%</strong><br>
      Cost per Gram: <strong>${money(r.cost)} / g</strong><br>
      ${isCreatine ? `Standard 3g Daily Dose Cost: <strong>${money(r.cost * 3)}</strong>` : `Standard 24g Protein Scoop Cost: <strong>${money(r.cost * 24)}</strong>`}
    </p>
    <p><strong>Overall Value Score:</strong> <span class="score-pill">${r.score.toFixed(1)} / 100</span></p>
    ${r.notes ? `<p><strong>Label &amp; Ingredient Notes:</strong><br>${esc(r.notes)}</p>` : ''}
    <p class="muted">Prices and stock reflect public retail listings. No sponsored placements or affiliate bias.</p>
  `;
  modal.showModal();
}

async function init() {
  try {
    const [pRes, cRes] = await Promise.all([
      fetch('data/catalog.json'),
      fetch('data/creatine.json')
    ]);
    if (!pRes.ok || !cRes.ok) throw Error('Data unavailable');

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

    // Delegated click for details buttons
    document.addEventListener('click', e => {
      const btn = e.target.closest('button[data-cat][data-id]');
      if (btn) {
        showDossier(btn.dataset.cat, btn.dataset.id);
      }
    });

    const closeBtn = $('#close');
    if (closeBtn) closeBtn.onclick = () => $('#evidence').close();

  } catch (err) {
    console.error('Error loading supplement data:', err);
  }
}

init();
