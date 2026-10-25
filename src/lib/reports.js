import * as products from "./products.js";
import * as inventory from "./inventory.js";
import * as sales from "./sales.js";

function ymd(d) {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return x.getFullYear() + "-" + m + "-" + day;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(iso, date) {
  return ymd(iso) === ymd(date);
}

function completedSales() {
  return sales.getSales().filter((s) => s.status === "completed");
}

function inRange(list, from, to) {
  return list.filter((s) => {
    const t = new Date(s.createdAt);
    return t >= from && t <= to;
  });
}

export function profitOf(sale) {
  return (
    sale.items.reduce((sum, i) => sum + (i.unitPriceCents - i.costPriceCents) * i.qty, 0) -
    (sale.discountCents || 0)
  );
}

export function dashboard() {
  const today = new Date();
  const todaySales = completedSales().filter((s) => isSameDay(s.createdAt, today));
  const catalog = products.getProducts();
  return {
    todaySalesCents: todaySales.reduce((s, x) => s + x.grandTotalCents, 0),
    todayTransactions: todaySales.length,
    todayProfitCents: todaySales.reduce((s, x) => s + profitOf(x), 0),
    productCount: catalog.length,
    lowStock: inventory.lowStock(),
    outOfStock: inventory.outOfStock(),
    recent: sales.getSales().slice(0, 8),
  };
}

export function periodStats() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfDay(now);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const all = completedSales();
  const today = inRange(all, todayStart, now);
  const week = inRange(all, weekStart, now);
  const month = inRange(all, monthStart, now);
  const sum = (list) => list.reduce((s, x) => s + x.grandTotalCents, 0);
  const profit = (list) => list.reduce((s, x) => s + profitOf(x), 0);
  return {
    todayCents: sum(today),
    weekCents: sum(week),
    monthCents: sum(month),
    transactions: all.length,
    todayProfitCents: profit(today),
    weekProfitCents: profit(week),
    monthProfitCents: profit(month),
    todayCount: today.length,
    weekCount: week.length,
    monthCount: month.length,
  };
}

export function bestSellers(limit) {
  const map = {};
  completedSales().forEach((s) => {
    s.items.forEach((i) => {
      if (!map[i.productId]) {
        map[i.productId] = { productId: i.productId, name: i.name, qty: 0, revenueCents: 0 };
      }
      map[i.productId].qty += i.qty;
      map[i.productId].revenueCents += i.lineTotalCents;
    });
  });
  return Object.values(map)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit || 8);
}

export function salesByCategory() {
  const map = {};
  completedSales().forEach((s) => {
    s.items.forEach((i) => {
      const p = products.getById(i.productId);
      const name = p ? products.categoryName(p.categoryId) : "Other";
      map[name] = (map[name] || 0) + i.lineTotalCents;
    });
  });
  return Object.entries(map)
    .map(([name, cents]) => ({ name, cents }))
    .sort((a, b) => b.cents - a.cents);
}

export function salesByPayment() {
  const map = { cash: 0, card: 0, mobile: 0 };
  completedSales().forEach((s) => {
    const k = s.paymentMethod || "cash";
    map[k] = (map[k] || 0) + s.grandTotalCents;
  });
  return Object.entries(map).map(([name, cents]) => ({ name, cents }));
}

export function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = ymd(d);
    const cents = completedSales()
      .filter((s) => ymd(s.createdAt) === key)
      .reduce((sum, s) => sum + s.grandTotalCents, 0);
    days.push({
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      cents,
    });
  }
  return days;
}
