/* ═══════════════════════════════════════════════
   ENERGYHUB — App
   ═══════════════════════════════════════════════ */

/* ── State ──────────────────────────────── */
let allNews = [];
let currentLang = 'zh';
let searchQuery = '';
let sourceFilter = 'all';

/* ── i18n ────────────────────────────────── */
const i18n = {
  zh: {
    nav_featured: '重磅资讯', nav_all: '全部新闻',
    stat_news: '条新闻', stat_sources: '个来源',
    all_news: '全部新闻', filter_all: '全部来源',
    loading: '加载中…', no_results: '没有找到匹配的新闻',
    footer_text: '数据来自公开 RSS 源，每日 UTC 08:03 自动更新',
    read: '阅读全文', featured_tag: '重磅推荐',
  },
  en: {
    nav_featured: 'Featured', nav_all: 'All News',
    stat_news: 'articles', stat_sources: 'sources',
    all_news: 'All News', filter_all: 'All Sources',
    loading: 'Loading…', no_results: 'No matching articles',
    footer_text: 'Data from public RSS feeds. Auto-updated daily.',
    read: 'Read more', featured_tag: 'FEATURED',
  },
};

function t(key) { return i18n[currentLang][key] || key; }

/* ── Init ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initBgCanvas();
  setupLangToggle();
  setupFilters();
  await loadNews();
  renderFeatured();
  renderAll();
});

/* ═══════════════════════════════════════════
   BACKGROUND CANVAS
   ═══════════════════════════════════════════ */
function initBgCanvas() {
  const c = document.getElementById('bgCanvas');
  const ctx = c.getContext('2d');
  let w, h;
  const particles = [];

  function resize() {
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Create subtle floating particles
  for (let i = 0; i < 35; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      alpha: Math.random() * 0.3 + 0.05,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Grid lines — very subtle
    ctx.strokeStyle = 'rgba(255,255,255,0.015)';
    ctx.lineWidth = 0.5;
    const spacing = 80;
    for (let x = spacing; x < w; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = spacing; y < h; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Particles
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
    }

    // Slow-moving gradient circles
    const t = Date.now() / 10000;
    const g = ctx.createRadialGradient(
      w * 0.25 + Math.sin(t) * 40, h * 0.6 + Math.cos(t * 0.7) * 50,
      80,
      w * 0.25, h * 0.6,
      500
    );
    g.addColorStop(0, 'rgba(227,25,55,0.025)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(
      w * 0.75 + Math.cos(t * 0.8) * 30, h * 0.4 + Math.sin(t * 0.6) * 40,
      60,
      w * 0.75, h * 0.4,
      450
    );
    g2.addColorStop(0, 'rgba(59,130,246,0.02)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    requestAnimationFrame(draw);
  }
  draw();
}

/* ═══════════════════════════════════════════
   LANGUAGE
   ═══════════════════════════════════════════ */
function setupLangToggle() {
  const zh = document.getElementById('langZh');
  const en = document.getElementById('langEn');
  const btn = document.getElementById('langToggle');

  function setLang(lang) {
    currentLang = lang;
    zh.classList.toggle('active', lang === 'zh');
    en.classList.toggle('active', lang === 'en');
    applyTranslations();
    renderFeatured();
    renderAll();
  }

  zh.addEventListener('click', () => setLang('zh'));
  en.addEventListener('click', () => setLang('en'));
  btn.addEventListener('click', () => setLang(currentLang === 'zh' ? 'en' : 'zh'));
  setLang('zh');
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = i18n[currentLang][key];
    if (val !== undefined) el.textContent = val;
  });
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
}

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */
async function loadNews() {
  try {
    const resp = await fetch('data/news.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    allNews = data.items || [];

    // Update time
    if (data.updated) {
      const dt = new Date(data.updated);
      document.getElementById('updateTime').textContent =
        dt.toLocaleString(currentLang === 'zh' ? 'zh-CN' : 'en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          timeZone: 'Asia/Shanghai',
        });
    }

    // Source list in footer
    const sources = [...new Set(allNews.map(n => n.source))];
    document.getElementById('sourcesList').textContent = sources.join('  ·  ');
  } catch (e) {
    console.error('Failed to load news:', e);
    document.getElementById('newsGrid').innerHTML =
      `<p class="no-results">${t('loading')} — ${e.message}</p>`;
  }
}

