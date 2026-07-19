<script>
  import { onMount } from "svelte";
  let { data } = $props();
  const formatBytes = (size) => size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;

  onMount(() => {
    const frames = () => [...document.querySelectorAll("iframe[data-figure-frame]")];
    const theme = () => document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const sendTheme = (frame) => frame.contentWindow?.postMessage({ type: "article-figure-theme", theme: theme() }, "*");
    const sendThemeToAll = () => frames().forEach(sendTheme);
    const onMessage = (event) => {
      if (event.data?.type !== "article-figure-resize") return;
      const frame = frames().find((item) => item.contentWindow === event.source && item.dataset.figureId === String(event.data.id || ""));
      if (!frame) return;
      const minimum = Math.max(120, Math.min(2000, Number(frame.dataset.minHeight) || 200));
      const height = Math.max(minimum, Math.min(10_000, Math.ceil(Number(event.data.height) || minimum)));
      frame.style.height = `${height}px`;
      frame.classList.add("is-ready");
    };
    const onLoad = (event) => { if (event.target instanceof HTMLIFrameElement && event.target.matches("[data-figure-frame]")) sendTheme(event.target); };
    const observer = new MutationObserver(sendThemeToAll);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("message", onMessage);
    document.addEventListener("load", onLoad, true);
    sendThemeToAll();
    return () => { observer.disconnect(); window.removeEventListener("message", onMessage); document.removeEventListener("load", onLoad, true); };
  });
</script>

<svelte:head>
  <title>{data.article.title} — {data.profile.name}</title>
  <meta name="description" content={data.share.description} />
  <link rel="canonical" href={data.share.url} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={data.share.title} />
  <meta property="og:image" content={data.share.image} />
  <meta property="og:image:alt" content={data.share.imageAlt} />
  <meta property="og:description" content={data.share.description} />
  <meta property="og:url" content={data.share.url} />
  <meta property="og:site_name" content={data.profile.name} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.share.title} />
  <meta name="twitter:description" content={data.share.description} />
  <meta name="twitter:image" content={data.share.image} />
  <meta name="twitter:image:alt" content={data.share.imageAlt} />
</svelte:head>
<main id="main">
  <section class="article-hero shell">
    <a class="back" href="/">← Back to index</a>
    <div class="article-info"><span class="status">{data.article.status}</span><span class="meta">{data.article.date}</span></div>
    <h1>{data.article.title}</h1>
    {#if data.article.abstract}<p class="lede">{data.article.abstract}</p>{/if}
  </section>
  <hr class="rule" />
  <article class="article-body shell">
    {#if data.article.metrics?.length}<div class="metrics">{#each data.article.metrics as metric}<div class="metric"><span>{metric.label}</span><b>{metric.value}</b></div>{/each}</div>{/if}
    <div class="prose">{@html data.articleHtml}</div>
    {#if data.article.embed}<iframe class="article-embed" title={`Custom content: ${data.article.title}`} src={`/article-content/${data.article.id}`} height={data.article.embed.height || 720} sandbox="allow-scripts" referrerpolicy="no-referrer" loading="lazy"></iframe>{/if}
    {#if data.attachments.length}<section class="article-downloads"><p class="eyebrow">Attachments</p><h2>Downloads</h2><ul>{#each data.attachments as item}<li><a href={`/attachments/${item.id}`}>{item.title} <span>PDF · {formatBytes(item.size)}</span></a></li>{/each}</ul></section>{/if}
    {#if data.article.method}<aside class="method"><strong>Method</strong>{data.article.method}</aside>{/if}
  </article>
</main>
