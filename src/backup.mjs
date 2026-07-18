import { sanitizeCardImage } from "./lib/card-image.js";

const STATUSES = new Set(["Article", "Preprint", "Working Paper", "Peer Reviewed", "Draft", "Thesis"]);
const PLACEMENTS = new Set(["only", "before", "end", ...Array.from({ length: 30 }, (_, index) => `after-${index + 1}`)]);

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const valueText = (value, max, label, required = false) => {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new Error(`Invalid ${label}`);
  return value;
};
const list = (value, maxItems, itemMax, label) => {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`Invalid ${label}`);
  return value.map((item) => valueText(item, itemMax, label));
};
const id = (value, label) => {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(value)) throw new Error(`Invalid ${label}`);
  return value;
};
const mediaId = (value, label) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || !/^[a-f0-9]{32}$/.test(value)) throw new Error(`Invalid ${label}`);
  return value;
};
const bool = (value) => {
  if (typeof value !== "boolean") throw new Error("Invalid boolean value");
  return value;
};

function profile(value) {
  if (!isObject(value)) throw new Error("Invalid profile");
  return {
    name: valueText(value.name, 120, "profile name", true),
    eyebrow: valueText(value.eyebrow, 240, "profile eyebrow"),
    headline: valueText(value.headline, 300, "profile headline", true),
    intro: valueText(value.intro, 1200, "profile intro", true),
    about: valueText(value.about, 4000, "profile about", true),
    availability: valueText(value.availability, 200, "profile availability"),
    email: valueText(value.email, 254, "profile email", true),
    phone: valueText(value.phone, 100, "profile phone"),
    location: valueText(value.location, 200, "profile location"),
    linkedin: valueText(value.linkedin, 500, "profile LinkedIn"),
    github: valueText(value.github, 500, "profile GitHub")
  };
}

function embed(value) {
  if (value === undefined || value === null) return null;
  if (!isObject(value)) throw new Error("Invalid custom code block");
  const placement = valueText(value.placement, 16, "code placement");
  if (!PLACEMENTS.has(placement)) throw new Error("Invalid code placement");
  const height = value.height;
  if (!Number.isInteger(height) || height < 200 || height > 3000) throw new Error("Invalid code frame height");
  return {
    html: valueText(value.html, 350_000, "custom HTML"),
    css: valueText(value.css, 200_000, "custom CSS"),
    js: valueText(value.js, 350_000, "custom JavaScript"),
    data: jsonData(value.data),
    placement,
    height
  };
}

function jsonData(value) {
  if (value === undefined || value === null || value === "") return "";
  const source = valueText(value, 500_000, "custom JSON data");
  try { return JSON.stringify(JSON.parse(source)); } catch { throw new Error("Custom JSON data is not valid JSON"); }
}

function figures(value) {
  if (!Array.isArray(value) || value.length > 24) throw new Error("Invalid interactive figures");
  const seen = new Set();
  return value.map((figure) => {
    if (!isObject(figure)) throw new Error("Invalid interactive figure");
    const figureId = id(figure.id, "interactive figure id");
    if (seen.has(figureId)) throw new Error("Duplicate interactive figure id");
    seen.add(figureId);
    if (!Number.isInteger(figure.height) || figure.height < 200 || figure.height > 2000) throw new Error("Invalid interactive figure height");
    if (!["contained", "wide", "full"].includes(figure.layout)) throw new Error("Invalid interactive figure layout");
    return {
      id: figureId,
      title: valueText(figure.title, 160, "interactive figure title", true),
      caption: valueText(figure.caption || "", 1000, "interactive figure caption"),
      html: valueText(figure.html || "", 350_000, "interactive figure HTML"),
      css: valueText(figure.css || "", 200_000, "interactive figure CSS"),
      js: valueText(figure.js || "", 350_000, "interactive figure JavaScript"),
      data: jsonData(figure.data),
      height: figure.height,
      layout: figure.layout
    };
  });
}

function article(value) {
  if (!isObject(value) || !STATUSES.has(value.status)) throw new Error("Invalid article");
  if (!Array.isArray(value.metrics) || value.metrics.length > 12) throw new Error("Invalid article metrics");
  return {
    id: id(value.id, "article id"),
    title: valueText(value.title, 240, "article title", true),
    category: valueText(value.category, 120, "article category", true),
    status: value.status,
    date: valueText(value.date, 200, "article date"),
    tags: list(value.tags, 12, 60, "article tags"),
    abstract: valueText(value.abstract, 2000, "article abstract"),
    metrics: value.metrics.map((metric) => {
      if (!isObject(metric)) throw new Error("Invalid article metric");
      return { label: valueText(metric.label, 100, "metric label", true), value: valueText(metric.value, 100, "metric value", true) };
    }),
    body: list(value.body, 30, 4000, "article body"),
    method: valueText(value.method, 3000, "article method"),
    cardMediaId: mediaId(value.cardMediaId, "article card image"),
    cardImage: sanitizeCardImage(value.cardImage),
    content: sanitizeRichText(value.content),
    figures: figures(value.figures || []),
    embed: embed(value.embed)
  };
}

