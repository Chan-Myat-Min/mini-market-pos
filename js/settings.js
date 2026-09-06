(function (global) {
  const MMP = (global.MMP = global.MMP || {});
  const S = () => MMP.storage;

  function getSettings() {
    return S().getSettings();
  }

  function saveSettings(partial) {
    const next = Object.assign(S().getSettings(), partial);
    next.taxPercent = Math.max(0, Number(next.taxPercent) || 0);
    next.lowStockThreshold = Math.max(0, parseInt(next.lowStockThreshold, 10) || 0);
    if (!next.currencySymbol) next.currencySymbol = "$";
    S().saveSettings(next);
    applyTheme(next.theme);
    return next;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  }

  function formatMoney(cents) {
    const s = getSettings();
    const sign = cents < 0 ? "-" : "";
    return sign + s.currencySymbol + S().fromCents(Math.abs(cents));
  }

  function taxRate() {
    return (Number(getSettings().taxPercent) || 0) / 100;
  }

  MMP.settings = {
    getSettings,
    saveSettings,
    applyTheme,
    formatMoney,
    taxRate,
  };
})(window);
