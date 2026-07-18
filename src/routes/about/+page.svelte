<script>
  import Tags from "$lib/components/Tags.svelte";
  let { data } = $props();
</script>

<svelte:head><title>About — {data.profile.name}</title><meta name="description" content={data.profile.about} /></svelte:head>
<main id="main">
  <section class="hero shell"><p class="eyebrow">About · Fig. 02</p><h1>{data.profile.name}</h1><p class="lede">{data.profile.about}</p>{#if data.profile.availability}<p class="availability">{data.profile.availability}</p>{/if}</section>
  <hr class="rule" />
  <section class="section shell"><div class="section-title"><div><p class="section-index">Section 01</p><h2>Education</h2></div></div><div class="timeline">{#each data.education as item}<article class="timeline-row"><div class="timeline-meta"><span class="meta">{item.period}</span>{#if item.location}<span class="meta">{item.location}</span>{/if}</div><div><h3>{item.degree}</h3><h4>{item.school}</h4><p>{item.note}</p></div>{#if item.isCurrent}<span class="current">Current</span>{/if}</article>{/each}</div></section>
  <hr class="rule" />
  <section class="section shell"><div class="section-title"><div><p class="section-index">Section 02</p><h2>Experience</h2></div></div><div class="timeline">{#each data.experiences as item}<article class="timeline-row"><div class="timeline-meta"><span class="meta">{item.period}</span>{#if item.location}<span class="meta">{item.location}</span>{/if}</div><div><h3>{item.role}</h3><h4>{item.company}</h4><ul>{#each item.highlights as highlight}<li>{highlight}</li>{/each}</ul></div>{#if item.isCurrent}<span class="current">Current</span>{/if}</article>{/each}</div></section>
  <hr class="rule" />
  <section class="section shell"><div class="section-title"><div><p class="section-index">Section 03</p><h2>Ventures & applied work</h2></div></div><div class="timeline">{#each data.ventures as item}<article class="timeline-row"><div><span class="meta">{item.period}</span></div><div><h3>{item.name}</h3><h4>{item.role}</h4><p>{item.description}</p><Tags items={item.tags} /></div></article>{/each}</div></section>
  <hr class="rule" />
  <section class="section shell"><div class="section-title"><div><p class="section-index">Section 04</p><h2>Skills & credentials</h2></div></div><div class="skills">{#each data.skills as group}<section class="skill"><h3>{group.label}</h3><Tags items={group.items} /></section>{/each}</div></section>
</main>
