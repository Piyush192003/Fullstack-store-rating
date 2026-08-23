// Apply the chosen theme ('light' | 'dark' | 'system') to <html>
// Default preference: LIGHT
export function resolveTheme(pref) {
  if (pref === "dark") return "dark";
  if (pref === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function applyTheme(pref) {
  const theme = pref === "dark" || pref === "light" || pref === "system" ? pref : localStorage.getItem("theme") || "light";
  localStorage.setItem("theme", theme);
  document.documentElement.dataset.theme = resolveTheme(theme);
}

export function currentThemePref() {
  return localStorage.getItem("theme") || "light";
}

