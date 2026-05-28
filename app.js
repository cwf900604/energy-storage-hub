/* ── Internationalization ────────────────────── */
const i18n = {
  zh: {
    site_title: "全球储能资讯",
    lang_label: "EN",
    total_news: "共 <strong>{count}</strong> 条新闻",
    sources_label: "来源: <strong>{count}</strong> 个",
    filter_all: "全部来源",
    filter_zh: "中文",
    filter_en: "English",
    loading: "正在加载最新储能资讯…",
    no_results: "没有找到匹配的新闻",
    footer_text: "数据来自公开 RSS 源，每条新闻均附带原始链接。每日 UTC 08:03 自动更新。",
    updated: "更新于",
    source_link: "查看原文",
  },
  en: {
    site_title: "Global Energy Storage News",
    lang_label: "中文",
    total_news: "<strong>{count}</strong> articles",
    sources_label: "Sources: <strong>{count}</strong>",
    filter_all: "All Sources",
    filter_zh: "Chinese",
    filter_en: "English",
    loading: "Loading latest energy storage news…",
    no_results: "No matching articles found",
    footer_text: "Data from public RSS feeds. Every article includes original source link. Auto-updated daily at 08:03 UTC.",
    updated: "Updated",
    source_link: "Read original",
  },
};

let currentLang = "zh";

/* ── State ──────────────────────────────────── */
let allNews = [];
let activeFilter = "all";
let searchQuery = "";

/* ── Init ────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  setupLangToggle();
  setupFilters();
  await loadNews();
  render();
});

/* ── Language ────────────────────────────────── */
function setupLangToggle() {
  const btn = document.getElementById("langToggle");
  btn.addEventListener("click", () => {
    currentLang = currentLang === "zh" ? "en" : "zh";
    applyTranslations();
    render();
  });
}

function applyTranslations() {
  const t = i18n[currentLang];
  document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (t[key] !== undefined) {
      el.innerHTML = t[key];
    }
  });
  // update lang button
  const btn = document.getElementById("langToggle");
  btn.querySelector("[data-i18n]").innerHTML = t.lang_label;
}

function t(key, params = {}) {
  let text = i18n[currentLang][key] || key;
  Object.entries(params).forEach(([k, v]) => {
    text = text.replace(`{${k}}`, v);
  });
  return text;
}

/* ── Data Loading ────────────────────────────── */
async function loadNews() {
  try {
    const resp = await fetch("data/news.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    allNews = data.items || [];

    // Show update time
    const updateEl = document.getElementById("updateTime");
    if (data.updated) {
      const dt = new Date(data.updated);
      updateEl.textContent = `${t("updated")}: ${dt.toLocaleString(currentLang === "zh" ? "zh-CN" : "en-US", { timeZone: "Asia/Shanghai" })}`;
    }

    // Source list
    const sources = [...new Set(allNews.map(n => n.source))];
    document.getElementById("sourcesList").textContent = sources.join(" · ");

    applyTranslations();
  } catch (err) {
    console.error("Failed to load news:", err);
    document.getElementById("newsGrid").innerHTML =
      `<p class="loading">${t("loading")} — Error: ${err.message}</p>`;
  }
}

/* ── Filters ─────────────────────────────────── */
function setupFilters() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    render();
  });
  document.getElementById("sourceFilter").addEventListener("change", (e) => {
    activeFilter = e.target.value;
    render();
  });
}

/* ── Render ──────────────────────────────────── */
function render() {
  let items = allNews;

  // Filter by language
  if (activeFilter === "zh") items = items.filter(n => n.lang === "zh");
  if (activeFilter === "en") items = items.filter(n => n.lang === "en");

  // Search
  if (searchQuery) {
    items = items.filter(n =>
      n.title.toLowerCase().includes(searchQuery) ||
      n.summary.toLowerCase().includes(searchQuery) ||
      n.source.toLowerCase().includes(searchQuery)
    );
  }

  // Stats
  document.getElementById("newsCount").textContent = items.length;
  const sources = [...new Set(items.map(n => n.source))];
  document.getElementById("sourceCount").textContent = sources.length;
  document.getElementById("statsBar").querySelectorAll("span")[0].innerHTML =
    t("total_news", { count: items.length });
  document.getElementById("statsBar").querySelectorAll("span")[1].innerHTML =
    t("sources_label", { count: sources.length });

  // Grid
  const grid = document.getElementById("newsGrid");
  if (items.length === 0) {
    grid.innerHTML = `<p class="no-results">${t("no_results")}</p>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    const dateStr = new Date(item.published).toLocaleDateString(
      currentLang === "zh" ? "zh-CN" : "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );
    return `
      <article class="news-card ${item.lang}">
        <div class="card-header">
          <span class="card-source ${item.lang}">${item.source}</span>
          <time class="card-date" datetime="${item.published}">${dateStr}</time>
        </div>
        <h3 class="card-title">
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(item.title)}
          </a>
        </h3>
        ${item.summary ? `<p class="card-summary">${escapeHtml(item.summary)}</p>` : ""}
        <a class="card-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
          ${t("source_link")}
        </a>
      </article>
    `;
  }).join("");
}

/* ── Utils ───────────────────────────────────── */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
