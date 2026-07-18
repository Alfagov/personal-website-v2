const DISPLAY_MATH = /^\s*\\\[([\s\S]+)\\\]\s*$/;
const INLINE_MATH = /\\\(([^\n]+?)\\\)/g;

/** Convert LaTeX delimiters pasted or stored as text into Tiptap math nodes. */
export function normalizeMathDocument(document) {
  if (!document || document.type !== "doc" || !Array.isArray(document.content)) return document;
  return { ...document, content: document.content.map(normalizeBlock) };
}

function normalizeBlock(node) {
  if (!node || typeof node !== "object") return node;
  if (node.type === "paragraph") {
    const display = displayLatex(node.content);
    if (display) return { type: "blockMath", attrs: { latex: display } };
    return { ...node, content: normalizeInline(node.content) };
  }
  if (["heading"].includes(node.type)) return { ...node, content: normalizeInline(node.content) };
  if (["blockquote", "listItem", "bulletList", "orderedList"].includes(node.type) && Array.isArray(node.content)) return { ...node, content: node.content.map(normalizeBlock) };
  return node;
}

function displayLatex(content) {
  if (!Array.isArray(content) || !content.length || content.some((node) => node.type !== "text" || node.marks?.length)) return "";
  const match = DISPLAY_MATH.exec(content.map((node) => node.text || "").join(""));
  return match?.[1]?.trim() || "";
}

function normalizeInline(content) {
  if (!Array.isArray(content)) return content;
  return content.flatMap((node) => {
    if (node.type !== "text" || typeof node.text !== "string" || !node.text.includes("\\(")) return [node];
    const result = [];
    let start = 0;
    for (const match of node.text.matchAll(INLINE_MATH)) {
      const index = match.index ?? 0;
      if (index > start) result.push(textNode(node, node.text.slice(start, index)));
      const latex = match[1].trim();
      if (latex) result.push({ type: "inlineMath", attrs: { latex } });
      else result.push(textNode(node, match[0]));
      start = index + match[0].length;
    }
    if (start < node.text.length) result.push(textNode(node, node.text.slice(start)));
    return result.length ? result : [node];
  });
}

function textNode(source, text) {
  return source.marks?.length ? { type: "text", text, marks: source.marks } : { type: "text", text };
}
