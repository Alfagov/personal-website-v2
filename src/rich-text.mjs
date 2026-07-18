import katex from "katex";
import { normalizeMathDocument } from "./lib/math-document.js";

const MAX_DOCUMENT_BYTES = 150_000;
const MEDIA_PATH = /^\/media\/([a-f0-9]{32})$/;
const FIGURE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const IMAGE_WIDTHS = new Set(["40", "60", "80", "100", "wide"]);
const IMAGE_ALIGNMENTS = new Set(["left", "center", "right"]);
const IMAGE_RATIOS = new Set(["auto", "1-1", "4-3", "3-2", "16-9", "21-9", "3-4"]);
const IMAGE_FITS = new Set(["cover", "contain"]);
const escape = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export function sanitizeRichText(value) {
  if (value === undefined || value === null || value === "") return null;
  if (!isObject(value) || value.type !== "doc" || !Array.isArray(value.content)) throw new Error("Invalid rich-text document");
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_DOCUMENT_BYTES) throw new Error("Rich-text document is too large");
  value = normalizeMathDocument(value);
  const state = { text: 0, nodes: 0 };
  return { type: "doc", content: value.content.map((node) => block(node, state)) };
}

function block(node, state) {
  countNode(state);
  if (!isObject(node)) throw new Error("Invalid rich-text node");
  if (node.type === "paragraph") return { type: "paragraph", content: inlineContent(node.content, state) };
  if (node.type === "heading") {
    const level = node.attrs?.level;
    if (![2, 3, 4].includes(level)) throw new Error("Invalid rich-text heading");
    return { type: "heading", attrs: { level }, content: inlineContent(node.content, state) };
  }
  if (node.type === "blockquote") return { type: "blockquote", content: blocks(node.content, state) };
  if (node.type === "bulletList" || node.type === "orderedList") return { type: node.type, content: listItems(node.content, state) };
  if (node.type === "codeBlock") return { type: "codeBlock", content: textOnly(node.content, state) };
  if (node.type === "horizontalRule") return { type: "horizontalRule" };
  if (node.type === "blockMath") return { type: "blockMath", attrs: { latex: latexValue(node.attrs?.latex) } };
  if (node.type === "image") {
    const source = String(node.attrs?.src || "");
    const match = MEDIA_PATH.exec(source);
    if (!match) throw new Error("Rich-text images must use an uploaded image");
    return { type: "image", attrs: {
      src: source,
      alt: textValue(node.attrs?.alt ?? "", 300, "image description"),
      title: "",
      caption: textValue(node.attrs?.caption ?? "", 1000, "image caption"),
      width: optionValue(node.attrs?.width, IMAGE_WIDTHS, "100"),
      alignment: optionValue(node.attrs?.alignment, IMAGE_ALIGNMENTS, "center"),
      aspectRatio: optionValue(node.attrs?.aspectRatio, IMAGE_RATIOS, "auto"),
      objectFit: optionValue(node.attrs?.objectFit, IMAGE_FITS, "cover")
    } };
  }
  if (node.type === "interactiveFigure") {
    const id = String(node.attrs?.id || "");
    if (!FIGURE_ID.test(id)) throw new Error("Invalid interactive figure reference");
    return { type: "interactiveFigure", attrs: { id, label: textValue(String(node.attrs?.label || "Interactive figure"), 160, "interactive figure label") } };
  }
  throw new Error("Unsupported rich-text block");
}

function blocks(value, state) {
  if (!Array.isArray(value) || value.length > 100) throw new Error("Invalid rich-text block content");
  return value.map((node) => block(node, state));
}

function listItems(value, state) {
  if (!Array.isArray(value) || value.length > 100) throw new Error("Invalid rich-text list");
  return value.map((node) => {
    countNode(state);
    if (!isObject(node) || node.type !== "listItem") throw new Error("Invalid rich-text list item");
    return { type: "listItem", content: blocks(node.content, state) };
  });
}

function inlineContent(value, state) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 500) throw new Error("Invalid rich-text inline content");
  return value.map((node) => inline(node, state));
}

function textOnly(value, state) {
  const content = inlineContent(value, state);
  if (content.some((node) => node.type !== "text")) throw new Error("Invalid rich-text code block");
  return content.map((node) => ({ type: "text", text: node.text }));
}

function inline(node, state) {
  countNode(state);
  if (!isObject(node)) throw new Error("Invalid rich-text inline node");
  if (node.type === "hardBreak") return { type: "hardBreak" };
  if (node.type === "inlineMath") return { type: "inlineMath", attrs: { latex: latexValue(node.attrs?.latex) } };
  if (node.type !== "text") throw new Error("Unsupported rich-text inline node");
  const text = textValue(node.text, 30_000, "rich-text content");
  state.text += text.length;
  if (state.text > 30_000) throw new Error("Rich-text content is too long");
  const marks = marksFor(node.marks);
  return marks.length ? { type: "text", text, marks } : { type: "text", text };
}

function marksFor(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 4) throw new Error("Invalid rich-text formatting");
  const seen = new Set();
  return value.map((mark) => {
    if (!isObject(mark) || !["bold", "italic", "strike", "code", "link"].includes(mark.type) || seen.has(mark.type)) throw new Error("Invalid rich-text formatting");
    seen.add(mark.type);
    if (mark.type !== "link") return { type: mark.type };
    const href = safeLink(mark.attrs?.href);
    return { type: "link", attrs: { href } };
  });
}

