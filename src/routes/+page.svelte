<script>
  import Tags from "$lib/components/Tags.svelte";
  import { articleSlug } from "$lib/article-slug.js";
  import { cardImageOrDefault, cardImageStyle } from "$lib/card-image.js";
  let { data } = $props();
  const mediaFor = (article) => (data.media || []).find((item) => item.id === article.cardMediaId);
</script>

<svelte:head>
  <title>{data.profile.name} — Quantitative Finance & Engineering</title>
  <meta name="description" content={data.profile.intro} />
  <meta property="og:title" content={`${data.profile.name} — Quantitative Finance & Engineering`} />
  <meta property="og:description" content={data.profile.intro} />
  <meta property="og:image" content="/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<main id="main">
  <section class="hero shell">
    <p class="eyebrow">{data.profile.eyebrow}</p>
    <h1>{data.profile.headline}</h1>
    <p class="lede">{data.profile.intro}</p>
    {#if data.profile.availability}<p class="availability">{data.profile.availability}</p>{/if}
  </section>
  <hr class="rule" />
  <section class="section shell">
    <div class="section-title"><div><p class="section-index">Section 01</p><h2>Publications & articles</h2></div><span class="section-index">{data.articles.length} entries</span></div>
    <div class="card-grid">
      {#each data.articles as article}
        {@const media = mediaFor(article)}
        {@const cardImage = cardImageOrDefault(article.cardImage)}
        <a class:card--media={media} class="card" href={`/articles/${articleSlug(article.title)}`}>
          {#if media}<div class={`card-media card-media--configured card-media--ratio-${cardImage.aspectRatio}`} style={cardImageStyle(cardImage)}><img src={`/media/${media.id}`} alt={media.alt || ""} loading="lazy" /></div>{/if}
          <div class="meta"><span>{article.category}</span><span>{article.status}</span></div>
          <h3>{article.title}</h3><p>{article.abstract}</p><Tags items={article.tags} />
        </a>
      {/each}
    </div>
  </section>
  <hr class="rule" />
  <section class="section shell">
    <div class="section-title"><div><p class="section-index">Section 02</p><h2>Research projects</h2></div></div>
    <div class="project-grid">
      {#each data.projects as project}
        {#if project.url}
          <a class="project" href={project.url} target="_blank" rel="noopener noreferrer"><div class="meta">{project.meta}</div><h3>{project.title}</h3><p>{project.description}</p><Tags items={project.tags} /></a>
        {:else}
          <article class="project"><div class="meta">{project.meta}</div><h3>{project.title}</h3><p>{project.description}</p><Tags items={project.tags} /></article>
        {/if}
      {/each}
    </div>
  </section>
</main>
