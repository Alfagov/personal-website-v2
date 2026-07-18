<script>let { data } = $props();</script>
<svelte:head><title>Contact — {data.profile.name}</title><meta name="description" content={`Contact ${data.profile.name}`} /></svelte:head>
<main id="main">
  <section class="hero shell"><p class="eyebrow">Contact · Fig. 03</p><h1>Let’s work on something rigorous.</h1><p class="lede">Email is the fastest way to reach me. I usually answer within one business day.</p>{#if data.profile.availability}<p class="availability">{data.profile.availability}</p>{/if}</section>
  <hr class="rule" />
  <section class="section shell"><dl class="contact-list">
    <div class="contact-row"><dt>Email</dt><dd><a href={`mailto:${data.profile.email}`}>{data.profile.email}</a></dd></div>
    <div class="contact-row"><dt>Phone</dt><dd>{data.profile.phone}</dd></div>
    <div class="contact-row"><dt>LinkedIn</dt><dd><a href={data.profile.linkedin} target="_blank" rel="noopener noreferrer">{data.profile.linkedin.replace(/^https?:\/\//, "")}</a></dd></div>
    <div class="contact-row"><dt>GitHub</dt><dd><a href={data.profile.github} target="_blank" rel="noopener noreferrer">{data.profile.github.replace(/^https?:\/\//, "")}</a></dd></div>
    <div class="contact-row"><dt>Location</dt><dd>{data.profile.location}</dd></div>
  </dl></section>
</main>
