// ── Auth & State ─────────────────────────────────────────────────────────────
let TOKEN = localStorage.getItem('admin_token') || '';
let articles = [], current = null, isNew = false, activeTab = 'write', uploadedImages = [], stats = {};
let viewsChart = null;

const authHeader = () => ({ 'Content-Type': 'application/json', 'x-admin-token': TOKEN });

const api = {
  list:   ()        => fetch('/api/articles?status=all', { headers: authHeader() }).then(r => r.json()),
  get:    slug      => fetch(`/api/articles/${slug}`, { headers: authHeader() }).then(r => r.json()),
  create: data      => fetch('/api/articles', { method:'POST', headers: authHeader(), body:JSON.stringify(data) }).then(r => r.json()),
  update: (slug, d) => fetch(`/api/articles/${slug}`, { method:'PUT', headers: authHeader(), body:JSON.stringify(d) }).then(r => r.json()),
  delete: slug      => fetch(`/api/articles/${slug}`, { method:'DELETE', headers: authHeader() }).then(r => r.json()),
  uploads:()        => fetch('/api/uploads', { headers: { 'x-admin-token': TOKEN } }).then(r => r.json()),
  upload: file => {
    const fd = new FormData(); fd.append('image', file);
    return fetch('/api/upload', { method:'POST', headers:{ 'x-admin-token': TOKEN }, body: fd }).then(r => r.json());
  },
  stats:  ()        => fetch('/api/stats', { headers: authHeader() }).then(r => r.json()),
};

// ── App Logic ─────────────────────────────────────────────────────────────────
async function init() {
  if (!TOKEN) {
    showLogin(true);
  } else {
    try {
      const res = await fetch('/api/articles?status=all', { headers: authHeader() });
      if (res.status === 401) throw new Error();
      showLogin(false);
      await loadList();
      await loadStats();
    } catch {
      showLogin(true);
    }
  }
}

function showLogin(show) {
  document.getElementById('loginScreen').style.display = show ? 'flex' : 'none';
  document.getElementById('adminApp').style.display = show ? 'none' : 'flex';
}

async function doLogin() {
  const password = document.getElementById('passInput').value;
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (data.ok) {
    TOKEN = data.token;
    localStorage.setItem('admin_token', TOKEN);
    init();
  } else {
    document.getElementById('loginErr').textContent = data.error || 'Erro ao entrar';
  }
}

function doLogout() {
  localStorage.removeItem('admin_token');
  TOKEN = '';
  location.reload();
}

// ── UI Actions ────────────────────────────────────────────────────────────────
async function loadList() {
  const data = await api.list();
  articles = Array.isArray(data) ? data : (data.articles || []);
  renderList();
  updateDashStats();
}

async function loadStats() {
  stats = await api.stats();
  renderChart();
  renderTopArticles();
}

function updateDashStats() {
  document.getElementById('stat-total').textContent = articles.length;
  const pub = articles.filter(a => a.status === 'published').length;
  const ratio = articles.length ? Math.round((pub / articles.length) * 100) : 0;
  document.getElementById('stat-ratio').textContent = ratio + '%';
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('stat-today').textContent = stats[today]?.total || 0;
}

