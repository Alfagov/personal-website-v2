import { Editor, Extension, InputRule } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { BlockMath } from "@tiptap/extension-mathematics";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import "katex/dist/katex.min.css";

const BracketMathShortcut = Extension.create({
  name: "bracketMathShortcut",
  addInputRules() {
    return [new InputRule({
      find: /^\\\[([^\n]+)\\\]$/,
      handler: ({ state, range, match }) => {
        const latex = match[1].trim();
        if (!latex) return;
        const type = this.editor.schema.nodes.blockMath;
        const $from = state.doc.resolve(range.from);
        const node = type.create({ latex });
        const consumesParagraph = $from.depth > 0 && $from.parent.isTextblock && range.from === $from.start() && range.to === $from.end();
        const replacement = consumesParagraph && $from.node(-1).canReplaceWith($from.index(-1), $from.indexAfter(-1), type) ? { from: $from.before(), to: $from.after() } : range;
        state.tr.replaceWith(replacement.from, replacement.to, node);
      }
    })];
  }
});

function normalizeLatex(value) {
  return String(value).trim().replace(/^\\\[\s*/, "").replace(/\s*\\\]$/, "").trim();
}

const shell = document.querySelector("[data-tiptap-editor]");
if (shell) {
  const initialNode = document.querySelector("#article-editor-initial");
  const output = shell.querySelector("[data-tiptap-output]");
  const count = shell.querySelector("[data-tiptap-count]");
  const media = shell.querySelector("[data-tiptap-media]");
  let initial = { type: "doc", content: [] };
  try { initial = JSON.parse(initialNode?.textContent || "{}"); } catch { /* Server validation remains authoritative. */ }

  let editor;
  editor = new Editor({
    element: shell.querySelector("[data-tiptap-content]"),
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Image.configure({ allowBase64: false, HTMLAttributes: { class: "article-editor-image" } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      BlockMath.configure({
        katexOptions: { throwOnError: false, strict: "ignore", trust: false },
        onClick: (node, pos) => {
          const latex = window.prompt("Edit LaTeX display equation", `\\[${node.attrs.latex}\\]`);
          if (latex !== null && normalizeLatex(latex)) editor.chain().setNodeSelection(pos).updateBlockMath({ latex: normalizeLatex(latex) }).focus().run();
        }
      }),
      BracketMathShortcut,
      Placeholder.configure({ placeholder: "Start writing your article…" }),
      CharacterCount.configure({ limit: 30_000 })
    ],
    content: initial,
    onUpdate: sync
  });

  function sync() {
    output.value = JSON.stringify(editor.getJSON());
    count.textContent = `${editor.storage.characterCount.characters().toLocaleString()} / 30,000 characters`;
    shell.querySelectorAll("[data-command]").forEach((button) => button.classList.toggle("is-active", active(button.dataset.command)));
    shell.querySelector("[data-command=undo]").disabled = !editor.can().undo();
    shell.querySelector("[data-command=redo]").disabled = !editor.can().redo();
  }

  function active(command) {
    if (command === "heading2") return editor.isActive("heading", { level: 2 });
    if (command === "heading3") return editor.isActive("heading", { level: 3 });
    return editor.isActive(command);
  }

  function run(command) {
    const chain = editor.chain().focus();
    const actions = {
      bold: () => chain.toggleBold().run(), italic: () => chain.toggleItalic().run(), strike: () => chain.toggleStrike().run(), code: () => chain.toggleCode().run(),
      heading2: () => chain.toggleHeading({ level: 2 }).run(), heading3: () => chain.toggleHeading({ level: 3 }).run(),
      bulletList: () => chain.toggleBulletList().run(), orderedList: () => chain.toggleOrderedList().run(), blockquote: () => chain.toggleBlockquote().run(), codeBlock: () => chain.toggleCodeBlock().run(),
      undo: () => chain.undo().run(), redo: () => chain.redo().run()
    };
    actions[command]?.();
    sync();
  }

  shell.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.command) return run(button.dataset.command);
    if (button.dataset.action === "link") {
      const previous = editor.getAttributes("link").href || "";
      const href = window.prompt("Paste an https:// link", previous);
      if (href === null) return;
      if (!href.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
      else editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
      return sync();
    }
    if (button.dataset.action === "image") {
      const option = media.selectedOptions[0];
      if (option?.value) editor.chain().focus().setImage({ src: option.value, alt: option.dataset.alt || "" }).run();
      return sync();
    }
    if (button.dataset.action === "math") {
      const latex = window.prompt("Enter a display equation in LaTeX. You may wrap it in \\[ and \\].", "");
      if (latex !== null && normalizeLatex(latex)) editor.chain().focus().insertBlockMath({ latex: normalizeLatex(latex) }).run();
      return sync();
    }
  });
  editor.on("selectionUpdate", sync);
  shell.closest("form").addEventListener("submit", sync);
  sync();
}
