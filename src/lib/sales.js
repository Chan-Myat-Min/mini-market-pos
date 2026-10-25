import * as storage from "./storage.js";
import * as products from "./products.js";
import * as settings from "./settings.js";
import * as cart from "./cart.js";
import * as inventory from "./inventory.js";
import * as customers from "./customers.js";

function localDay(iso) {
  const x = new Date(iso);
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const d = String(x.getDate()).padStart(2, "0");
  return x.getFullYear() + "-" + m + "-" + d;
}

export function nextReceiptNo() {
  const n = storage.getSales().length + 1;
  return "RCP-" + String(n).padStart(6, "0");
}

export function completeSale() {
  const openCart = storage.getCart();
  const t = cart.totals();
  if (t.empty) return { ok: false, errors: ["Cart is empty."] };

  for (const item of t.items) {
    const live = products.getById(item.productId);
    if (!live) return { ok: false, errors: ["A cart product is no longer available."] };
    if (item.qty > live.stock) {
      return { ok: false, errors: ["Not enough stock for " + live.name + "."] };
    }
  }

  if (t.paymentMethod === "cash" && t.amountReceivedCents < t.grandTotalCents) {
    return { ok: false, errors: ["Cash received is less than the total due."] };
  }

  const store = storage.getSettings();
  const customer = customers.getById(openCart.customerId) || customers.walkIn();

  const sale = {
    id: storage.uid("sale"),
    receiptNo: nextReceiptNo(),
    createdAt: storage.nowIso(),
    cashier: store.cashierName || "Cashier",
    customerId: customer.id,
    customerName: customer.name,
    items: t.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      sku: i.sku,
      qty: i.qty,
      unitPriceCents: i.unitPriceCents,
      costPriceCents: i.costPriceCents,
      lineTotalCents: i.lineTotalCents,
    })),
    subtotalCents: t.subtotalCents,
    discountCents: t.discountCents,
    taxRate: settings.taxRate(),
    taxCents: t.taxCents,
    grandTotalCents: t.grandTotalCents,
    paymentMethod: t.paymentMethod,
    amountReceivedCents: t.amountReceivedCents,
    changeCents: Math.max(0, t.changeCents),
    status: "completed",
    refundedAt: "",
  };

  t.items.forEach((item) => {
    inventory.move(item.productId, "sale", item.qty, "Sale " + sale.receiptNo, { saleId: sale.id });
  });

  customers.recordPurchase(customer.id, sale.grandTotalCents, sale.createdAt);
  storage.saveSale(sale);
  cart.clear();
  return { ok: true, sale };
}

export function refund(saleId) {
  const sale = storage.getSales().find((s) => s.id === saleId);
  if (!sale) return { ok: false, errors: ["Sale not found."] };
  if (sale.status === "refunded") return { ok: false, errors: ["This sale is already refunded."] };

  sale.items.forEach((item) => {
    if (products.getById(item.productId)) {
      inventory.move(item.productId, "refund", item.qty, "Refund " + sale.receiptNo, { saleId: sale.id });
    }
  });

  customers.reversePurchase(sale.customerId, sale.grandTotalCents);
  sale.status = "refunded";
  sale.refundedAt = storage.nowIso();
  storage.saveSale(sale);
  return { ok: true, sale };
}

export function getById(id) {
  return storage.getSales().find((s) => s.id === id) || null;
}

export function getSales() {
  return storage.getSales();
}

export function filterSales({ query, payment, from, to, status } = {}) {
  const q = String(query || "").trim().toLowerCase();
  return getSales().filter((s) => {
    if (payment && s.paymentMethod !== payment) return false;
    if (status && s.status !== status) return false;
    const day = localDay(s.createdAt);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (!q) return true;
    const blob = [s.receiptNo, s.cashier, s.customerName, s.paymentMethod]
      .concat(s.items.map((i) => i.name))
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });
}