/* ═══════════════════════════════════════════
   FILTERS
   ═══════════════════════════════════════════ */
function setupFilters() {
  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderAll();
  });
  document.getElementById('sourceFilter').addEventListener('change', e => {
    sourceFilter = e.target.value;
    renderAll();
  });
}

function filterNews() {
  let items = allNews;
  if (sourceFilter === 'en') items = items.filter(n => n.lang === 'en');
  if (searchQuery) {
    items = items.filter(n =>
      n.title.toLowerCase().includes(searchQuery) ||
      n.summary.toLowerCase().includes(searchQuery) ||
      n.source.toLowerCase().includes(searchQuery)
    );
  }
  return items;
}

/* ═══════════════════════════════════════════
   FEATURED HERO
   ═══════════════════════════════════════════ */
function renderFeatured() {
  const grid = document.getElementById('heroGrid');
  const nav = document.getElementById('heroNav');

  // Pick top 3 from energy-storage.news (specialized) for quality
  const featured = allNews
    .filter(n => n.source === 'Energy Storage News' || n.lang === 'en')
    .slice(0, 3);

  if (featured.length < 3) {
    grid.innerHTML = '<div class="hero-placeholder pulse">' + t('loading') + '</div>';
    return;
  }

  const dateFmt = (iso) => new Date(iso).toLocaleDateString(
    currentLang === 'zh' ? 'zh-CN' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );

  grid.innerHTML = featured.map((item, i) => {
    const isFeatured = i === 0;
    return `
      <div class="hero-card${isFeatured ? ' featured' : ''}" data-hero="${i}">
        <div class="hero-card-bg"></div>
        <div class="hero-card-overlay">
          <span class="hero-tag">${t('featured_tag')}</span>
          <h2 class="hero-title">${esc(item.title)}</h2>
          <div class="hero-meta">
            <span>${item.source}</span>
            <span class="source-dot"></span>
            <span>${dateFmt(item.published)}</span>
          </div>
          <span class="hero-card-link-text">${t('read')}</span>
        </div>
        <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" class="hero-card-link" aria-label="${esc(item.title)}"></a>
      </div>
    `;
  }).join('');

  // Nav dots
  nav.innerHTML = featured.map((_, i) =>
    `<button class="hero-dot${i === 0 ? ' active' : ''}" data-dot="${i}" aria-label="Slide ${i+1}"></button>`
  ).join('');

  // Dot click handlers
  nav.querySelectorAll('.hero-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      nav.querySelectorAll('.hero-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
  });
}

/* ═══════════════════════════════════════════
   ALL NEWS GRID
   ═══════════════════════════════════════════ */
function renderAll() {
  const items = filterNews();
  const grid = document.getElementById('newsGrid');

  // Stats
  document.getElementById('newsCount').textContent = items.length;
  const sources = [...new Set(items.map(n => n.source))];
  document.getElementById('sourceCount').textContent = sources.length;

  if (items.length === 0) {
    grid.innerHTML = `<p class="no-results">${t('no_results')}</p>`;
    return;
  }

  const dateFmt = (iso) => new Date(iso).toLocaleDateString(
    currentLang === 'zh' ? 'zh-CN' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );

  grid.innerHTML = items.map(item => `
    <article class="news-card">
      <div class="card-top">
        <span class="card-source">${item.source}</span>
        <time class="card-date">${dateFmt(item.published)}</time>
      </div>
      <h3 class="card-title">
        <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.title)}</a>
      </h3>
      ${item.summary ? `<p class="card-summary">${esc(item.summary)}</p>` : ''}
      <div class="card-bottom">
        <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" class="card-read">${t('read')}</a>
      </div>
    </article>
  `).join('');
}

/* ── Utils ───────────────────────────────── */
function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
