import test from "node:test";
import assert from "node:assert/strict";
import { figureIdsInRichText, renderRichText, sanitizeRichText } from "../src/rich-text.mjs";
import { sanitizeFigures } from "../src/lib/server/content.mjs";

test("interactive figures are validated, referenced, and rendered through a caller-owned sandbox", () => {
  const document = sanitizeRichText({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Before" }] }, { type: "interactiveFigure", attrs: { id: "figure-risk-map", label: "Risk map" } }] });
  assert.deepEqual([...figureIdsInRichText(document)], ["figure-risk-map"]);
  const html = renderRichText(document, { renderFigure: (id) => `<iframe sandbox="allow-scripts" src="/figures/article/${id}"></iframe>` });
  assert.match(html, /sandbox="allow-scripts"/);
  assert.match(html, /figure-risk-map/);
});

test("figure code and JSON data are normalized before storage", () => {
  const [figure] = sanitizeFigures([{ id: "figure-sim", title: "Simulation", caption: "Explore outcomes", html: "<canvas></canvas>", css: "canvas{}", js: "draw()", data: "{\"years\": 10}", height: 520, layout: "wide" }]);
  assert.equal(figure.data, '{\n  "years": 10\n}');
  assert.equal(figure.layout, "wide");
  assert.throws(() => sanitizeFigures([{ ...figure, data: "{broken" }]), /invalid/i);
});

test("backup round-trips an inline interactive figure", async () => {
  const { createBackup, parseBackup } = await import("../src/backup.mjs");
  const { defaultData } = await import("../src/default-data.mjs");
  const data = structuredClone(defaultData);
  data.articles[0].figures = [{ id: "figure-bars", title: "Scenarios", caption: "Compare outcomes", html: "<div id='bars'></div>", css: "#bars{}", js: "render()", data: "{\"values\":[1,2]}", height: 480, layout: "contained" }];
  data.articles[0].content = { type: "doc", content: [{ type: "interactiveFigure", attrs: { id: "figure-bars", label: "Scenarios" } }] };
  const restored = parseBackup(JSON.stringify(createBackup(data)));
  assert.equal(restored.articles[0].figures[0].title, "Scenarios");
  assert.equal(restored.articles[0].content.content[0].attrs.id, "figure-bars");
});

test("LaTeX bracket and parenthesis delimiters become display and inline math", () => {
  const document = sanitizeRichText({
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "\\[C(S,K,T,z)=K\\,f_\\theta\\left(\\frac{S}{K},T,z\\right)\\]" }] },
      { type: "paragraph", content: [{ type: "text", text: "The spot price is \\(S\\)." }] }
    ]
  });
  assert.equal(document.content[0].type, "blockMath");
  assert.equal(document.content[1].content[1].type, "inlineMath");
  const html = renderRichText(document);
  assert.match(html, /article-math/);
  assert.match(html, /article-inline-math/);
  assert.doesNotMatch(html, /\\\[|\\\(|\\\]|\\\)/);
});

test("legacy stored delimiter text is normalized during public rendering", () => {
  const html = renderRichText({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "\\(S\\)" }] }] });
  assert.match(html, /article-inline-math/);
  assert.doesNotMatch(html, />\\\(S\\\)</);
});

test("published figure frames opt out of scrolling and support automatic resizing", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../src/routes/articles/[id]/+page.server.js", import.meta.url), "utf8"));
  const frame = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../src/routes/figures/[articleId]/[figureId]/+server.js", import.meta.url), "utf8"));
  assert.match(source, /data-figure-frame/);
  assert.match(source, /scrolling=\"no\"/);
  assert.match(frame, /article-figure-resize/);
  assert.match(frame, /ResizeObserver/);
});

test("article images preserve safe layout settings and render captions", () => {
  const source = "/media/0123456789abcdef0123456789abcdef";
  const document = sanitizeRichText({ type: "doc", content: [{ type: "image", attrs: { src: source, alt: "A <chart>", caption: "Returns & risk", width: "60", alignment: "right", aspectRatio: "16-9", objectFit: "contain" } }] });
  assert.deepEqual(document.content[0].attrs, { src: source, alt: "A <chart>", title: "", caption: "Returns & risk", width: "60", alignment: "right", aspectRatio: "16-9", objectFit: "contain" });
  const html = renderRichText(document);
  assert.match(html, /article-image--w-60 article-image--align-right article-image--ratio-16-9 article-image--fit-contain/);
  assert.match(html, /alt="A &lt;chart&gt;"/);
  assert.match(html, /<figcaption>Returns &amp; risk<\/figcaption>/);
});

test("legacy and invalid image layout values receive safe defaults", () => {
  const source = "/media/0123456789abcdef0123456789abcdef";
  const document = sanitizeRichText({ type: "doc", content: [{ type: "image", attrs: { src: source, alt: "Chart", width: "999", alignment: "floating", aspectRatio: "script", objectFit: "stretch" } }] });
  assert.equal(document.content[0].attrs.width, "100");
  assert.equal(document.content[0].attrs.alignment, "center");
  assert.equal(document.content[0].attrs.aspectRatio, "auto");
  assert.equal(document.content[0].attrs.objectFit, "cover");
  assert.doesNotMatch(renderRichText(document), /figcaption/);
});
