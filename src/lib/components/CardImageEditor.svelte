<script>
  import { cardImageOrDefault, cardImageStyle, DEFAULT_CARD_IMAGE } from "$lib/card-image.js";

  let { media = [], initialMediaId = "", initialSettings = null } = $props();
  // svelte-ignore state_referenced_locally
  let selectedId = $state(initialMediaId || "");
  // svelte-ignore state_referenced_locally
  let settings = $state(cardImageOrDefault(initialSettings));
  let modalOpen = $state(false);
  let draft = $state(null);
  let selectedMedia = $derived(media.find((item) => item.id === selectedId));
  let settingsJson = $derived(JSON.stringify(settings));

  function openEditor() {
    if (!selectedMedia) return;
    draft = { ...settings };
    modalOpen = true;
  }

  function saveEditor() {
    settings = cardImageOrDefault(draft);
    modalOpen = false;
  }

  function resetEditor() { draft = { ...DEFAULT_CARD_IMAGE }; }
  const ratioLabel = (ratio) => ratio.replace("-", ":");
</script>

<div class="card-image-field field full">
  <label class="field"><span class="label">Card image or GIF</span><select name="cardMediaId" bind:value={selectedId}><option value="">No card media</option>{#each media as item}<option value={item.id}>{item.alt || `Image ${item.id.slice(0, 8)}`}</option>{/each}</select></label>
  <input type="hidden" name="cardImage" value={settingsJson} />
  {#if selectedMedia}
    <div class="card-editor-summary">
      <div class={`card-media card-media--configured card-media--ratio-${settings.aspectRatio}`} style={cardImageStyle(settings)}><img src={`/media/${selectedMedia.id}`} alt={selectedMedia.alt || "Selected article card image"} /></div>
      <div><p><strong>Card preview</strong><span>{ratioLabel(settings.aspectRatio)} · {settings.objectFit === "cover" ? "cropped" : "contained"} · {settings.zoom}% zoom</span></p><button class="button secondary" type="button" onclick={openEditor}>Edit card image</button></div>
    </div>
  {/if}
</div>

{#if modalOpen && draft && selectedMedia}
  <div class="modal-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (modalOpen = false)}>
    <div class="image-modal card-image-modal" role="dialog" aria-modal="true" aria-labelledby="card-image-title">
      <header><div><p class="eyebrow">Homepage card image</p><h2 id="card-image-title">Frame and crop</h2></div><button class="modal-close" type="button" aria-label="Close" onclick={() => (modalOpen = false)}>×</button></header>
      <div class="image-workbench">
        <section class="image-controls" aria-label="Card image settings">
          <div class="image-control-grid">
            <label><span class="label">Aspect ratio</span><select bind:value={draft.aspectRatio}><option value="16-9">Widescreen · 16:9</option><option value="3-2">Photo · 3:2</option><option value="4-3">Landscape · 4:3</option><option value="1-1">Square · 1:1</option><option value="3-4">Portrait · 3:4</option></select></label>
            <label><span class="label">Image fit</span><select bind:value={draft.objectFit}><option value="cover">Crop to fill</option><option value="contain">Fit whole image</option></select></label>
          </div>
          <label><span class="label">Zoom · {draft.zoom}%</span><input type="range" bind:value={draft.zoom} min="100" max="220" step="1" /></label>
          <label><span class="label">Horizontal focal point · {draft.positionX}%</span><input type="range" bind:value={draft.positionX} min="0" max="100" step="1" /></label>
          <label><span class="label">Vertical focal point · {draft.positionY}%</span><input type="range" bind:value={draft.positionY} min="0" max="100" step="1" /></label>
          <p class="field-help">Move the focal point toward the part of the image that should remain visible when the card is cropped.</p>
          <button class="button secondary" type="button" onclick={resetEditor}>Reset framing</button>
        </section>
        <section class="image-preview card-editor-live-preview"><div><strong>Homepage preview</strong><span>{ratioLabel(draft.aspectRatio)}</span></div><div class="image-preview-canvas"><div class="card-preview-shell"><div class={`card-media card-media--configured card-media--ratio-${draft.aspectRatio}`} style={cardImageStyle(draft)}><img src={`/media/${selectedMedia.id}`} alt={selectedMedia.alt || "Card image preview"} /></div><div class="card-preview-copy"><span>Article · Preview</span><strong>How the image will frame on an article card</strong><p>The final title and abstract appear here on the homepage.</p></div></div></div></section>
      </div>
      <footer><span></span><div><button class="button secondary" type="button" onclick={() => (modalOpen = false)}>Cancel</button><button class="button" type="button" onclick={saveEditor}>Save card image</button></div></footer>
    </div>
  </div>
{/if}