function switchMainTab(tab) {
  document.querySelectorAll('.view-container').forEach(v => v.style.display = 'none');
  document.getElementById(`${tab}View`).style.display = 'block';
  document.querySelectorAll('.sb-nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById(`nav-${tab}`).classList.add('active');
  document.getElementById('pageTitle').textContent = tab === 'dash' ? 'Dashboard' : 'Artigos';
  if (tab === 'dash') loadStats();
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function renderList() {
  const el = document.getElementById('articleList');
  el.innerHTML = articles.map(a => `
    <div class="art-item ${current?.slug===a.slug?'active':''}" data-slug="${a.slug}">
      <div class="art-item-title">${a.title}</div>
      <div class="art-item-meta"><span>${a.status}</span> · <span>${a.date||''}</span></div>
    </div>`).join('');
  
  // Attach events manually to avoid CSP issues
  el.querySelectorAll('.art-item').forEach(item => {
    item.addEventListener('click', () => openArticle(item.dataset.slug));
  });
}

async function openArticle(slug) {
  current = await api.get(slug); isNew = false; renderEditor();
}

function newArticle() {
  current = { slug:'', title:'', description:'', author:'Capy Code', tags:[], status:'draft', coverImage:'',
    content:`# Novo Artigo\n\nConteúdo aqui...\n` };
  isNew = true; switchMainTab('articles'); renderEditor();
}

function renderEditor() {
  const area = document.getElementById('editorArea');
  area.innerHTML = `
    <div class="editor-toolbar">
      <h3 style="flex:1;font-size:0.9rem">${isNew ? 'Novo artigo' : current.title}</h3>
      <div class="tabs">
        <button class="tab ${activeTab==='meta'?'active':''}" data-tab="meta">Metadados</button>
        <button class="tab ${activeTab==='write'?'active':''}" data-tab="write">Editor</button>
        <button class="tab ${activeTab==='images'?'active':''}" data-tab="images">Imagens</button>
      </div>
      <button class="btn btn-ghost btn-sm" id="btn-save-draft">Rascunho</button>
      <button class="btn btn-primary btn-sm" id="btn-publish">Publicar</button>
      ${!isNew?`<button class="btn btn-ghost btn-sm" id="btn-delete" style="color:var(--red)">🗑</button>`:''}
    </div>
    <div class="editor-body" id="editorBody"></div>`;

  area.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
  document.getElementById('btn-save-draft').addEventListener('click', () => saveArticle('draft'));
  document.getElementById('btn-publish').addEventListener('click', () => saveArticle('published'));
  if (document.getElementById('btn-delete')) {
    document.getElementById('btn-delete').addEventListener('click', deleteArticle);
  }
  
  renderTab();
}

function setTab(tab) {
  if (activeTab === 'write') syncMdContent();
  if (activeTab === 'meta')  syncMeta();
  activeTab = tab;
  renderEditor();
}

function renderTab() {
  const body = document.getElementById('editorBody');
  if (activeTab === 'meta') {
    body.innerHTML = `
      <div style="max-width:800px;display:flex;flex-direction:column;gap:20px">
        <div class="field"><label>Título</label><input class="input" id="f-title" value="${esc(current.title)}"></div>
        <div class="field"><label>Descrição (SEO)</label><textarea class="input" id="f-desc" style="height:80px">${esc(current.description)}</textarea></div>
        <div class="row2">
          <div class="field"><label>Autor</label><input class="input" id="f-author" value="${esc(current.author)}"></div>
          <div class="field"><label>Status</label>
            <select class="input" id="f-status">
              <option value="draft" ${current.status==='draft'?'selected':''}>Rascunho</option>
              <option value="published" ${current.status==='published'?'selected':''}>Publicado</option>
            </select>
          </div>
        </div>
        <div class="field"><label>Tags (vírgula)</label><input class="input" id="f-tags" value="${Array.isArray(current.tags)?current.tags.join(', '):''}"></div>
        <div class="field"><label>Capa (URL)</label><input class="input" id="f-cover" value="${esc(current.coverImage||'')}"></div>
      </div>`;
  } else if (activeTab === 'write') {
    body.style.padding = '0';
    body.innerHTML = `
      <div class="md-split">
        <div class="md-pane"><textarea id="md-editor">${escTA(current.content)}</textarea></div>
        <div class="md-pane md-preview" id="md-preview"></div>
      </div>`;
    document.getElementById('md-editor').addEventListener('input', updatePreview);
    updatePreview();
  } else if (activeTab === 'images') {
    body.innerHTML = `
      <div class="field"><label>Upload</label>
        <div class="drop-zone" id="dropZone">📁 Clique ou arraste</div>
        <input type="file" id="fileInput" accept="image/*" style="display:none">
      </div>
      <div class="img-grid" id="imgGrid"></div>`;
    
    document.getElementById('dropZone').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', e => uploadFile(e.target.files[0]));
    loadImages();
  }
}

// ── Charts & Metrics ─────────────────────────────────────────────────────────
function renderChart() {
  const canvas = document.getElementById('viewsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const data = last7Days.map(day => stats[day]?.total || 0);
  if (viewsChart) viewsChart.destroy();
  viewsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7Days.map(d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })),
      datasets: [{ label:'Acessos', data, borderColor:'#F59E0B', backgroundColor:'rgba(245,158,11,0.1)', tension:0.4, fill:true }]
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true, grid:{color:'#26262C'}, ticks:{color:'#52525B'}}, x:{grid:{display:false}, ticks:{color:'#52525B'}}} }
  });
}

