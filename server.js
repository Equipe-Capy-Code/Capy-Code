require('dotenv').config();
const express  = require('express');
const fs       = require('fs');
const path     = require('path');
const matter   = require('gray-matter');
const { marked } = require('marked');
const multer   = require('multer');
const helmet   = require('helmet');
const rateLimit = require('express-rate-limit');
const xss      = require('xss');

// ── Config ────────────────────────────────────────────────────────────────────
const app          = express();
const PORT         = process.env.PORT         || 3000;
const ADMIN_PASS   = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASS) {
  console.warn('⚠️  AVISO: ADMIN_PASSWORD não definida no .env. Usando senha padrão "capy2025".');
}
const ACTUAL_PASS = ADMIN_PASS || 'capy2025';

// ── Security Headers & CSRF ────────────────────────────────────────────────
function validateOrigin(req, res, next) {
  const origin = req.headers.origin || req.headers.referer;
  if (req.method !== 'GET' && origin && !origin.includes(req.headers.host)) {
    logAction('SECURITY_ALERT', 'system', { msg: 'Possible CSRF attempt', origin });
    return res.status(403).json({ error: 'Origem não permitida' });
  }
  next();
}
const CONTENT_DIR  = path.join(__dirname, 'content', 'articles');
const UPLOADS_DIR  = path.join(__dirname, 'public', 'uploads');
const SITE_URL     = process.env.SITE_URL     || `http://localhost:${PORT}`;
const SITE_TITLE   = 'Capy Code';
const SITE_DESC    = 'Engenharia de software em português — TypeScript, React, Node.js, arquitetura e muito mais.';
const STATS_FILE   = path.join(__dirname, 'stats.json');

// ── Security & Middleware ───────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "images.unsplash.com", "https://*.unsplash.com"],
      "script-src": ["'self'", "'unsafe-eval'", "cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.jsdelivr.net"],
      "font-src": ["'self'", "fonts.gstatic.com"],
      "connect-src": ["'self'"],
    },
  },
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per window
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
});

app.set('trust proxy', 1); // Importante se for usar proxy/deploy na nuvem
app.use('/api/', apiLimiter);
app.use('/api/auth', loginLimiter);
app.use(validateOrigin); // CSRF protection

app.use(express.json({ limit: '1mb' }));

// ── Upload config ─────────────────────────────────────────────────────────────
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random()*1E9)}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedExt = /^\.(jpeg|jpg|png|webp|gif)$/i;
    const allowedMime = /^image\/(jpeg|jpg|png|webp|gif)$/i;
    const ext = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedMime.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Apenas imagens (JPEG, PNG, WEBP, GIF) são permitidas!'));
  }
});

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token === ACTUAL_PASS) return next();
  res.status(401).json({ error: 'Não autorizado' });
}

// ── Governance & Logging ────────────────────────────────────────────────────
const LOG_FILE = path.join(__dirname, 'audit.log');

function logAction(action, user, details) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ACTION: ${action} | USER: ${user} | DETAILS: ${JSON.stringify(details)}\n`;
  fs.appendFileSync(LOG_FILE, entry, 'utf-8');
}

// ── Analytics ───────────────────────────────────────────────────────────────
function trackHit(slug) {
  try {
    let stats = {};
    if (fs.existsSync(STATS_FILE)) stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    
    const today = new Date().toISOString().split('T')[0];
    if (!stats[today]) stats[today] = { total: 0, articles: {} };
    
    stats[today].total++;
    if (slug) {
      stats[today].articles[slug] = (stats[today].articles[slug] || 0) + 1;
    }
    
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (err) { console.error('Analytics Error:', err); }
}

function ensureContentDir() {
  if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true });
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function estimateReadTime(content) {
  const words = content.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min`;
}

