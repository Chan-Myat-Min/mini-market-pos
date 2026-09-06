(function (global) {
  const MMP = (global.MMP = global.MMP || {});
  const S = () => MMP.storage;

  function getSuppliers() {
    return S().getSuppliers();
  }

  function getById(id) {
    return getSuppliers().find((s) => s.id === id) || null;
  }

  function productsFor(supplierId) {
    return MMP.products.getProducts().filter((p) => p.supplierId === supplierId);
  }

  function upsert(data) {
    const name = String(data.name || "").trim();
    if (!name) return { ok: false, errors: ["Supplier name is required."] };
    const list = getSuppliers();
    const rec = {
      id: data.id || S().uid("sup"),
      name,
      contactPerson: String(data.contactPerson || "").trim(),
      phone: String(data.phone || "").trim(),
      email: String(data.email || "").trim(),
      address: String(data.address || "").trim(),
    };
    const idx = list.findIndex((s) => s.id === rec.id);
    if (idx >= 0) list[idx] = rec;
    else list.push(rec);
    S().saveSuppliers(list);
    return { ok: true, supplier: rec };
  }

  function remove(id) {
    const used = productsFor(id).length;
    if (used) {
      return { ok: false, errors: ["Cannot delete a supplier that is linked to products."] };
    }
    S().saveSuppliers(getSuppliers().filter((s) => s.id !== id));
    return { ok: true };
  }

  MMP.suppliers = {
    getSuppliers,
    getById,
    productsFor,
    upsert,
    remove,
  };
})(window);