function safeLink(value) {
  try {
    const url = new URL(String(value));
    if (!/^https?:$/.test(url.protocol)) throw new Error();
    return url.toString();
  } catch { throw new Error("Invalid rich-text link"); }
}

function latexValue(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 20_000) throw new Error("Invalid rich-text equation");
  return value.trim();
}

function optionValue(value, choices, fallback) { return choices.has(String(value || "")) ? String(value) : fallback; }

function countNode(state) { state.nodes += 1; if (state.nodes > 2_000) throw new Error("Rich-text document has too many nodes"); }
function textValue(value, max, label) { if (typeof value !== "string" || value.length > max) throw new Error(`Invalid ${label}`); return value; }
function isObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }

export function legacyBodyToRichText(body = []) {
  return { type: "doc", content: body.map((paragraph) => {
    const image = /^\[\[image:([a-f0-9]{32})\]\]$/.exec(String(paragraph).trim());
    if (image) return { type: "image", attrs: { src: `/media/${image[1]}`, alt: "", title: "", caption: "", width: "100", alignment: "center", aspectRatio: "auto", objectFit: "cover" } };
    return { type: "paragraph", content: paragraph ? [{ type: "text", text: String(paragraph) }] : [] };
  }) };
}

export function mediaIdsInRichText(document) {
  const ids = new Set();
  walk(document, (node) => { if (node.type === "image") ids.add(MEDIA_PATH.exec(node.attrs.src)[1]); });
  return ids;
}

export function figureIdsInRichText(document) {
  const ids = new Set();
  walk(document, (node) => { if (node.type === "interactiveFigure") ids.add(node.attrs.id); });
  return ids;
}

function walk(node, visit) { visit(node); for (const child of node.content || []) walk(child, visit); }

export function renderRichText(document, options = {}) {
  if (!document) return "";
  document = normalizeMathDocument(document);
  return document.content.map((node) => renderBlock(node, options)).join("");
}

function renderBlock(node, options) {
  if (node.type === "paragraph") return `<p>${renderInline(node.content)}</p>`;
  if (node.type === "heading") return `<h${node.attrs.level}>${renderInline(node.content)}</h${node.attrs.level}>`;
  if (node.type === "blockquote") return `<blockquote>${node.content.map((child) => renderBlock(child, options)).join("")}</blockquote>`;
  if (node.type === "bulletList") return `<ul>${node.content.map((item) => `<li>${item.content.map((child) => renderBlock(child, options)).join("")}</li>`).join("")}</ul>`;
  if (node.type === "orderedList") return `<ol>${node.content.map((item) => `<li>${item.content.map((child) => renderBlock(child, options)).join("")}</li>`).join("")}</ol>`;
  if (node.type === "codeBlock") return `<pre><code>${node.content.map((item) => escape(item.text)).join("")}</code></pre>`;
  if (node.type === "horizontalRule") return "<hr>";
  if (node.type === "blockMath") return `<div class="article-math" aria-label="Mathematical equation">${katex.renderToString(node.attrs.latex, { displayMode: true, throwOnError: false, strict: "ignore", trust: false })}</div>`;
  if (node.type === "image") {
    const attrs = node.attrs || {};
    const width = optionValue(attrs.width, IMAGE_WIDTHS, "100");
    const alignment = optionValue(attrs.alignment, IMAGE_ALIGNMENTS, "center");
    const ratio = optionValue(attrs.aspectRatio, IMAGE_RATIOS, "auto");
    const fit = optionValue(attrs.objectFit, IMAGE_FITS, "cover");
    const caption = typeof attrs.caption === "string" ? attrs.caption : "";
    return `<figure class="article-image article-image--w-${width} article-image--align-${alignment} article-image--ratio-${ratio} article-image--fit-${fit}"><img src="${escape(attrs.src)}" alt="${escape(attrs.alt || "")}" loading="lazy">${caption ? `<figcaption>${escape(caption)}</figcaption>` : ""}</figure>`;
  }
  if (node.type === "interactiveFigure") return typeof options.renderFigure === "function" ? options.renderFigure(node.attrs.id) : "";
  return "";
}

function renderInline(content = []) {
  return content.map((node) => {
    if (node.type === "hardBreak") return "<br>";
    if (node.type === "inlineMath") return `<span class="article-inline-math" aria-label="Mathematical expression">${katex.renderToString(node.attrs.latex, { displayMode: false, throwOnError: false, strict: "ignore", trust: false })}</span>`;
    let value = escape(node.text);
    for (const mark of node.marks || []) {
      if (mark.type === "bold") value = `<strong>${value}</strong>`;
      if (mark.type === "italic") value = `<em>${value}</em>`;
      if (mark.type === "strike") value = `<s>${value}</s>`;
      if (mark.type === "code") value = `<code>${value}</code>`;
      if (mark.type === "link") value = `<a href="${escape(mark.attrs.href)}" target="_blank" rel="noopener noreferrer">${value}</a>`;
    }
    return value;
  }).join("");
}
