#!/usr/bin/env node
// Static-generates one page per project card under p/<slug>/index.html, plus
// pre-rendered card grids for index.html and robots.txt.
//
// Why: the site's project data (data/projects.js) previously only rendered
// into the DOM at runtime via JS. Search engines are blocked from *indexing*
// this site (see <meta name="robots" content="noindex"> below — robots.txt
// still ALLOWs crawling, otherwise crawlers would never fetch the page far
// enough to see the noindex tag). A person can still open or share one of
// these /p/<slug>/ URLs directly, or paste it to an AI — so each page's core
// text must be present in the raw HTML, not injected by JS.
//
// Run: node scripts/build-project-pages.js
// Commit the generated output — Vercel serves this repo as static files,
// there is no build step configured.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { COMPS, PROJECTS } = require(path.join(ROOT, 'data', 'projects.js'));

// Absolute origin the site is deployed at (no trailing slash), e.g.
// "https://gaeun.vercel.app". Needed because og:image/og:url/canonical must
// be absolute URLs for link-preview scrapers (KakaoTalk, iMessage, Slack...)
// to pick them up — relative paths are silently ignored by those scrapers.
// Override via: SITE_ORIGIN=https://your-domain node scripts/build-project-pages.js
// (e.g. if a custom domain is attached later, or for a preview deployment).
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://portfolio-gaeunkwon.vercel.app';

const SITE_TITLE = '권가은 포트폴리오';
const SECTION_META = {
  work:     { label: 'Work Experience', title: '💼 실무경험' },
  academic: { label: 'Awards',          title: '🏆 수상' },
  campaign: { label: 'Campaign Leading',title: '🎯 캠페인리딩' },
  comms:    { label: 'Side Project',    title: '🔬 사이드프로젝트' },
};

