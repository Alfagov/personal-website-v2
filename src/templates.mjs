import { cardImageOrDefault, cardImageStyle } from "./lib/card-image.js";

const escapeMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => escapeMap[char]);
const e = escapeHtml;
const safeHttpUrl = (value) => { try { const url = new URL(String(value)); return /^https?:$/.test(url.protocol) ? e(url.toString()) : "#"; } catch { return "#"; } };
let publicOrigin = "";
export function setPublicOrigin(origin) { publicOrigin = String(origin).replace(/\/$/, ""); }

function layout({ title, description, active = "", body, admin = false }) {
  const nav = [["/about", "About", "about"], ["/", "Research", "research"], ["/contact", "Contact", "contact"]]
    .map(([href, label, key]) => `<a href="${href}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${e(description)}">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#f7f7f4">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(description)}">
  <meta property="og:image" content="${e(publicOrigin)}/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${e(title)}">
  <meta name="twitter:description" content="${e(description)}">
  <meta name="twitter:image" content="${e(publicOrigin)}/og.png">
  <title>${e(title)}</title>
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/admin-editor.css">
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="shell header-inner">
      <a class="brand" href="/">Lorenzo Pulcini${admin ? " · Admin" : ""}</a>
      <nav class="nav" aria-label="Main navigation">${nav}</nav>
    </div>
  </header>
  ${body}
  <footer class="site-footer"><div class="shell footer"><span>Lorenzo Pulcini — Financial theory × software</span><span>St Louis, MO · 2026 · <a href="/admin">Admin</a></span></div></footer>${admin ? '<script type="module" src="/admin-editor.js"></script>' : ""}
</body>
</html>`;
}

const tags = (items = []) => `<div class="tags">${items.map((item) => `<span class="tag">${e(item)}</span>`).join("")}</div>`;

export function homePage(data) {
  const p = data.profile;
  const articleCards = data.articles.map((article) => {
    const visual = cardMedia(data, article);
    return `<a class="card${visual ? " card--media" : ""}" href="/articles/${encodeURIComponent(article.id)}">
    ${visual}<div class="meta"><span>${e(article.category)}</span><span>${e(article.status)}</span></div>
    <h3>${e(article.title)}</h3><p>${e(article.abstract)}</p>${tags(article.tags)}
  </a>`;
  }).join("");
  const projects = data.projects.map((project) => {
    const content = `<div class="meta">${e(project.meta)}</div><h3>${e(project.title)}</h3><p>${e(project.description)}</p>${tags(project.tags)}`;
    return project.url ? `<a class="project" href="${safeHttpUrl(project.url)}" target="_blank" rel="noopener noreferrer">${content}</a>` : `<article class="project">${content}</article>`;
  }).join("");
  return layout({ title: `${p.name} — Quantitative Finance & Engineering`, description: p.intro, active: "research", body: `<main id="main">
    <section class="hero shell"><p class="eyebrow">${e(p.eyebrow)}</p><h1>${e(p.headline)}</h1><p class="lede">${e(p.intro)}</p>${p.availability ? `<p class="availability">${e(p.availability)}</p>` : ""}</section>
    <hr class="rule">
    <section class="section shell"><div class="section-title"><div><p class="section-index">Section 01</p><h2>Publications &amp; articles</h2></div><span class="section-index">${data.articles.length} entries</span></div><div class="card-grid">${articleCards}</div></section>
    <hr class="rule">
    <section class="section shell"><div class="section-title"><div><p class="section-index">Section 02</p><h2>Research projects</h2></div></div><div class="project-grid">${projects}</div></section>
  </main>` });
}

function cardMedia(data, article) {
  if (!article.cardMediaId) return "";
  const media = (data.media || []).find((item) => item.id === article.cardMediaId);
  const settings = cardImageOrDefault(article.cardImage);
  return media ? `<div class="card-media card-media--configured card-media--ratio-${settings.aspectRatio}" style="${cardImageStyle(settings)}"><img src="/media/${media.id}" alt="${e(media.alt || "")}" loading="lazy"></div>` : "";
}

export function articlePage(data, article) {
  const custom = article.embed;
  if (custom?.placement === "only") {
    return layout({ title: `${article.title} — ${data.profile.name}`, description: article.abstract || article.title, active: "research", body: `<main id="main" class="article-custom-page">${articleEmbed(article)}${articleDownloads(data, article)}</main>` });
  }
  const metrics = article.metrics?.length ? `<div class="metrics">${article.metrics.map((metric) => `<div class="metric"><span>${e(metric.label)}</span><b>${e(metric.value)}</b></div>`).join("")}</div>` : "";
  const body = article.content ? renderRichText(article.content) : (article.body || []).map((paragraph, index) => `${articleBlock(data, paragraph)}${custom?.placement === `after-${index + 1}` ? articleEmbed(article) : ""}`).join("");
  const embedded = custom?.placement === "before" ? `${articleEmbed(article)}${body}` : custom && (custom.placement === "end" || article.content) ? `${body}${articleEmbed(article)}` : body;
  return layout({ title: `${article.title} — ${data.profile.name}`, description: article.abstract, active: "research", body: `<main id="main"><section class="article-hero shell"><a class="back" href="/">← Back to index</a><div class="article-info"><span class="status">${e(article.status)}</span><span class="meta">${e(article.date)}</span></div><h1>${e(article.title)}</h1>${article.abstract ? `<p class="lede">${e(article.abstract)}</p>` : ""}</section><hr class="rule"><article class="article-body shell">${metrics}${embedded}${articleDownloads(data, article)}<aside class="method"><strong>Method</strong>${e(article.method)}</aside></article></main>` });
}

function articleEmbed(article) {
  const height = Number.isInteger(article.embed?.height) ? article.embed.height : 720;
  return `<iframe class="article-embed" title="Custom content: ${e(article.title)}" src="/article-content/${encodeURIComponent(article.id)}" height="${height}" sandbox="allow-scripts" referrerpolicy="no-referrer" loading="lazy"></iframe>`;
}

function articleBlock(data, paragraph) {
  const image = /^\[\[image:([a-f0-9]{32})\]\]$/.exec(paragraph.trim());
  if (!image) return `<p>${e(paragraph)}</p>`;
  const media = (data.media || []).find((item) => item.id === image[1]);
  return media ? `<figure class="article-image"><img src="/media/${media.id}" alt="${e(media.alt || "")}" loading="lazy">${media.alt ? `<figcaption>${e(media.alt)}</figcaption>` : ""}</figure>` : `<p>${e(paragraph)}</p>`;
}

function articleDownloads(data, article) {
  const attachments = (data.attachments || []).filter((item) => item.articleId === article.id);
  if (!attachments.length) return "";
  return `<section class="article-downloads"><p class="eyebrow">Attachments</p><h2>Downloads</h2><ul>${attachments.map((item) => `<li><a href="/attachments/${item.id}">${e(item.title)} <span>PDF · ${formatBytes(item.size)}</span></a></li>`).join("")}</ul></section>`;
}

function formatBytes(size) { return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`; }

function timelineRows(items, type) {
  return items.map((item) => `<article class="timeline-row"><div><span class="meta">${e(item.period)}</span><span class="meta">${e(item.location)}</span></div><div><h3>${e(type === "education" ? item.degree : item.role)}</h3><h4>${e(type === "education" ? item.school : item.company)}</h4>${type === "education" ? `<p>${e(item.note)}</p>` : `<ul>${item.highlights.map((h) => `<li>${e(h)}</li>`).join("")}</ul>`}</div>${item.isCurrent ? '<span class="current">Current</span>' : ""}</article>`).join("");
}

export function aboutPage(data) {
  const ventures = data.ventures.map((item) => `<article class="timeline-row"><div><span class="meta">${e(item.period)}</span></div><div><h3>${e(item.name)}</h3><h4>${e(item.role)}</h4><p>${e(item.description)}</p>${tags(item.tags)}</div></article>`).join("");
  const skills = data.skills.map((group) => `<section class="skill"><h3>${e(group.label)}</h3>${tags(group.items)}</section>`).join("");
  return layout({ title: `About — ${data.profile.name}`, description: data.profile.about, active: "about", body: `<main id="main"><section class="hero shell"><p class="eyebrow">About · Fig. 02</p><h1>${e(data.profile.name)}</h1><p class="lede">${e(data.profile.about)}</p>${data.profile.availability ? `<p class="availability">${e(data.profile.availability)}</p>` : ""}</section><hr class="rule"><section class="section shell"><div class="section-title"><div><p class="section-index">Section 01</p><h2>Education</h2></div></div><div class="timeline">${timelineRows(data.education, "education")}</div></section><hr class="rule"><section class="section shell"><div class="section-title"><div><p class="section-index">Section 02</p><h2>Experience</h2></div></div><div class="timeline">${timelineRows(data.experiences, "experience")}</div></section><hr class="rule"><section class="section shell"><div class="section-title"><div><p class="section-index">Section 03</p><h2>Ventures &amp; applied work</h2></div></div><div class="timeline">${ventures}</div></section><hr class="rule"><section class="section shell"><div class="section-title"><div><p class="section-index">Section 04</p><h2>Skills &amp; credentials</h2></div></div><div class="skills">${skills}</div></section></main>` });
}

export function contactPage(data) {
  const p = data.profile;
  const rows = [["Email", `<a href="mailto:${e(p.email)}">${e(p.email)}</a>`], ["Phone", e(p.phone)], ["LinkedIn", `<a href="${safeHttpUrl(p.linkedin)}" target="_blank" rel="noopener noreferrer">${e(p.linkedin.replace(/^https?:\/\//, ""))}</a>`], ["GitHub", `<a href="${safeHttpUrl(p.github)}" target="_blank" rel="noopener noreferrer">${e(p.github.replace(/^https?:\/\//, ""))}</a>`], ["Location", e(p.location)]];
  return layout({ title: `Contact — ${p.name}`, description: `Contact ${p.name}`, active: "contact", body: `<main id="main"><section class="hero shell"><p class="eyebrow">Contact · Fig. 03</p><h1>Let’s work on something rigorous.</h1><p class="lede">Email is the fastest way to reach me. I usually answer within one business day.</p>${p.availability ? `<p class="availability">${e(p.availability)}</p>` : ""}</section><hr class="rule"><section class="section shell"><dl class="contact-list">${rows.map(([label, value]) => `<div class="contact-row"><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl></section></main>` });
}

export function loginPage(configured) {
  return layout({ title: "Admin sign in — Lorenzo Pulcini", description: "Protected content administration", admin: true, body: `<main id="main" class="auth-wrap shell"><section class="auth-card"><p class="eyebrow">Protected area</p><h1>Content administration</h1><p>Sign in with an explicitly authorized GitHub account to edit published content.</p>${configured ? '<a class="button" href="/auth/github">Continue with GitHub →</a>' : '<p class="notice">GitHub OAuth is not configured for this environment. See the deployment guide.</p>'}</section></main>` });
}

const navItem = (href, label, key, section) => `<a href="${href}"${section === key ? ' aria-current="page"' : ""}>${label}</a>`;
function adminShell({ data, user, section, content, notice = "" }) {
  return layout({ title: `Admin · ${section} — ${data.profile.name}`, description: "Protected content administration", admin: true, body: `<main id="main"><div class="shell"><header class="admin-head"><div><p class="eyebrow">Content management</p><h1>${e(data.profile.name)}</h1></div><div class="admin-user">Signed in as ${e(user.login)}<form method="post" action="/auth/logout">${csrf(user.csrf)}<button class="link-button" type="submit">Sign out</button></form></div></header><nav class="admin-nav" aria-label="Admin sections">${navItem("/admin?section=profile", "Site settings", "profile", section)}${navItem("/admin?section=articles", "Articles", "articles", section)}${navItem("/admin?section=experience", "Experience", "experience", section)}${navItem("/admin?section=education", "Education", "education", section)}</nav><section class="admin-main">${notice ? `<p class="notice" role="status">${e(notice)}</p>` : ""}${content}</section></div></main>` });
}

const input = (label, name, value, { full = false, type = "text", required = false, max = 200 } = {}) => `<label class="field${full ? " full" : ""}"><span class="label">${e(label)}</span><input type="${type}" name="${e(name)}" value="${e(value)}" maxlength="${max}"${required ? " required" : ""}></label>`;
const textarea = (label, name, value, { rows = 5, full = true, max = 10000 } = {}) => `<label class="field${full ? " full" : ""}"><span class="label">${e(label)}</span><textarea name="${e(name)}" rows="${rows}" maxlength="${max}">${e(value)}</textarea></label>`;
const csrf = (token) => `<input type="hidden" name="csrf" value="${e(token)}">`;
const checkbox = (label, name, checked) => `<label class="field checkbox"><input type="checkbox" name="${e(name)}" value="1"${checked ? " checked" : ""}><span class="label">${e(label)}</span></label>`;
const scriptJson = (value) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => ({ "<": "\\u003c", ">": "\\u003e", "&": "\\u0026", "\u2028": "\\u2028", "\u2029": "\\u2029" })[character]);

export function adminPage({ data, user, section, editId, csrfToken, notice }) {
  if (section === "profile") {
    const p = data.profile;
    const content = `<div class="admin-actions"><h2>Site settings</h2><a class="button secondary" href="/" target="_blank" rel="noopener noreferrer">View site ↗</a></div><form class="editor" method="post" action="/admin/profile">${csrf(csrfToken)}<div class="form-grid">${input("Name", "name", p.name, { required: true })}${input("Availability", "availability", p.availability)}${input("Eyebrow", "eyebrow", p.eyebrow, { full: true, max: 240 })}${textarea("Homepage headline", "headline", p.headline, { rows: 2, max: 300 })}${textarea("Homepage introduction", "intro", p.intro, { rows: 4, max: 1200 })}${textarea("About", "about", p.about, { rows: 6, max: 4000 })}${input("Email", "email", p.email, { type: "email", required: true })}${input("Phone", "phone", p.phone)}${input("Location", "location", p.location)}${input("LinkedIn URL", "linkedin", p.linkedin, { type: "url" })}${input("GitHub URL", "github", p.github, { type: "url" })}</div><div class="form-actions"><button class="button" type="submit">Save settings</button></div></form><section class="backup-panel"><div><p class="eyebrow">Content backup</p><h2>Export or restore all site data</h2><p class="muted">The JSON backup includes settings, image metadata, articles, custom code blocks, experience, education, projects, and skills. Image files remain in the Docker data volume and should be backed up with that volume.</p></div><div class="backup-actions"><a class="button secondary" href="/admin/backup">Download backup</a><form method="post" action="/admin/restore" enctype="multipart/form-data">${csrf(csrfToken)}<label class="file-field"><span class="label">JSON backup file (up to 5 MB)</span><input type="file" name="backup" accept="application/json,.json" required></label><label class="field checkbox"><input type="checkbox" name="replace" value="yes" required><span class="label">I understand this replaces all current site data.</span></label><button class="button" type="submit">Restore backup</button></form></div></section>`;
    return adminShell({ data, user, section, content, notice });
  }
  if (section === "articles") {
    const editing = editId === "new" ? { id: "", title: "", category: "Working Paper", status: "Draft", date: "", tags: [], abstract: "", metrics: [], body: [], method: "", cardMediaId: "", embed: null } : data.articles.find((item) => item.id === editId);
    const custom = editing?.embed || { html: "", css: "", js: "", data: "", placement: "end", height: 720 };
    const placements = [["only", "Custom page only (hide standard article layout)"], ["before", "Before standard article content"], ...Array.from({ length: 30 }, (_, index) => [`after-${index + 1}`, `After paragraph ${index + 1}`]), ["end", "After all standard article content"]];
    const codeFields = `<section class="code-panel field full"><div><p class="eyebrow">Custom HTML / CSS / JavaScript</p><p class="muted">Code is published in a sandboxed page. It can use inline HTML, CSS, and JavaScript, but cannot access the admin, submit forms, or make network requests. JSON data is exposed to your code as <code>window.__ARTICLE_DATA__</code>.</p></div><div class="form-grid">${textarea("HTML", "embedHtml", custom.html, { rows: 12, max: 350000 })}${textarea("CSS", "embedCss", custom.css, { rows: 10, max: 200000 })}${textarea("JavaScript", "embedJs", custom.js, { rows: 12, max: 350000 })}${textarea("JSON data for graphs / visualizations", "embedData", custom.data || "", { rows: 10, max: 500000 })}<label class="field"><span class="label">Placement</span><select name="embedPlacement">${placements.filter(([value]) => !value.startsWith("after-") || !editing?.content).map(([value, label]) => `<option value="${value}"${custom.placement === value ? " selected" : ""}>${label}</option>`).join("")}</select></label><label class="field"><span class="label">Embed height (200–3000px)</span><input type="number" name="embedHeight" min="200" max="3000" value="${e(custom.height)}"></label></div></section>`;
    const cardMediaField = `<label class="field full"><span class="label">Card image or GIF</span><select name="cardMediaId"><option value="">No card media</option>${(data.media || []).map((media) => `<option value="${media.id}"${editing?.cardMediaId === media.id ? " selected" : ""}>${e(media.alt || `Image ${media.id.slice(0, 8)}`)}</option>`).join("")}</select><span class="field-help">Choose an uploaded image or GIF to show above this article’s title on the homepage card.</span></label>`;
    const richText = editing ? `<section class="rich-text-panel field full"><div><p class="eyebrow">Article body</p><p class="muted">Use the rich-text editor for headings, lists, quotations, links, code, equations, and uploaded images. Type a display equation as <code>\\[ E = mc^2 \\]</code>, or use the Math button. Existing paragraph content is converted when the article is saved.</p></div><div class="tiptap-shell" data-tiptap-editor><div class="tiptap-toolbar" role="toolbar" aria-label="Article formatting"><button type="button" data-command="bold" aria-label="Bold"><strong>B</strong></button><button type="button" data-command="italic" aria-label="Italic"><em>I</em></button><button type="button" data-command="strike" aria-label="Strikethrough"><s>S</s></button><button type="button" data-command="code" aria-label="Inline code">&lt;/&gt;</button><button type="button" data-action="link" aria-label="Add link">Link</button><span class="toolbar-divider"></span><button type="button" data-command="heading2">H2</button><button type="button" data-command="heading3">H3</button><button type="button" data-command="bulletList" aria-label="Bulleted list">• List</button><button type="button" data-command="orderedList" aria-label="Numbered list">1. List</button><button type="button" data-command="blockquote" aria-label="Quote">Quote</button><button type="button" data-command="codeBlock" aria-label="Code block">Code block</button><button type="button" data-action="math" aria-label="Insert display equation">Math</button><span class="toolbar-divider"></span><select data-tiptap-media aria-label="Select uploaded image"><option value="">Insert uploaded image…</option>${(data.media || []).map((media) => `<option value="/media/${media.id}" data-alt="${e(media.alt || "")}">${e(media.alt || `Image ${media.id.slice(0, 8)}`)}</option>`).join("")}</select><button type="button" data-action="image">Insert image</button><span class="toolbar-divider"></span><button type="button" data-command="undo" aria-label="Undo">Undo</button><button type="button" data-command="redo" aria-label="Redo">Redo</button></div><div class="tiptap-content" data-tiptap-content></div><div class="tiptap-status"><span data-tiptap-count></span><span>Images come from the upload library below.</span></div><input type="hidden" name="content" value="" data-tiptap-output></div><script id="article-editor-initial" type="application/json">${scriptJson(editing.content || legacyBodyToRichText(editing.body || []))}</script></section>` : "";
    const editor = editing ? `<form class="editor" method="post" action="/admin/articles/save">${csrf(csrfToken)}<input type="hidden" name="id" value="${e(editing.id)}"><div class="form-grid">${input("Title", "title", editing.title, { full: true, required: true, max: 240 })}${input("Category", "category", editing.category, { required: true })}<label class="field"><span class="label">Status</span><select name="status">${["Article", "Preprint", "Working Paper", "Peer Reviewed", "Draft", "Thesis"].map((value) => `<option${editing.status === value ? " selected" : ""}>${value}</option>`).join("")}</select></label>${input("Date / attribution", "date", editing.date, { full: true })}${cardMediaField}${input("Tags (comma separated)", "tags", editing.tags.join(", "), { full: true, max: 500 })}${textarea("Abstract (optional for custom-page-only articles)", "abstract", editing.abstract, { rows: 4, max: 2000 })}${textarea("Metrics (one per line: label | value)", "metrics", editing.metrics.map((m) => `${m.label} | ${m.value}`).join("\n"), { rows: 4, max: 2000 })}${richText}${textarea("Method note", "method", editing.method, { rows: 4, max: 3000 })}${codeFields}</div><div class="form-actions"><a class="button secondary" href="/admin?section=articles">Cancel</a><button class="button" type="submit">Save article</button></div></form>` : "";
    const list = `<div class="admin-list">${data.articles.map((item) => `<article class="admin-row"><div><h3>${e(item.title)}</h3><p>${e(item.status)} · ${e(item.date)}</p></div><div class="row-actions"><a class="link-button" href="/admin?section=articles&amp;edit=${encodeURIComponent(item.id)}">Edit</a><form method="post" action="/admin/articles/delete">${csrf(csrfToken)}<input type="hidden" name="id" value="${e(item.id)}"><button class="link-button danger" type="submit">Delete</button></form></div></article>`).join("")}</div>`;
    const mediaLibrary = editing ? `<section class="media-panel"><div><p class="eyebrow">Article images</p><h2>Upload and embed images</h2><p class="muted">For a standard article, paste <code>[[image:IMAGE_ID]]</code> on its own line in the body. For custom pages, use <code>&lt;img src="/media/IMAGE_ID" alt="Description"&gt;</code> in the HTML field.</p><form method="post" action="/admin/media/upload" enctype="multipart/form-data" class="media-upload">${csrf(csrfToken)}<input type="hidden" name="articleId" value="${e(editing.id)}">${input("Image description", "alt", "", { max: 300 })}<label class="field"><span class="label">PNG, JPEG, GIF, or WebP (up to 8 MB)</span><input type="file" name="image" accept="image/png,image/jpeg,image/gif,image/webp" required></label><button class="button" type="submit">Upload image</button></form></div><div class="media-library">${(data.media || []).length ? (data.media || []).map((item) => `<article class="media-item"><img src="/media/${item.id}" alt="${e(item.alt || "")}" loading="lazy"><div><strong>${e(item.alt || "Untitled image")}</strong><code>[[image:${item.id}]]</code><code>/media/${item.id}</code></div></article>`).join("") : '<p class="muted">No uploaded images yet.</p>'}</div></section>` : "";
    const attachmentLibrary = editing ? `<section class="attachment-panel"><div><p class="eyebrow">PDF attachments</p><h2>Attach downloadable PDFs</h2><p class="muted">The document is always downloaded rather than shown inline. Save the article before uploading its first attachment.</p><form method="post" action="/admin/attachments/upload" enctype="multipart/form-data" class="media-upload">${csrf(csrfToken)}<input type="hidden" name="articleId" value="${e(editing.id)}">${input("Download label", "title", "", { required: true, max: 240 })}<label class="field"><span class="label">PDF (up to 20 MB)</span><input type="file" name="pdf" accept="application/pdf,.pdf" required></label><button class="button" type="submit">Attach PDF</button></form></div><div class="attachment-list">${(data.attachments || []).filter((item) => item.articleId === editing.id).length ? (data.attachments || []).filter((item) => item.articleId === editing.id).map((item) => `<a class="attachment-item" href="/attachments/${item.id}">${e(item.title)}<span>PDF · ${formatBytes(item.size)}</span></a>`).join("") : '<p class="muted">No PDFs attached to this article.</p>'}</div></section>` : "";
    const content = editing ? `<div class="admin-actions"><h2>${editing.id ? "Edit article" : "New article"}</h2></div>${editor}${mediaLibrary}${attachmentLibrary}` : `<div class="admin-actions"><h2>Articles &amp; publications</h2><a class="button" href="/admin?section=articles&amp;edit=new">+ New article</a></div>${list}`;
    return adminShell({ data, user, section, content, notice });
  }
  const isExperience = section === "experience";
  const collection = isExperience ? data.experiences : data.education;
  const blank = isExperience ? { id: "", company: "", role: "", period: "", location: "", highlights: [], isCurrent: false } : { id: "", degree: "", school: "", period: "", location: "", note: "", isCurrent: false };
  const editing = editId === "new" ? blank : collection.find((item) => item.id === editId);
  const fields = editing ? (isExperience ? `${input("Company", "company", editing.company, { required: true })}${input("Role", "role", editing.role, { required: true })}${input("Period", "period", editing.period)}${input("Location", "location", editing.location)}${textarea("Highlights (one per line)", "highlights", editing.highlights.join("\n"), { rows: 7, max: 8000 })}${checkbox("Current position", "isCurrent", editing.isCurrent)}` : `${input("Degree", "degree", editing.degree, { required: true })}${input("School", "school", editing.school, { required: true })}${input("Period", "period", editing.period)}${input("Location", "location", editing.location)}${textarea("Note", "note", editing.note, { rows: 5, max: 3000 })}${checkbox("Current", "isCurrent", editing.isCurrent)}`) : "";
  const editor = editing ? `<form class="editor" method="post" action="/admin/${section}/save">${csrf(csrfToken)}<input type="hidden" name="id" value="${e(editing.id)}"><div class="form-grid">${fields}</div><div class="form-actions"><a class="button secondary" href="/admin?section=${section}">Cancel</a><button class="button" type="submit">Save ${isExperience ? "experience" : "education"}</button></div></form>` : "";
  const list = `<div class="admin-list">${collection.map((item) => `<article class="admin-row"><div><h3>${e(isExperience ? `${item.role} — ${item.company}` : `${item.degree} — ${item.school}`)}</h3><p>${e(item.period)} · ${e(item.location)}</p></div><div class="row-actions"><a class="link-button" href="/admin?section=${section}&amp;edit=${encodeURIComponent(item.id)}">Edit</a><form method="post" action="/admin/${section}/delete">${csrf(csrfToken)}<input type="hidden" name="id" value="${e(item.id)}"><button class="link-button danger" type="submit">Delete</button></form></div></article>`).join("")}</div>`;
  const content = editing ? `<div class="admin-actions"><h2>${editing.id ? "Edit" : "Add"} ${isExperience ? "experience" : "education"}</h2></div>${editor}` : `<div class="admin-actions"><h2>${isExperience ? "Experience" : "Education"}</h2><a class="button" href="/admin?section=${section}&amp;edit=new">+ Add entry</a></div>${list}`;
  return adminShell({ data, user, section, content, notice });
}

export function errorPage(status, message) {
  return layout({ title: `${status} — Lorenzo Pulcini`, description: message, body: `<main id="main" class="shell error-page"><p class="eyebrow">Error ${status}</p><h1>${e(message)}</h1><p class="muted"><a href="/">Return to the homepage</a></p></main>` });
}
import { legacyBodyToRichText, renderRichText } from "./rich-text.mjs";