function renderTopArticles() {
  const allArticlesStats = {};
  Object.values(stats).forEach(day => {
    Object.entries(day.articles || {}).forEach(([slug, count]) => { allArticlesStats[slug] = (allArticlesStats[slug] || 0) + count; });
  });
  const sorted = Object.entries(allArticlesStats).sort((a,b) => b[1]-a[1]).slice(0,5);
  const el = document.getElementById('topArticlesList');
  if (!sorted.length) { el.innerHTML = '<p style="color:var(--text3);font-size:0.8rem">Sem dados suficientes</p>'; return; }
  el.innerHTML = `<table style="width:100%;font-size:0.8rem;color:var(--text2)">
    ${sorted.map(([slug, count]) => `<tr><td style="padding:8px 0">${slug}</td><td style="text-align:right;font-family:var(--m)">${count} views</td></tr>`).join('')}
  </table>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function updatePreview() {
  const src = document.getElementById('md-editor')?.value || '';
  const el  = document.getElementById('md-preview');
  if (el) el.innerHTML = marked.parse(src);
}
function syncMdContent() { const el = document.getElementById('md-editor'); if (el) current.content = el.value; }
function syncMeta() {
  current.title = document.getElementById('f-title')?.value || current.title;
  current.description = document.getElementById('f-desc')?.value || current.description;
  current.author = document.getElementById('f-author')?.value || current.author;
  current.status = document.getElementById('f-status')?.value || current.status;
  current.coverImage = document.getElementById('f-cover')?.value || current.coverImage;
  const tv = document.getElementById('f-tags')?.value || '';
  current.tags = tv.split(',').map(t => t.trim()).filter(Boolean);
}
async function saveArticle(statusOverride) {
  syncMeta(); syncMdContent();
  if (!current.title.trim()) return toast('Título obrigatório');
  if (statusOverride) current.status = statusOverride;
  let res = isNew ? await api.create(current) : await api.update(current.slug, current);
  if (res.error) return toast(res.error);
  toast('Salvo ✓');
  if (isNew) current.slug = res.slug;
  isNew = false; await loadList(); renderEditor();
}
async function deleteArticle() {
  if (!confirm(`Deletar "${current.title}"?`)) return;
  const res = await api.delete(current.slug);
  if (res.error) return toast(res.error);
  toast('Deletado'); current = null; renderEditor(); await loadList();
}
async function loadImages() {
  uploadedImages = await api.uploads();
  const grid = document.getElementById('imgGrid');
  grid.innerHTML = uploadedImages.map(img => `<div class="img-thumb" data-url="${img.url}"><img src="${img.url}"></div>`).join('');
  grid.querySelectorAll('.img-thumb').forEach(t => t.addEventListener('click', () => {
    navigator.clipboard.writeText(`![imagem](${t.dataset.url})`);
    toast('Markdown copiado! ✓');
  }));
}
async function uploadFile(file) {
  if (!file) return;
  toast('⏳ Enviando...');
  const res = await api.upload(file);
  if (res.error) return toast(res.error);
  toast('Sucesso!'); loadImages();
}
function esc(s=''){return String(s).replace(/"/g,'&quot;').replace(/</g,'&lt;')}
function escTA(s=''){return String(s).replace(/</g,'&lt;')}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(()=>t.remove(), 2500);
}

// ── Events ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  document.getElementById('nav-dash').addEventListener('click', () => switchMainTab('dash'));
  document.getElementById('nav-articles').addEventListener('click', () => switchMainTab('articles'));
  document.getElementById('nav-new').addEventListener('click', newArticle);
  document.getElementById('btnLogin').addEventListener('click', doLogin);
  document.getElementById('btnLogout').addEventListener('click', doLogout);
});
