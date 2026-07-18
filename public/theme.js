(() => {
  try {
    const saved = localStorage.getItem("site-theme");
    const theme = saved === "light" || saved === "dark" ? saved : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#111316" : "#f7f7f4");
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
