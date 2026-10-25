import * as storage from "./storage.js";
import * as products from "./products.js";

export function getSuppliers() {
  return storage.getSuppliers();
}

export function getById(id) {
  return getSuppliers().find((s) => s.id === id) || null;
}

export function productsFor(supplierId) {
  return products.getProducts().filter((p) => p.supplierId === supplierId);
}

export function upsert(data) {
  const name = String(data.name || "").trim();
  if (!name) return { ok: false, errors: ["Supplier name is required."] };
  const list = getSuppliers();
  const rec = {
    id: data.id || storage.uid("sup"),
    name,
    contactPerson: String(data.contactPerson || "").trim(),
    phone: String(data.phone || "").trim(),
    email: String(data.email || "").trim(),
    address: String(data.address || "").trim(),
  };
  const idx = list.findIndex((s) => s.id === rec.id);
  if (idx >= 0) list[idx] = rec;
  else list.push(rec);
  storage.saveSuppliers(list);
  return { ok: true, supplier: rec };
}

export function remove(id) {
  if (productsFor(id).length) {
    return { ok: false, errors: ["Cannot delete a supplier that is linked to products."] };
  }
  storage.saveSuppliers(getSuppliers().filter((s) => s.id !== id));
  return { ok: true };
}
