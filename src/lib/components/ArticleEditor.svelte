<script>
  import { onMount } from "svelte";
  import { Editor, Extension, InputRule, Node, mergeAttributes } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import Image from "@tiptap/extension-image";
  import Link from "@tiptap/extension-link";
  import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";
  import { CharacterCount, Placeholder } from "@tiptap/extensions";
  import { normalizeMathDocument } from "$lib/math-document.js";

  let { content, media = [], initialFigures = [] } = $props();
  let mount;
  let editor = $state(null);
  // svelte-ignore state_referenced_locally
  let output = $state(JSON.stringify(normalizeMathDocument(content || { type: "doc", content: [] })));
  let count = $state(0);
  // svelte-ignore state_referenced_locally
  let figures = $state(structuredClone(initialFigures || []));
  let selectedImage = $state("");
  let imageModalOpen = $state(false);
  let imageDraft = $state(null);
  let imagePosition = $state(null);
  let modalOpen = $state(false);
  let draft = $state(null);
  let modalError = $state("");
  let activeTab = $state("html");
  let previewKey = $state(0);
  let figuresJson = $derived(JSON.stringify(figures));
  let previewDocument = $derived(draft ? buildPreview(draft, previewKey) : "");

  const blankFigure = () => ({ id: "", title: "Untitled interactive figure", caption: "", layout: "wide", height: 520, html: '<div class="figure-root"><h2>Interactive figure</h2><p>Use the controls to explore the data.</p><div id="chart"></div></div>', css: "body{color:#111316;background:#fff;padding:24px}.figure-root{max-width:900px;margin:auto}button,input{font:inherit}", js: "const root=document.querySelector('#chart');\nroot.textContent='Add your visualization code here.';", data: "{\n  \"values\": [12, 24, 18, 31, 27]\n}" });

  const templates = {
    bars: {
      title: "Interactive bar comparison",
      html: '<div class="wrap"><div class="head"><h2>Scenario comparison</h2><label>Scale <input id="scale" type="range" min="50" max="150" value="100"></label></div><div id="bars" class="bars"></div></div>',
      css: "body{padding:24px;background:#fff;color:#111316}.wrap{max-width:900px;margin:auto}.head{display:flex;justify-content:space-between;gap:20px;align-items:center}.bars{display:grid;gap:12px;margin-top:28px}.row{display:grid;grid-template-columns:120px 1fr 64px;gap:12px;align-items:center}.track{height:22px;background:#eceef0}.bar{height:100%;background:#0f62fe;transition:width .18s}.value{font-variant-numeric:tabular-nums}",
      js: "const values=window.__ARTICLE_DATA__.values;const scale=document.querySelector('#scale');const root=document.querySelector('#bars');function draw(){root.innerHTML='';for(const item of values){const row=document.createElement('div');row.className='row';const value=Math.round(item.value*Number(scale.value)/100);row.innerHTML=`<span>${item.label}</span><div class=\"track\"><div class=\"bar\" style=\"width:${Math.min(100,value)}%\"></div></div><strong class=\"value\">${value}</strong>`;root.append(row)}}scale.addEventListener('input',draw);draw();",
      data: "{\n  \"values\": [\n    { \"label\": \"Base\", \"value\": 68 },\n    { \"label\": \"Upside\", \"value\": 91 },\n    { \"label\": \"Downside\", \"value\": 43 }\n  ]\n}"
    },
    scatter: {
      title: "Interactive scatter plot",
      html: '<div class="wrap"><div class="head"><h2>Risk / return map</h2><output id="tip">Hover a point</output></div><canvas id="plot" width="900" height="430"></canvas></div>',
      css: "body{padding:20px;background:#fff;color:#111316}.wrap{max-width:900px;margin:auto}.head{display:flex;align-items:baseline;justify-content:space-between}canvas{width:100%;height:auto;border-left:1px solid #111;border-bottom:1px solid #111}output{color:#5a5f68}",
      js: "const canvas=document.querySelector('#plot'),ctx=canvas.getContext('2d'),tip=document.querySelector('#tip'),pts=window.__ARTICLE_DATA__.points;function draw(active=-1){ctx.clearRect(0,0,canvas.width,canvas.height);pts.forEach((p,i)=>{ctx.beginPath();ctx.arc(50+p.risk*8,380-p.return*7,i===active?9:6,0,Math.PI*2);ctx.fillStyle=i===active?'#111316':'#0f62fe';ctx.fill()})}canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;let hit=-1;pts.forEach((p,i)=>{if(Math.hypot(x-(50+p.risk*8),y-(380-p.return*7))<14)hit=i});tip.textContent=hit<0?'Hover a point':`${pts[hit].name}: ${pts[hit].risk}% risk, ${pts[hit].return}% return`;draw(hit)});draw();",
      data: "{\n  \"points\": [\n    { \"name\": \"A\", \"risk\": 18, \"return\": 22 },\n    { \"name\": \"B\", \"risk\": 42, \"return\": 31 },\n    { \"name\": \"C\", \"risk\": 66, \"return\": 44 }\n  ]\n}"
    },
    simulation: {
      title: "Parameter simulation",
      html: '<div class="sim"><h2>Compounding simulator</h2><label>Annual return <input id="rate" type="range" min="-10" max="30" value="8"> <output id="rateOut"></output></label><div id="result"></div><canvas id="line" width="900" height="360"></canvas></div>',
      css: "body{padding:24px;background:#fff;color:#111316}.sim{max-width:900px;margin:auto}label{display:block;margin:18px 0}#result{font-size:2rem;font-weight:700;margin:14px 0}canvas{width:100%;height:auto;background:#f7f7f4}",
      js: "const rate=document.querySelector('#rate'),out=document.querySelector('#rateOut'),result=document.querySelector('#result'),canvas=document.querySelector('#line'),ctx=canvas.getContext('2d'),cfg=window.__ARTICLE_DATA__;function draw(){const r=Number(rate.value)/100;out.value=`${rate.value}%`;const vals=Array.from({length:cfg.years+1},(_,i)=>cfg.principal*Math.pow(1+r,i));result.textContent=vals.at(-1).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0});ctx.clearRect(0,0,900,360);ctx.beginPath();vals.forEach((v,i)=>{const x=30+i*(840/cfg.years),y=330-(v/Math.max(...vals))*290;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle='#0f62fe';ctx.lineWidth=4;ctx.stroke()}rate.addEventListener('input',draw);draw();",
      data: "{\n  \"principal\": 10000,\n  \"years\": 20\n}"
    }
  };

  const InteractiveFigure = Node.create({
    name: "interactiveFigure",
    group: "block",
    atom: true,
    draggable: true,
    addAttributes() { return { id: { default: null }, label: { default: "Interactive figure" } }; },
    parseHTML() { return [{ tag: "div[data-interactive-figure]" }]; },
    renderHTML({ HTMLAttributes }) {
      return ["div", mergeAttributes(HTMLAttributes, { "data-interactive-figure": HTMLAttributes.id, class: "figure-node" }), ["span", { class: "figure-node-kicker" }, "Interactive figure"], ["strong", {}, HTMLAttributes.label || "Interactive figure"], ["span", { class: "figure-node-hint" }, "Click to edit · drag to reorder"]];
    }
  });

  const ArticleImage = Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        width: { default: "100", parseHTML: (element) => element.dataset.imageWidth || "100", renderHTML: ({ width }) => ({ "data-image-width": width }) },
        alignment: { default: "center", parseHTML: (element) => element.dataset.imageAlignment || "center", renderHTML: ({ alignment }) => ({ "data-image-alignment": alignment }) },
        aspectRatio: { default: "auto", parseHTML: (element) => element.dataset.imageRatio || "auto", renderHTML: ({ aspectRatio }) => ({ "data-image-ratio": aspectRatio }) },
        objectFit: { default: "cover", parseHTML: (element) => element.dataset.imageFit || "cover", renderHTML: ({ objectFit }) => ({ "data-image-fit": objectFit }) },
        caption: { default: "", parseHTML: (element) => element.dataset.imageCaption || "", renderHTML: ({ caption }) => caption ? { "data-image-caption": caption } : {} }
      };
    }
  });

  const BracketMathShortcut = Extension.create({
    name: "bracketMathShortcut",
    addInputRules() {
      return [new InputRule({ find: /^\\\[([^\n]+)\\\]$/, handler: ({ state, range, match }) => {
        const latex = match[1].trim();
        if (!latex) return;
        const type = this.editor.schema.nodes.blockMath;
        const resolvedFrom = state.doc.resolve(range.from);
        const node = type.create({ latex });
        const consumesParagraph = resolvedFrom.depth > 0 && resolvedFrom.parent.isTextblock && range.from === resolvedFrom.start() && range.to === resolvedFrom.end();
        const replacement = consumesParagraph && resolvedFrom.node(-1).canReplaceWith(resolvedFrom.index(-1), resolvedFrom.indexAfter(-1), type) ? { from: resolvedFrom.before(), to: resolvedFrom.after() } : range;
        state.tr.replaceWith(replacement.from, replacement.to, node);
      } })];
    }
  });

  const ParenMathShortcut = Extension.create({
    name: "parenMathShortcut",
    addInputRules() {
      return [new InputRule({ find: /\\\(([^\n]+?)\\\)$/, handler: ({ state, range, match }) => {
        const latex = match[1].trim();
        if (latex) state.tr.replaceWith(range.from, range.to, this.editor.schema.nodes.inlineMath.create({ latex }));
      } })];
    }
  });

  onMount(() => {
    editor = new Editor({
      element: mount,
      extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] } }), ArticleImage.configure({ allowBase64: false, HTMLAttributes: { class: "article-editor-image" } }), Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }), BlockMath.configure({ katexOptions: { throwOnError: false, strict: "ignore", trust: false }, onClick: (node, pos) => editBlockMath(node, pos) }), InlineMath.configure({ katexOptions: { throwOnError: false, strict: "ignore", trust: false }, onClick: (node, pos) => editInlineMath(node, pos) }), InteractiveFigure, BracketMathShortcut, ParenMathShortcut, Placeholder.configure({ placeholder: "Tell the story. Type / for structure, or insert an interactive figure…" }), CharacterCount.configure({ limit: 30_000 })],
      content: normalizeMathDocument(content || { type: "doc", content: [] }),
      editorProps: {
        handleClickOn: (_view, _pos, node, nodePos) => {
          if (node.type.name === "interactiveFigure") { editFigure(node.attrs.id); return true; }
          if (node.type.name === "image") { editImage(node, nodePos); return true; }
          return false;
        },
        handlePaste: () => { setTimeout(migratePastedMath); return false; }
      },
      onUpdate: sync,
      onSelectionUpdate: sync
    });
    sync();
    return () => editor?.destroy();
  });

  function sync() { if (!editor) return; output = JSON.stringify(normalizeMathDocument(editor.getJSON())); count = editor.storage.characterCount.characters(); }
  function migratePastedMath() {
    if (!editor) return;
    const raw = editor.getJSON();
    const normalized = normalizeMathDocument(raw);
    if (JSON.stringify(raw) === JSON.stringify(normalized)) return;
    const position = editor.state.selection.from;
    editor.commands.setContent(normalized, { emitUpdate: false });
    editor.commands.setTextSelection(Math.min(position, editor.state.doc.content.size));
    sync();
  }
  function active(name, attrs) { return editor?.isActive(name, attrs); }
  function command(name) {
    if (!editor) return;
    const chain = editor.chain().focus();
    const actions = { bold: () => chain.toggleBold().run(), italic: () => chain.toggleItalic().run(), strike: () => chain.toggleStrike().run(), code: () => chain.toggleCode().run(), h2: () => chain.toggleHeading({ level: 2 }).run(), h3: () => chain.toggleHeading({ level: 3 }).run(), bulletList: () => chain.toggleBulletList().run(), orderedList: () => chain.toggleOrderedList().run(), blockquote: () => chain.toggleBlockquote().run(), codeBlock: () => chain.toggleCodeBlock().run(), horizontalRule: () => chain.setHorizontalRule().run(), undo: () => chain.undo().run(), redo: () => chain.redo().run() };
    actions[name]?.(); sync();
  }
  function addLink() { const previous = editor.getAttributes("link").href || ""; const href = window.prompt("Paste an https:// link", previous); if (href === null) return; href.trim() ? editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run() : editor.chain().focus().extendMarkRange("link").unsetLink().run(); sync(); }
  function imageDefaults(item = {}) { return { src: item.id ? `/media/${item.id}` : "", alt: item.alt || "", title: "", caption: "", width: "100", alignment: "center", aspectRatio: "auto", objectFit: "cover" }; }
  function insertImage() {
    const item = media.find((entry) => entry.id === selectedImage);
    if (!item) return;
    imageDraft = imageDefaults(item);
    imagePosition = null;
    imageModalOpen = true;
  }
  function editImage(node, pos) {
    imageDraft = { ...imageDefaults(), ...node.attrs, title: "" };
    imagePosition = pos;
    imageModalOpen = true;
  }
  function saveImage() {
    if (!imageDraft?.src) return;
    const attrs = { ...imageDraft, alt: String(imageDraft.alt || "").trim(), caption: String(imageDraft.caption || "").trim(), title: "" };
    if (imagePosition === null) editor.chain().focus().setImage(attrs).run();
    else {
      const node = editor.state.doc.nodeAt(imagePosition);
      if (node?.type.name === "image") editor.view.dispatch(editor.state.tr.setNodeMarkup(imagePosition, undefined, attrs));
    }
    imageModalOpen = false;
    sync();
  }
  function removeImage() {
    if (imagePosition === null) { imageModalOpen = false; return; }
    const node = editor.state.doc.nodeAt(imagePosition);
    if (node?.type.name === "image") editor.view.dispatch(editor.state.tr.delete(imagePosition, imagePosition + node.nodeSize));
    imageModalOpen = false;
    sync();
  }
  function imageRatio(value) { return ({ "1-1": "1 / 1", "4-3": "4 / 3", "3-2": "3 / 2", "16-9": "16 / 9", "21-9": "21 / 9", "3-4": "3 / 4" })[value] || "auto"; }
  function imagePreviewWidth(value) { return value === "wide" ? "100%" : `${value || "100"}%`; }
  function normalizeLatex(value) { return String(value).trim().replace(/^\\[[(]\s*/, "").replace(/\s*\\[\])]$/, "").trim(); }
  function addBlockMath() { const value = window.prompt("Enter a display equation in LaTeX", ""); const latex = normalizeLatex(value ?? ""); if (latex) editor.chain().focus().insertBlockMath({ latex }).run(); sync(); }
  function addInlineMath() { const value = window.prompt("Enter an inline expression in LaTeX", ""); const latex = normalizeLatex(value ?? ""); if (latex) editor.chain().focus().insertInlineMath({ latex }).run(); sync(); }
  function editBlockMath(node, pos) { const value = window.prompt("Edit display equation", `\\[${node.attrs.latex}\\]`); const latex = normalizeLatex(value ?? ""); if (latex) editor.chain().setNodeSelection(pos).updateBlockMath({ latex }).focus().run(); sync(); }
  function editInlineMath(node, pos) { const value = window.prompt("Edit inline expression", `\\(${node.attrs.latex}\\)`); const latex = normalizeLatex(value ?? ""); if (latex) editor.chain().setNodeSelection(pos).updateInlineMath({ latex }).focus().run(); sync(); }
  function newFigure() { draft = blankFigure(); activeTab = "html"; modalError = ""; modalOpen = true; }
  function figureSnapshot(value) { return { id: value.id || "", title: value.title || "Untitled interactive figure", caption: value.caption || "", layout: value.layout || "contained", height: Number(value.height) || 520, html: value.html || "", css: value.css || "", js: value.js || "", data: value.data || "" }; }
  function editFigure(id) { const found = figures.find((figure) => figure.id === id); if (!found) return; draft = figureSnapshot(found); activeTab = "html"; modalError = ""; modalOpen = true; }
  function useTemplate(name) { const template = templates[name]; draft = { ...draft, ...template, caption: draft.caption, layout: draft.layout, height: draft.height }; previewKey += 1; }
  function refreshPreview() { try { if (draft.data) JSON.parse(draft.data); modalError = ""; previewKey += 1; } catch { modalError = "The figure data must be valid JSON before previewing."; } }
  function saveFigure() {
    modalError = "";
    try { if (draft.data) JSON.parse(draft.data); } catch { modalError = "The figure data must be valid JSON."; return; }
    if (!draft.title.trim()) { modalError = "Give the figure a title."; return; }
    if (!draft.id) draft.id = `figure-${crypto.randomUUID().slice(0, 8)}`;
    const index = figures.findIndex((figure) => figure.id === draft.id);
    const saved = figureSnapshot(draft);
    if (index >= 0) figures[index] = saved; else figures.push(saved);
    updateFigureLabels(draft.id, draft.title);
    if (index < 0 && !insertFigure(draft.id)) return;
    modalOpen = false; sync();
  }
  function insertFigure(id) {
    const figure = figures.find((item) => item.id === id);
    if (!figure || !editor) return false;
    const content = { type: "interactiveFigure", attrs: { id, label: figure.title } };
    let inserted = editor.chain().focus().insertContent(content).run();
    if (!inserted) inserted = editor.chain().focus("end").insertContent(content).run();
    if (!inserted) { modalError = "The figure could not be inserted at the current position."; return false; }
    sync();
    return true;
  }
  function updateFigureLabels(id, label) { const tr = editor.state.tr; editor.state.doc.descendants((node, pos) => { if (node.type.name === "interactiveFigure" && node.attrs.id === id) tr.setNodeMarkup(pos, undefined, { id, label }); }); if (tr.docChanged) editor.view.dispatch(tr); }
  function removeFigure(id) { if (documentUsesFigure(id)) { window.alert("Remove this figure block from the article body before deleting it from the library."); return; } if (window.confirm("Delete this interactive figure?")) figures = figures.filter((figure) => figure.id !== id); }
  function documentUsesFigure(id) { let used = false; editor.state.doc.descendants((node) => { if (node.type.name === "interactiveFigure" && node.attrs.id === id) used = true; }); return used; }
  function buildPreview(figure, key) { let data = "null"; try { data = JSON.stringify(JSON.parse(figure.data || "null")).replace(/</g, "\\u003c"); } catch {} return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;min-height:100%;font-family:system-ui,sans-serif}${figure.css}</style></head><body data-preview="${key}">${figure.html}<script>window.__ARTICLE_DATA__=${data};<\/script><script>${figure.js}<\/script></body></html>`; }
</script>

<section class="rich-text-panel field full">
  <div class="editor-section-heading"><div><p class="eyebrow">Article body</p><h2>Compose the story</h2><p class="muted">Rich text, equations, uploaded media, and custom interactive figures all live in one ordered document.</p></div><button class="button figure-button" type="button" onclick={newFigure}>+ New interactive figure</button></div>
  <div class="tiptap-shell">
    <div class="tiptap-toolbar" role="toolbar" aria-label="Article formatting">
      <button type="button" class:is-active={active("bold")} onclick={() => command("bold")}><strong>B</strong></button><button type="button" class:is-active={active("italic")} onclick={() => command("italic")}><em>I</em></button><button type="button" class:is-active={active("strike")} onclick={() => command("strike")}><s>S</s></button><button type="button" class:is-active={active("code")} onclick={() => command("code")}>&lt;/&gt;</button><button type="button" onclick={addLink}>Link</button>
      <span class="toolbar-divider"></span><button type="button" class:is-active={active("heading", { level: 2 })} onclick={() => command("h2")}>H2</button><button type="button" class:is-active={active("heading", { level: 3 })} onclick={() => command("h3")}>H3</button><button type="button" onclick={() => command("bulletList")}>• List</button><button type="button" onclick={() => command("orderedList")}>1. List</button><button type="button" onclick={() => command("blockquote")}>Quote</button><button type="button" onclick={() => command("codeBlock")}>Code</button><button type="button" onclick={() => command("horizontalRule")}>Rule</button><button type="button" onclick={addInlineMath}>Inline math</button><button type="button" onclick={addBlockMath}>Display math</button>
      <span class="toolbar-divider"></span><select bind:value={selectedImage} aria-label="Select uploaded image"><option value="">Uploaded image…</option>{#each media as item}<option value={item.id}>{item.alt || `Image ${item.id.slice(0, 8)}`}</option>{/each}</select><button type="button" onclick={insertImage} disabled={!selectedImage}>Preview &amp; insert</button>
      <span class="toolbar-divider"></span><button type="button" onclick={() => command("undo")} disabled={!editor?.can().undo()}>Undo</button><button type="button" onclick={() => command("redo")} disabled={!editor?.can().redo()}>Redo</button>
    </div>
    <div class="tiptap-content" bind:this={mount}></div>
    <div class="tiptap-status"><span>{count.toLocaleString()} / 30,000 characters</span><span>{figures.length} interactive {figures.length === 1 ? "figure" : "figures"}</span></div>
  </div>
  <input type="hidden" name="content" value={output} />
  <input type="hidden" name="figures" value={figuresJson} />

  {#if figures.length}
    <aside class="figure-library"><div><p class="eyebrow">Figure library</p><p class="muted">Reuse a figure anywhere in the article or edit its code and data once.</p></div><div class="figure-library-list">{#each figures as figure}<article><div><strong>{figure.title}</strong><span>{figure.layout} · {figure.height}px</span></div><div><button type="button" onclick={() => insertFigure(figure.id)}>Insert</button><button type="button" onclick={() => editFigure(figure.id)}>Edit</button><button class="danger" type="button" onclick={() => removeFigure(figure.id)}>Delete</button></div></article>{/each}</div></aside>
  {/if}
</section>

{#if imageModalOpen && imageDraft}
  <div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (imageModalOpen = false)}>
    <div class="image-modal" role="dialog" aria-modal="true" aria-labelledby="image-title">
      <header><div><p class="eyebrow">Article image</p><h2 id="image-title">{imagePosition === null ? "Preview and insert" : "Edit image"}</h2></div><button class="modal-close" type="button" aria-label="Close" onclick={() => (imageModalOpen = false)}>×</button></header>
      <div class="image-workbench">
        <section class="image-controls" aria-label="Image settings">
          <label><span class="label">Accessible description</span><textarea bind:value={imageDraft.alt} rows="3" maxlength="300" placeholder="Describe the image for readers who cannot see it"></textarea></label>
          <label><span class="label">Caption</span><textarea bind:value={imageDraft.caption} rows="3" maxlength="1000" placeholder="Optional context displayed below the image"></textarea></label>
          <div class="image-control-grid">
            <label><span class="label">Size</span><select bind:value={imageDraft.width}><option value="40">Small · 40%</option><option value="60">Medium · 60%</option><option value="80">Large · 80%</option><option value="100">Article width</option><option value="wide">Wide</option></select></label>
            <label><span class="label">Alignment</span><select bind:value={imageDraft.alignment}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
            <label><span class="label">Aspect ratio</span><select bind:value={imageDraft.aspectRatio}><option value="auto">Original</option><option value="1-1">Square · 1:1</option><option value="4-3">Landscape · 4:3</option><option value="3-2">Photo · 3:2</option><option value="16-9">Widescreen · 16:9</option><option value="21-9">Cinematic · 21:9</option><option value="3-4">Portrait · 3:4</option></select></label>
            <label><span class="label">Image fit</span><select bind:value={imageDraft.objectFit} disabled={imageDraft.aspectRatio === "auto"}><option value="cover">Crop to fill</option><option value="contain">Fit whole image</option></select></label>
          </div>
          <p class="field-help">Click any image in the article later to reopen these settings.</p>
        </section>
        <section class="image-preview"><div><strong>Article preview</strong><span>{imageDraft.aspectRatio === "auto" ? "Original ratio" : imageDraft.aspectRatio.replace("-", ":")}</span></div><div class="image-preview-canvas"><figure style:width={imagePreviewWidth(imageDraft.width)} class:align-left={imageDraft.alignment === "left"} class:align-center={imageDraft.alignment === "center"} class:align-right={imageDraft.alignment === "right"}><img src={imageDraft.src} alt={imageDraft.alt} style:aspect-ratio={imageRatio(imageDraft.aspectRatio)} style:object-fit={imageDraft.aspectRatio === "auto" ? "contain" : imageDraft.objectFit} />{#if imageDraft.caption}<figcaption>{imageDraft.caption}</figcaption>{/if}</figure></div></section>
      </div>
      <footer>{#if imagePosition !== null}<button class="button danger-button" type="button" onclick={removeImage}>Remove image</button>{:else}<span></span>{/if}<div><button class="button secondary" type="button" onclick={() => (imageModalOpen = false)}>Cancel</button><button class="button" type="button" onclick={saveImage}>{imagePosition === null ? "Insert image" : "Save changes"}</button></div></footer>
    </div>
  </div>
{/if}

{#if modalOpen && draft}
  <div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (modalOpen = false)}>
    <div class="figure-modal" role="dialog" aria-modal="true" aria-labelledby="figure-title">
      <header><div><p class="eyebrow">Interactive visualization</p><h2 id="figure-title">{draft.id ? "Edit figure" : "Create a figure"}</h2></div><button class="modal-close" type="button" aria-label="Close" onclick={() => (modalOpen = false)}>×</button></header>
      <div class="figure-template-row"><span>Start from</span><button type="button" onclick={() => useTemplate("bars")}>Bar comparison</button><button type="button" onclick={() => useTemplate("scatter")}>Scatter plot</button><button type="button" onclick={() => useTemplate("simulation")}>Simulation</button></div>
      <div class="figure-meta-grid"><label><span class="label">Title</span><input bind:value={draft.title} maxlength="160" /></label><label><span class="label">Layout</span><select bind:value={draft.layout}><option value="contained">Contained</option><option value="wide">Wide</option><option value="full">Full bleed</option></select></label><label><span class="label">Height</span><input type="number" bind:value={draft.height} min="200" max="2000" /></label><label class="caption-field"><span class="label">Caption</span><input bind:value={draft.caption} maxlength="1000" placeholder="What should the reader notice?" /></label></div>
      <div class="figure-workbench"><section class="code-workspace"><nav aria-label="Figure code sections">{#each ["html", "css", "js", "data"] as tab}<button type="button" class:active={activeTab === tab} onclick={() => (activeTab = tab)}>{tab === "js" ? "JavaScript" : tab === "data" ? "JSON data" : tab.toUpperCase()}</button>{/each}</nav>{#if activeTab === "html"}<textarea bind:value={draft.html} spellcheck="false" aria-label="Figure HTML"></textarea>{:else if activeTab === "css"}<textarea bind:value={draft.css} spellcheck="false" aria-label="Figure CSS"></textarea>{:else if activeTab === "js"}<textarea bind:value={draft.js} spellcheck="false" aria-label="Figure JavaScript"></textarea>{:else}<textarea bind:value={draft.data} spellcheck="false" aria-label="Figure JSON data"></textarea>{/if}</section><section class="figure-preview"><div><strong>Live preview</strong><button type="button" onclick={refreshPreview}>Refresh</button></div><iframe title="Figure preview" srcdoc={previewDocument} sandbox="allow-scripts"></iframe></section></div>
      {#if modalError}<p class="figure-error" role="alert">{modalError}</p>{/if}
      <footer><p>Custom code runs without network access in a sandboxed frame. Data is available as <code>window.__ARTICLE_DATA__</code>.</p><div><button class="button secondary" type="button" onclick={() => (modalOpen = false)}>Cancel</button><button class="button" type="button" onclick={saveFigure}>{draft.id ? "Save figure" : "Create and insert"}</button></div></footer>
    </div>
  </div>
{/if}