function readArticle(filename) {
  try {
    const filePath = path.join(CONTENT_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data: fm, content } = matter(raw);
    const slug = filename.replace('.md', '');

    // Normalize date to YYYY-MM-DD string
    let dateStr = null;
    if (fm.date) {
      if (fm.date instanceof Date) {
        dateStr = fm.date.toISOString().split('T')[0];
      } else {
        // Try to parse if it's a string like "2025-04-14"
        const d = new Date(fm.date);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
        } else {
          dateStr = String(fm.date);
        }
      }
    }

    return {
      slug,
      title:       fm.title       || 'Sem título',
      description: fm.description || '',
      author:      fm.author      || 'Capy Code',
      date:        dateStr,
      tags:        fm.tags        || [],
      status:      fm.status      || 'draft',
      readTime:    fm.readTime    || estimateReadTime(content),
      coverImage:  fm.coverImage  || null,
      content,
      html: xss(marked(content)),
      schema: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": fm.title,
        "description": fm.description,
        "author": { "@type": "Person", "name": fm.author || 'Capy Code' },
        "datePublished": dateStr,
        "image": fm.coverImage
      }
    };
  } catch (err) {
    console.error(`Erro ao ler artigo ${filename}:`, err.message);
    return null;
  }
}

function writeFrontmatter(slug, data, content) {
  const fm = matter.stringify(content, {
    title:       data.title,
    description: data.description || '',
    author:      data.author      || 'Capy Code',
    date:        data.date        || new Date().toISOString().split('T')[0],
    tags:        data.tags        || [],
    status:      data.status      || 'draft',
    readTime:    data.readTime    || estimateReadTime(content),
    coverImage:  data.coverImage  || null,
  });
  fs.writeFileSync(path.join(CONTENT_DIR, `${slug}.md`), fm, 'utf-8');
}

// ── API: Auth ─────────────────────────────────────────────────────────────────
app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  if (password === ACTUAL_PASS) {
    logAction('LOGIN_SUCCESS', req.ip, {});
    return res.json({ ok: true, token: ACTUAL_PASS });
  }
  logAction('LOGIN_FAILURE', req.ip, { attempt: password ? '***' : 'empty' });
  res.status(401).json({ error: 'Senha incorreta' });
});

// ── API: Upload ───────────────────────────────────────────────────────────────
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  logAction('IMAGE_UPLOAD', 'admin', { filename: req.file.filename });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.get('/api/uploads', requireAuth, (req, res) => {
  if (!fs.existsSync(UPLOADS_DIR)) return res.json([]);
  const files = fs.readdirSync(UPLOADS_DIR)
    .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
    .map(f => ({ filename: f, url: `/uploads/${f}` }));
  res.json(files);
});

// ── API: Newsletter ───────────────────────────────────────────────────────────
const SUBS_FILE = path.join(__dirname, 'subscribers.json');
function getSubs() { try { return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8')); } catch { return []; } }
function saveSubs(s) { fs.writeFileSync(SUBS_FILE, JSON.stringify(s, null, 2)); }

async function notifySubscribers(article) {
  const subs = getSubs();
  if (subs.length === 0) return;
  console.log(`[NEWSLETTER] 📡 Notificando ${subs.length} assinantes: "${article.title}"`);
  // Mock: fs.appendFileSync('audit.log', `[MAIL] Notified ${subs.length} users about ${article.slug}\n`);
}

app.post('/api/subscribe', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'E-mail inválido' });
  let subs = getSubs();
  if (subs.includes(email)) return res.json({ ok: true, msg: 'Já inscrito!' });
  subs.push(email);
  saveSubs(subs);
  res.json({ ok: true, msg: 'Inscrito com sucesso!' });
});