function slugFor(p) {
  return p.slug || p.id;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function encImgPath(p) {
  if (!p) return '';
  return p.split('/').map(encodeURIComponent).join('/');
}

// Mirrors the \n-based formatting openModal() does in index.html (details/result blocks).
function textBlockToHtml(text) {
  return text.split('\n').map(line => {
    if (!line.trim()) return '<br>';
    const esc = escapeHtml(line);
    if (line.startsWith('[') && line.endsWith(']')) return `<p><strong>${esc}</strong></p>`;
    if (line.startsWith('•')) return `<p style="padding-left:12px;color:#555">${esc}</p>`;
    return `<p>${esc}</p>`;
  }).join('');
}

function summaryToHtml(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function buildDetailPage(listKey, p) {
  const slug = slugFor(p);
  const section = SECTION_META[listKey];
  const images = p.images || [];
  const description = p.summary.split('\n')[0].trim();
  const pageUrl = `${SITE_ORIGIN}/p/${slug}/`;
  const ogImage = p.thumb ? `${SITE_ORIGIN}/${encImgPath(p.thumb)}` : '';

  const galleryHtml = images.length ? `
  <div class="gallery">
${images.map(img => `    <figure>
      <img src="../../${encImgPath(img.src)}" alt="${escapeHtml(p.title)}" loading="lazy"/>${img.caption ? `\n      <figcaption>${escapeHtml(img.caption)}</figcaption>` : ''}
    </figure>`).join('\n')}
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="robots" content="noindex"/>
<title>${escapeHtml(p.title)} · ${SITE_TITLE}</title>
<meta name="description" content="${escapeHtml(description)}"/>
<link rel="canonical" href="${pageUrl}"/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="${pageUrl}"/>
<meta property="og:title" content="${escapeHtml(p.title)}"/>
<meta property="og:description" content="${escapeHtml(description)}"/>
${ogImage ? `<meta property="og:image" content="${ogImage}"/>` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../../styles.css"/>
</head>
<body>
<nav>
  <a class="nav-logo" href="../../index.html">권가은</a>
  <a class="back-link" href="../../index.html#${listKey}">← 포트폴리오로 돌아가기</a>
</nav>
<main class="page">
  <div class="detail-tags">
    <span class="tag tag-org">${escapeHtml(p.org)}</span>
    <span class="tag tag-period">${escapeHtml(p.period)}</span>
    <span class="tag tag-contrib">${escapeHtml(p.contrib)}</span>
  </div>
  <h1 class="detail-title">${escapeHtml(p.title)}</h1>
  <p class="detail-sub">${escapeHtml(p.subtitle)}</p>
${galleryHtml}
  <section class="detail-block">
    <div class="detail-block-label">업무 요약</div>
    <div class="detail-block-body">${summaryToHtml(p.summary)}</div>
  </section>
  <section class="detail-block">
    <div class="detail-block-label">업무 내용 · 전략</div>
    <div class="detail-block-body">${textBlockToHtml(p.details)}</div>
  </section>
  <section class="detail-block detail-result">
    <div class="detail-block-label">성과 · 결과</div>
    <div class="detail-block-body">${textBlockToHtml(p.result)}</div>
  </section>
</main>
<footer><p class="footer-copy">© 권가은</p></footer>
<script defer src="https://cdn.vercel-insights.com/v1/script.js"></script>
</body>
</html>
`;
}

function buildCardHtml(listKey, p) {
  const slug = slugFor(p);
  return `      <a class="proj-card" href="p/${slug}/" data-key="${listKey}">
        <div class="card-thumb-wrap">
          <img class="card-thumb" src="${encImgPath(p.thumb)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.style.display='none';this.parentElement.style.background='#eee'"/>
        </div>
        <div class="card-body">
          <div class="card-tags">
            <span class="tag tag-org">${escapeHtml(p.org)}</span>
            <span class="tag tag-period">${escapeHtml(p.period)}</span>
            <span class="tag tag-contrib">${escapeHtml(p.contrib)}</span>
          </div>
          <div class="card-title">${escapeHtml(p.title)}</div>
          <div class="card-sub">${escapeHtml(p.subtitle)}</div>
          <div class="card-cta">자세히 보기 →</div>
        </div>
      </a>`;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function build() {
  const urls = [];
  const cardHtmlByList = {};

  for (const [listKey, list] of Object.entries(PROJECTS)) {
    const seen = new Set();
    cardHtmlByList[listKey] = [];
    for (const p of list) {
      const slug = slugFor(p);
      if (seen.has(slug)) {
        throw new Error(`Duplicate slug "${slug}" in section "${listKey}" (project id: ${p.id})`);
      }
      seen.add(slug);

      const outPath = path.join(ROOT, 'p', slug, 'index.html');
      writeFile(outPath, buildDetailPage(listKey, p));
      urls.push(`/p/${slug}/`);
      cardHtmlByList[listKey].push(buildCardHtml(listKey, p));
    }
  }

  // robots.txt must ALLOW crawling — a Disallow would stop crawlers from ever
  // fetching the page, so they'd never see the <meta name="robots" content="noindex">
  // tag below and Google would still list the bare URL ("no information available").
  // noindex only works if the crawler is allowed to fetch and read it.
  const robots = `User-agent: *
Allow: /
`;
  writeFile(path.join(ROOT, 'robots.txt'), robots);

  // Pre-render card grids into index.html so the initial HTML (no JS) already
  // contains every project's title/subtitle/tags. Runtime JS re-renders the
  // same markup shape on load (see renderCard() in index.html), so there's no
  // visible flash and no structural mismatch.
  const indexPath = path.join(ROOT, 'index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  for (const listKey of Object.keys(SECTION_META)) {
    const startMarker = `<!--CARDS:${listKey}-->`;
    const endMarker = `<!--/CARDS:${listKey}-->`;
    const start = indexHtml.indexOf(startMarker);
    const end = indexHtml.indexOf(endMarker);
    if (start === -1 || end === -1 || end < start) {
      throw new Error(`Could not find CARDS markers for "${listKey}" in index.html`);
    }
    const inner = cardHtmlByList[listKey] ? cardHtmlByList[listKey].join('\n') : '';
    indexHtml =
      indexHtml.slice(0, start + startMarker.length) +
      '\n' + inner + '\n    ' +
      indexHtml.slice(end);
  }
  fs.writeFileSync(indexPath, indexHtml, 'utf8');

  console.log(`Built ${urls.length} project pages, robots.txt, and pre-rendered index.html cards.`);
}

build();