function project(value) {
  if (!isObject(value)) throw new Error("Invalid project");
  return { title: valueText(value.title, 240, "project title", true), description: valueText(value.description, 2000, "project description"), meta: valueText(value.meta, 200, "project metadata"), tags: list(value.tags, 20, 80, "project tags"), url: valueText(value.url, 500, "project URL") };
}

function experience(value) {
  if (!isObject(value)) throw new Error("Invalid experience");
  return { id: id(value.id, "experience id"), company: valueText(value.company, 160, "company", true), role: valueText(value.role, 160, "role", true), period: valueText(value.period, 120, "period"), location: valueText(value.location, 160, "location"), highlights: list(value.highlights, 20, 1000, "highlights"), isCurrent: bool(value.isCurrent) };
}

function education(value) {
  if (!isObject(value)) throw new Error("Invalid education");
  return { id: id(value.id, "education id"), degree: valueText(value.degree, 160, "degree", true), school: valueText(value.school, 160, "school", true), period: valueText(value.period, 120, "period"), location: valueText(value.location, 160, "location"), note: valueText(value.note, 3000, "education note"), isCurrent: bool(value.isCurrent) };
}

function venture(value) {
  if (!isObject(value)) throw new Error("Invalid venture");
  return { name: valueText(value.name, 200, "venture name", true), role: valueText(value.role, 160, "venture role"), period: valueText(value.period, 120, "venture period"), description: valueText(value.description, 2000, "venture description"), tags: list(value.tags, 20, 80, "venture tags") };
}

function skill(value) {
  if (!isObject(value)) throw new Error("Invalid skill group");
  return { label: valueText(value.label, 120, "skill label", true), items: list(value.items, 30, 120, "skill items") };
}

function media(value) {
  if (!isObject(value)) throw new Error("Invalid image metadata");
  const idValue = id(value.id, "image id");
  const filename = valueText(value.filename, 80, "image filename", true);
  if (!new RegExp(`^${idValue}\\.(png|jpg|gif|webp)$`).test(filename)) throw new Error("Invalid image filename");
  const mime = valueText(value.mime, 20, "image type", true);
  if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(mime)) throw new Error("Invalid image type");
  if (!Number.isInteger(value.size) || value.size < 1 || value.size > 8 * 1024 * 1024) throw new Error("Invalid image size");
  return { id: idValue, filename, mime, size: value.size, createdAt: valueText(value.createdAt, 40, "image creation time", true), alt: valueText(value.alt || "", 300, "image alt text") };
}

function attachment(value) {
  if (!isObject(value)) throw new Error("Invalid PDF attachment metadata");
  const idValue = id(value.id, "PDF attachment id");
  const filename = valueText(value.filename, 80, "PDF filename", true);
  if (filename !== `${idValue}.pdf`) throw new Error("Invalid PDF filename");
  if (value.mime !== "application/pdf") throw new Error("Invalid PDF type");
  if (!Number.isInteger(value.size) || value.size < 5 || value.size > 20 * 1024 * 1024) throw new Error("Invalid PDF size");
  return { id: idValue, articleId: id(value.articleId, "PDF article id"), filename, mime: "application/pdf", size: value.size, createdAt: valueText(value.createdAt, 40, "PDF creation time", true), title: valueText(value.title, 240, "PDF title", true) };
}

const collection = (value, limit, mapper, label) => {
  if (!Array.isArray(value) || value.length > limit) throw new Error(`Invalid ${label}`);
  return value.map(mapper);
};

export function sanitizeSiteData(value) {
  if (!isObject(value)) throw new Error("Invalid backup data");
  return {
    profile: profile(value.profile),
    media: collection(value.media || [], 200, media, "images"),
    attachments: collection(value.attachments || [], 100, attachment, "PDF attachments"),
    articles: collection(value.articles, 100, article, "articles"),
    projects: collection(value.projects, 50, project, "projects"),
    experiences: collection(value.experiences, 100, experience, "experiences"),
    education: collection(value.education, 100, education, "education"),
    ventures: collection(value.ventures, 50, venture, "ventures"),
    skills: collection(value.skills, 50, skill, "skills")
  };
}

export function createBackup(data) {
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), data: sanitizeSiteData(data) };
}

export function parseBackup(raw) {
  if (typeof raw !== "string" || Buffer.byteLength(raw, "utf8") > 5 * 1024 * 1024) throw new Error("Backup is too large");
  let backup;
  try { backup = JSON.parse(raw); } catch { throw new Error("Backup is not valid JSON"); }
  if (!isObject(backup) || backup.schemaVersion !== 1 || !isObject(backup.data)) throw new Error("Backup format is not supported");
  return sanitizeSiteData(backup.data);
}
import { sanitizeRichText } from "./rich-text.mjs";
