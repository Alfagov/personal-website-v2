<script>
  import { page } from "$app/state";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import "katex/dist/katex.min.css";
  let { data, children } = $props();
  let isAdmin = $derived(page.url.pathname.startsWith("/admin"));
</script>

<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="shell header-inner">
    <a class="brand" href="/">{data.profile.name}{isAdmin ? " · Studio" : ""}</a>
    <div class="header-tools">{#if !isAdmin}<nav class="nav" aria-label="Main navigation"><a href="/about" aria-current={page.url.pathname === "/about" ? "page" : undefined}>About</a><a href="/" aria-current={page.url.pathname === "/" || page.url.pathname.startsWith("/articles/") ? "page" : undefined}>Research</a><a href="/contact" aria-current={page.url.pathname === "/contact" ? "page" : undefined}>Contact</a></nav>{/if}<ThemeToggle /></div>
  </div>
</header>

{@render children()}

{#if !isAdmin}
  <footer class="site-footer">
    <div class="shell footer"><span>{data.profile.name} — Financial theory × software</span><span>St Louis, MO · 2026 · <a href="/admin">Studio</a></span></div>
  </footer>
{/if}
