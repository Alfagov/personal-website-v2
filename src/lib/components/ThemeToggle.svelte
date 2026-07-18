<script>
  import { onMount } from "svelte";

  let theme = $state("light");

  function applyTheme(next, persist = true) {
    theme = next;
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", next === "dark" ? "#111316" : "#f7f7f4");
    if (persist) localStorage.setItem("site-theme", next);
  }

  function toggle() { applyTheme(theme === "dark" ? "light" : "dark"); }

  onMount(() => {
    theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const onStorage = (event) => {
      if (event.key === "site-theme" && (event.newValue === "light" || event.newValue === "dark")) applyTheme(event.newValue, false);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  });
</script>

<button class="theme-toggle" type="button" role="switch" aria-checked={theme === "dark"} aria-label={`Use ${theme === "dark" ? "light" : "dark"} mode`} title={`Use ${theme === "dark" ? "light" : "dark"} mode`} onclick={toggle}>
  <span class="theme-icon" aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span><span class="theme-label">{theme === "dark" ? "Light" : "Dark"}</span>
</button>
