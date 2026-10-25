import * as settings from "./lib/settings.js";

export function money(cents) {
  return settings.formatMoney(cents);
}

export function when(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function payLabel(method) {
  return method === "card" ? "Card" : method === "mobile" ? "Mobile Payment" : "Cash";
}

export const LABELS = {
  dashboard: "Daaaashboard",
  pos: "POS / Checkout",
  products: "Products",
  inventory: "Inventory",
  categories: "Categories",
  sales: "Sales",
  customers: "Customers",
  suppliers: "Suppliers",
  reports: "Reports",
  settings: "Settings",
};

export const NAV = Object.keys(LABELS);