// ── API: Articles (public) ────────────────────────────────────────────────────
app.get('/api/articles', (req, res) => {
  ensureContentDir();
  const { status, tag, q, page = 1, limit = 10 } = req.query;
  if (!tag && !q && page == 1) trackHit(null); // Track homepage hit
  try {
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
    let articles = files.map(f => readArticle(f)).filter(Boolean);

    // filter
    if (status !== 'all') articles = articles.filter(a => a.status === 'published');
    if (tag)              articles = articles.filter(a => a.tags.includes(tag));
    if (q) {
      const lq = q.toLowerCase();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(lq) ||
        a.description.toLowerCase().includes(lq) ||
        a.tags.some(t => t.toLowerCase().includes(lq))
      );
    }

    articles.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total     = articles.length;
    const pageNum   = parseInt(page);
    const limitNum  = parseInt(limit);
    const paginated = articles.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const list = paginated.map(({ html, content, ...meta }) => meta);
    res.json({
      articles: list,
      total,
      page:  pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/articles/:slug', (req, res) => {
  ensureContentDir();
  const slug = path.basename(req.params.slug); // Previne Path Traversal
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Artigo não encontrado' });
  try {
    trackHit(slug); // Track view
    res.json(readArticle(`${slug}.md`));
  }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Analytics Stats
app.get('/api/stats', requireAuth, (req, res) => {
  try {
    if (!fs.existsSync(STATS_FILE)) return res.json({});
    const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/tags — all unique tags with count
app.get('/api/tags', (req, res) => {
  ensureContentDir();
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  const counts = {};
  files.forEach(f => {
    try {
      const a = readArticle(f);
      if (a.status !== 'published') return;
      a.tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    } catch (_) {}
  });
  const tags = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
  res.json(tags);
});

// ── API: Articles (protected) ─────────────────────────────────────────────────
app.post('/api/articles', requireAuth, (req, res) => {
  ensureContentDir();
  const { title, content, ...rest } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title e content são obrigatórios' });

  const slug = slugify(title);
  if (fs.existsSync(path.join(CONTENT_DIR, `${slug}.md`)))
    return res.status(409).json({ error: 'Já existe um artigo com esse slug', slug });

  writeFrontmatter(slug, { title, ...rest }, content);
  logAction('ARTICLE_CREATE', 'admin', { slug, title });
  if (rest.status === 'published') notifySubscribers({ title, ...rest, slug });
  res.status(201).json({ slug, message: 'Artigo criado' });
});

app.put('/api/articles/:slug', requireAuth, (req, res) => {
  ensureContentDir();
  const slug = path.basename(req.params.slug);
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Artigo não encontrado' });

  const existing = readArticle(`${slug}.md`);
  const { content, ...rest } = req.body;
  const newStatus = rest.status || existing.status;
  const wasPublished = existing.status === 'published';
  const isPublished = newStatus === 'published';

  writeFrontmatter(slug, { ...existing, ...rest }, content ?? existing.content);
  logAction('ARTICLE_UPDATE', 'admin', { slug });
  
  if (isPublished && !wasPublished) {
    notifySubscribers({ title: rest.title || existing.title, slug });
  }

  res.json({ slug, message: 'Artigo atualizado' });
});

app.delete('/api/articles/:slug', requireAuth, (req, res) => {
  const slug = path.basename(req.params.slug);
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Artigo não encontrado' });
  fs.unlinkSync(filePath);
  logAction('ARTICLE_DELETE', 'admin', { slug });
  res.json({ message: 'Artigo deletado' });
});

// ── RSS Feed ──────────────────────────────────────────────────────────────────
app.get('/feed.xml', (_, res) => {
  ensureContentDir();
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  let articles = files.map(f => readArticle(f))
    .filter(a => a.status === 'published')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);

  const items = articles.map(a => `
    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${SITE_URL}/article?slug=${a.slug}</link>
      <guid>${SITE_URL}/article?slug=${a.slug}</guid>
      <description><![CDATA[${a.description}]]></description>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
      ${a.tags.map(t => `<category>${t}</category>`).join('')}
    </item>`).join('');

  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESC}</description>
    <language>pt-BR</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`);
});

// ── Sitemap ───────────────────────────────────────────────────────────────────
app.get('/sitemap.xml', (_, res) => {
  ensureContentDir();
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  const articles = files.map(f => readArticle(f)).filter(a => a.status === 'published');

  const urls = [
    `<url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...articles.map(a =>
      `<url><loc>${SITE_URL}/article?slug=${a.slug}</loc><lastmod>${a.date}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`
    )
  ].join('\n  ');

  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`);
});

// ── Page routes ───────────────────────────────────────────────────────────────
app.get('/article', (req, res) => res.sendFile(path.join(__dirname, 'article.html')));
app.get('/admin',   (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

// ── Start ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🦫 Capy Code → http://localhost:${PORT}`);
    console.log(`   📝 Admin  → http://localhost:${PORT}/admin`);
    console.log(`   📡 RSS    → http://localhost:${PORT}/feed.xml\n`);
  });
}

module.exports = app;
