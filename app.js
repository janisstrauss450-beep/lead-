const DATA_PATH = '../ops/wave-003-riga-solo-women-ig-first/master/leads.master.json';
const STORAGE_KEY = 'lead-crm-state-v1';
const statuses = ['new', 'reviewed', 'ready', 'contacted', 'replied', 'qualified', 'closed', 'archived'];

let leads = [];
let filtered = [];
let crmState = loadCrmState();
let selectedLeadId = null;
let currentView = 'list';

function loadCrmState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function saveCrmState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(crmState));
}

function leadId(lead) {
  return lead.instagram_handle || `${lead.business_name || 'unknown'}|${lead.city || ''}`.toLowerCase();
}

function parseScore(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeLead(lead) {
  const id = leadId(lead);
  const state = crmState[id] || {};
  return {
    ...lead,
    id,
    fit_score_num: parseScore(lead.fit_score),
    qa_status: lead.qa_status || lead.qa_status_raw || 'unknown',
    crm_status: state.crm_status || 'new',
    priority: state.priority || 'normal',
    notes: state.notes || [],
    next_follow_up: state.next_follow_up || '',
    last_contacted: state.last_contacted || '',
    starred: !!state.starred,
    do_not_contact: !!state.do_not_contact,
    phone: lead.public_phone || '',
    email: lead.public_email || '',
    instagram: lead.instagram_url || '',
    booking: lead.booking_url || '',
    website: lead.website_url || '',
    maps: lead.google_maps_url || '',
    facebook: lead.facebook_url || '',
    best_link: lead.booking_url || lead.website_url || lead.instagram_url || lead.facebook_url || ''
  };
}

async function init() {
  const res = await fetch(DATA_PATH);
  const raw = await res.json();
  leads = raw.map(normalizeLead).sort((a, b) => b.fit_score_num - a.fit_score_num);
  filtered = [...leads];
  populateFilters();
  bindEvents();
  render();
}

function populateFilters() {
  const citySel = document.getElementById('cityFilter');
  const categorySel = document.getElementById('categoryFilter');
  [...new Set(leads.map(l => l.city).filter(Boolean))].sort().forEach(city => citySel.add(new Option(city, city)));
  [...new Set(leads.map(l => l.category_primary).filter(Boolean))].sort().forEach(cat => categorySel.add(new Option(cat, cat)));
}

function bindEvents() {
  ['searchInput','statusFilter','cityFilter','categoryFilter','onlyWithPhone','onlyWithEmail','onlyWithBooking','onlyUnworked']
    .forEach(id => document.getElementById(id).addEventListener('input', applyFilters));
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(currentView + 'View').classList.add('active');
    if (currentView === 'pipeline') renderPipeline();
  }));
  document.getElementById('exportCrmStateBtn').addEventListener('click', exportCrmState);
}

