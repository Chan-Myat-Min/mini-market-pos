import * as storage from "./storage.js";

export function getProducts() {
  return storage.getProducts();
}

export function saveProducts(list) {
  storage.saveProducts(list);
}

export function getById(id) {
  return getProducts().find((p) => p.id === id) || null;
}

export function findByCode(code) {
  const q = String(code || "").trim().toLowerCase();
  if (!q) return null;
  return (
    getProducts().find(
      (p) => String(p.barcode).toLowerCase() === q || String(p.sku).toLowerCase() === q
    ) || null
  );
}

export function stockStatus(product) {
  const settings = storage.getSettings();
  const stock = Number(product.stock) || 0;
  const min = Number(product.minStock != null ? product.minStock : settings.lowStockThreshold);
  if (stock <= 0) return "out";
  if (stock <= min) return "low";
  return "in";
}

export function statusLabel(status) {
  return status === "out" ? "Out of Stock" : status === "low" ? "Low Stock" : "In Stock";
}

export function categoryName(categoryId) {
  const c = storage.getCategories().find((x) => x.id === categoryId);
  return c ? c.name : "Uncategorized";
}

export function supplierName(supplierId) {
  const s = storage.getSuppliers().find((x) => x.id === supplierId);
  return s ? s.name : "—";
}

export function search(query, categoryId) {
  const q = String(query || "").trim().toLowerCase();
  return getProducts().filter((p) => {
    if (categoryId && p.categoryId !== categoryId) return false;
    if (!q) return true;
    return [p.name, p.sku, p.barcode, categoryName(p.categoryId)].join(" ").toLowerCase().includes(q);
  });
}

export function sortProducts(list, sortKey) {
  const copy = list.slice();
  switch (sortKey) {
    case "price":
      copy.sort((a, b) => a.sellingPriceCents - b.sellingPriceCents);
      break;
    case "stock":
      copy.sort((a, b) => a.stock - b.stock);
      break;
    case "sku":
      copy.sort((a, b) => String(a.sku).localeCompare(String(b.sku)));
      break;
    default:
      copy.sort((a, b) => a.name.localeCompare(b.name));
  }
  return copy;
}

export function validateProduct(data) {
  const errors = [];
  if (!String(data.name || "").trim()) errors.push("Product name is required.");
  if (!String(data.sku || "").trim()) errors.push("SKU is required.");
  if ((Number(data.sellingPriceCents) || 0) < 0) errors.push("Selling price cannot be negative.");
  if ((Number(data.costPriceCents) || 0) < 0) errors.push("Cost price cannot be negative.");
  if ((Number(data.stock) || 0) < 0) errors.push("Stock cannot be negative.");
  if ((Number(data.minStock) || 0) < 0) errors.push("Minimum stock cannot be negative.");
  const sku = String(data.sku || "").trim().toLowerCase();
  const barcode = String(data.barcode || "").trim().toLowerCase();
  const others = getProducts().filter((p) => p.id !== data.id);
  if (others.some((p) => String(p.sku).toLowerCase() === sku)) errors.push("SKU already exists.");
  if (barcode && others.some((p) => String(p.barcode).toLowerCase() === barcode)) {
    errors.push("Barcode already exists.");
  }
  return errors;
}

export function upsert(data) {
  const list = getProducts();
  const record = {
    id: data.id || storage.uid("prd"),
    name: String(data.name || "").trim(),
    sku: String(data.sku || "").trim(),
    barcode: String(data.barcode || "").trim(),
    categoryId: data.categoryId || "cat_other",
    unit: String(data.unit || "pc").trim(),
    sellingPriceCents: Math.max(0, Number(data.sellingPriceCents) || 0),
    costPriceCents: Math.max(0, Number(data.costPriceCents) || 0),
    stock: Math.max(0, Number(data.stock) || 0),
    minStock: Math.max(0, Number(data.minStock) || 0),
    icon: data.icon || "🛒",
    image: data.image || "",
    supplierId: data.supplierId || "",
    expiryDate: data.expiryDate || "",
    createdAt: data.createdAt || storage.nowIso(),
    updatedAt: storage.nowIso(),
  };
  const errors = validateProduct(record);
  if (errors.length) return { ok: false, errors };
  const idx = list.findIndex((p) => p.id === record.id);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  saveProducts(list);
  return { ok: true, product: record };
}

export function remove(id) {
  saveProducts(getProducts().filter((p) => p.id !== id));
  const cart = storage.getCart();
  cart.items = cart.items.filter((i) => i.productId !== id);
  storage.saveCart(cart);
}

export function setStock(id, nextStock) {
  const list = getProducts();
  const p = list.find((x) => x.id === id);
  if (!p) return null;
  p.stock = Math.max(0, Number(nextStock) || 0);
  p.updatedAt = storage.nowIso();
  saveProducts(list);
  return p;
}

export function getCategories() {
  return storage.getCategories();
}

export function saveCategory(data) {
  const name = String(data.name || "").trim();
  if (!name) return { ok: false, errors: ["Category name is required."] };
  const list = getCategories();
  const dup = list.some((c) => c.id !== data.id && c.name.toLowerCase() === name.toLowerCase());
  if (dup) return { ok: false, errors: ["A category with this name already exists."] };
  const rec = { id: data.id || storage.uid("cat"), name };
  const idx = list.findIndex((c) => c.id === rec.id);
  if (idx >= 0) list[idx] = rec;
  else list.push(rec);
  storage.saveCategories(list);
  return { ok: true, category: rec };
}

export function deleteCategory(id) {
  const used = getProducts().some((p) => p.categoryId === id);
  if (used) return { ok: false, errors: ["Cannot delete a category that still has products."] };
  storage.saveCategories(getCategories().filter((c) => c.id !== id));
  return { ok: true };
}

export function countByCategory(categoryId) {
  return getProducts().filter((p) => p.categoryId === categoryId).length;
}
