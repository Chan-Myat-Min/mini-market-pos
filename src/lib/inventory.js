import * as storage from "./storage.js";
import * as products from "./products.js";

export function history() {
  return storage.getInventoryHistory();
}

export function record(entry) {
  const list = history();
  list.unshift(
    Object.assign(
      {
        id: storage.uid("inv"),
        createdAt: storage.nowIso(),
      },
      entry
    )
  );
  storage.saveInventoryHistory(list);
}

export function move(productId, type, qty, note, extra) {
  const product = products.getById(productId);
  if (!product) return { ok: false, errors: ["Product not found."] };
  const amount = Number(qty);
  if (!Number.isFinite(amount)) return { ok: false, errors: ["Invalid quantity."] };

  const before = Number(product.stock) || 0;
  let after = before;

  if (type === "in") {
    if (amount <= 0) return { ok: false, errors: ["Stock-in quantity must be greater than 0."] };
    after = before + amount;
  } else if (type === "out" || type === "sale") {
    if (amount <= 0) return { ok: false, errors: ["Quantity must be greater than 0."] };
    if (amount > before) return { ok: false, errors: ["Not enough stock for " + product.name + "."] };
    after = before - amount;
  } else if (type === "refund") {
    if (amount <= 0) return { ok: false, errors: ["Refund quantity must be greater than 0."] };
    after = before + amount;
  } else if (type === "adjust") {
    if (amount < 0) return { ok: false, errors: ["Stock cannot be negative."] };
    after = amount;
  } else {
    return { ok: false, errors: ["Unknown inventory movement."] };
  }

  products.setStock(productId, after);
  record({
    productId,
    productName: product.name,
    type,
    qty: type === "adjust" ? after - before : type === "out" || type === "sale" ? -amount : amount,
    before,
    after,
    note: note || "",
    saleId: extra && extra.saleId,
  });
  return { ok: true, before, after };
}

export function lowStock() {
  return products.getProducts().filter((p) => products.stockStatus(p) === "low");
}

export function outOfStock() {
  return products.getProducts().filter((p) => products.stockStatus(p) === "out");
}