function applyFilters() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const city = document.getElementById('cityFilter').value;
  const category = document.getElementById('categoryFilter').value;
  const onlyPhone = document.getElementById('onlyWithPhone').checked;
  const onlyEmail = document.getElementById('onlyWithEmail').checked;
  const onlyBooking = document.getElementById('onlyWithBooking').checked;
  const onlyUnworked = document.getElementById('onlyUnworked').checked;

  filtered = leads.filter(l => {
    if (q) {
      const hay = `${l.business_name} ${l.instagram_handle} ${l.city}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (status && l.crm_status !== status) return false;
    if (city && l.city !== city) return false;
    if (category && l.category_primary !== category) return false;
    if (onlyPhone && !l.phone) return false;
    if (onlyEmail && !l.email) return false;
    if (onlyBooking && !(l.booking || l.website)) return false;
    if (onlyUnworked && l.crm_status !== 'new') return false;
    return true;
  });
  render();
}

function render() {
  renderRows();
  renderStats();
  if (selectedLeadId && filtered.some(l => l.id === selectedLeadId)) {
    renderDetail(filtered.find(l => l.id === selectedLeadId));
  } else if (filtered[0]) {
    selectedLeadId = filtered[0].id;
    renderDetail(filtered[0]);
  } else {
    document.getElementById('detailPanel').innerHTML = '<div class="empty-state">No leads match these filters</div>';
  }
  if (currentView === 'pipeline') renderPipeline();
}

function renderRows() {
  const tbody = document.getElementById('leadRows');
  tbody.innerHTML = filtered.map(l => `
    <tr data-id="${l.id}">
      <td><div class="lead-name">${escapeHtml(l.business_name || 'Unnamed')}</div><div class="small">@${escapeHtml(l.instagram_handle || '')}</div></td>
      <td>${escapeHtml(l.city || '')}</td>
      <td>${escapeHtml(l.category_primary || '')}</td>
      <td>${l.fit_score_num}</td>
      <td><span class="badge qa-${escapeHtml(l.qa_status)}">${escapeHtml(l.qa_status)}</span></td>
      <td><span class="badge status-${escapeHtml(l.crm_status)}">${escapeHtml(l.crm_status)}</span></td>
      <td>${renderLinkButtons(l)}</td>
    </tr>`).join('');
  tbody.querySelectorAll('tr').forEach(row => row.addEventListener('click', () => {
    selectedLeadId = row.dataset.id;
    renderDetail(filtered.find(l => l.id === selectedLeadId));
  }));
}

function renderLinkButtons(l) {
  const links = [];
  if (l.instagram) links.push(`<a class="link-btn" target="_blank" href="${l.instagram}">Instagram</a>`);
  if (l.website) links.push(`<a class="link-btn" target="_blank" href="${l.website}">Website</a>`);
  if (l.booking) links.push(`<a class="link-btn" target="_blank" href="${l.booking}">Booking</a>`);
  if (l.phone) links.push(`<a class="link-btn" target="_blank" href="tel:${l.phone}">Phone</a>`);
  if (l.email) links.push(`<a class="link-btn" target="_blank" href="mailto:${l.email}">Email</a>`);
  return `<div class="links">${links.join('')}</div>`;
}

function renderDetail(l) {
  const panel = document.getElementById('detailPanel');
  panel.innerHTML = `
    <h2>${escapeHtml(l.business_name || 'Unnamed')}</h2>
    <div class="small">@${escapeHtml(l.instagram_handle || '')} · ${escapeHtml(l.city || '')} · ${escapeHtml(l.category_primary || '')}</div>
    <div class="detail-grid">
      <div class="card">
        <h3>Contact</h3>
        <div class="field"><strong>Links</strong>${renderLinkButtons(l)}</div>
        <div class="field"><strong>Phone</strong>${escapeHtml(l.phone || '-')}</div>
        <div class="field"><strong>Email</strong>${escapeHtml(l.email || '-')}</div>
      </div>
      <div class="card">
        <h3>Qualification</h3>
        <div class="field"><strong>Fit Score</strong>${l.fit_score_num}</div>
        <div class="field"><strong>Confidence</strong>${escapeHtml(l.confidence_score || '-')}</div>
        <div class="field"><strong>QA Status</strong>${escapeHtml(l.qa_status || '-')}</div>
        <div class="field"><strong>Owner Signal</strong>${escapeHtml(l.female_owner_signal || '-')}</div>
      </div>
    </div>
    <div class="card">
      <h3>CRM</h3>
      <div class="detail-grid">
        <div>
          <label>Status</label>
          <select id="crmStatusSelect">${statuses.map(s => `<option value="${s}" ${l.crm_status===s?'selected':''}>${s}</option>`).join('')}</select>
        </div>
        <div>
          <label>Next follow-up</label>
          <input id="followUpInput" type="date" value="${escapeHtml(l.next_follow_up || '')}" />
        </div>
      </div>
      <div class="detail-grid">
        <div>
          <label>Last contacted</label>
          <input id="lastContactedInput" type="date" value="${escapeHtml(l.last_contacted || '')}" />
        </div>
        <div>
          <label><input id="starLeadInput" type="checkbox" ${l.starred?'checked':''}/> Starred</label>
        </div>
      </div>
      <button id="saveLeadBtn">Save lead state</button>
    </div>
    <div class="card">
      <h3>Notes</h3>
      <div class="notes-list">${l.notes.length ? l.notes.map(n => `<div class="note"><div class="small">${escapeHtml(n.created_at)}</div>${escapeHtml(n.body)}</div>`).join('') : '<div class="small">No notes yet</div>'}</div>
      <textarea id="noteInput" rows="4" placeholder="Add note"></textarea>
      <button id="addNoteBtn">Add note</button>
    </div>
    <div class="card">
      <h3>Raw/source data</h3>
      <div class="field"><strong>Compliance notes</strong>${escapeHtml(l.compliance_notes || '-')}</div>
      <div class="field"><strong>Source</strong>${escapeHtml(l.lead_source_primary || '')} / ${escapeHtml(l.lead_source_secondary || '')}</div>
      <div class="field"><strong>Booking</strong>${escapeHtml(l.booking || '-')}</div>
      <div class="field"><strong>Website</strong>${escapeHtml(l.website || '-')}</div>
    </div>`;

  document.getElementById('saveLeadBtn').addEventListener('click', () => saveLeadDetail(l.id));
  document.getElementById('addNoteBtn').addEventListener('click', () => addNote(l.id));
}

function saveLeadDetail(id) {
  crmState[id] = crmState[id] || {};
  crmState[id].crm_status = document.getElementById('crmStatusSelect').value;
  crmState[id].next_follow_up = document.getElementById('followUpInput').value;
  crmState[id].last_contacted = document.getElementById('lastContactedInput').value;
  crmState[id].starred = document.getElementById('starLeadInput').checked;
  saveCrmState();
  leads = leads.map(l => l.id === id ? normalizeLead({...l}) : l);
  applyFilters();
}

function addNote(id) {
  const body = document.getElementById('noteInput').value.trim();
  if (!body) return;
  crmState[id] = crmState[id] || {};
  crmState[id].notes = crmState[id].notes || [];
  crmState[id].notes.unshift({ created_at: new Date().toISOString(), body });
  saveCrmState();
  leads = leads.map(l => l.id === id ? normalizeLead({...l}) : l);
  renderDetail(leads.find(l => l.id === id));
}

function renderStats() {
  const worked = leads.filter(l => l.crm_status !== 'new').length;
  const stats = document.getElementById('stats');
  stats.innerHTML = `Total: <strong>${leads.length}</strong><br>Visible: <strong>${filtered.length}</strong><br>Worked: <strong>${worked}</strong>`;
}

function renderPipeline() {
  const board = document.getElementById('pipelineBoard');
  board.innerHTML = statuses.map(status => {
    const cards = filtered.filter(l => l.crm_status === status).map(l => `
      <div class="lead-card" data-id="${l.id}">
        <div class="lead-card-title">${escapeHtml(l.business_name || 'Unnamed')}</div>
        <div class="lead-card-meta">${escapeHtml(l.city || '')} · ${escapeHtml(l.category_primary || '')} · fit ${l.fit_score_num}</div>
      </div>`).join('');
    return `<div class="column"><h3>${status}</h3>${cards || '<div class="small">None</div>'}</div>`;
  }).join('');
  board.querySelectorAll('.lead-card').forEach(card => card.addEventListener('click', () => {
    selectedLeadId = card.dataset.id;
    document.querySelector('[data-view="list"]').click();
  }));
}

function exportCrmState() {
  const blob = new Blob([JSON.stringify(crmState, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'crm-state-export.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

init().catch(err => {
  document.body.innerHTML = `<pre style="padding:20px;color:#fff">Failed to load CRM data. ${escapeHtml(err.message)}</pre>`;
});
