import * as storage from "./storage.js";

export function getSettings() {
  return storage.getSettings();
}

export function saveSettings(partial) {
  const next = Object.assign(storage.getSettings(), partial);
  next.taxPercent = Math.max(0, Number(next.taxPercent) || 0);
  next.lowStockThreshold = Math.max(0, parseInt(next.lowStockThreshold, 10) || 0);
  if (!next.currencySymbol) next.currencySymbol = next.currency === "MMK" ? "Ks " : "$";
  storage.saveSettings(next);
  applyTheme(next.theme);
  return next;
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
}

export function formatMoney(cents) {
  const s = getSettings();
  const sign = cents < 0 ? "-" : "";
  return sign + s.currencySymbol + storage.fromCents(Math.abs(cents));
}

export function taxRate() {
  return (Number(getSettings().taxPercent) || 0) / 100;
}
