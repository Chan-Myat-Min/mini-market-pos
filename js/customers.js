(function (global) {
  const MMP = (global.MMP = global.MMP || {});
  const S = () => MMP.storage;

  function getCustomers() {
    return S().getCustomers();
  }

  function walkIn() {
    return (
      getCustomers().find((c) => c.walkIn) || {
        id: "cust_walkin",
        name: "Walk-in Customer",
        walkIn: true,
        totalPurchasesCents: 0,
        lastPurchase: "",
      }
    );
  }

  function getById(id) {
    return getCustomers().find((c) => c.id === id) || null;
  }

  function upsert(data) {
    const name = String(data.name || "").trim();
    if (!name) return { ok: false, errors: ["Customer name is required."] };
    const list = getCustomers();
    const rec = {
      id: data.id || S().uid("cust"),
      name,
      phone: String(data.phone || "").trim(),
      email: String(data.email || "").trim(),
      address: String(data.address || "").trim(),
      totalPurchasesCents: Number(data.totalPurchasesCents) || 0,
      lastPurchase: data.lastPurchase || "",
      walkIn: !!data.walkIn,
    };
    const idx = list.findIndex((c) => c.id === rec.id);
    if (idx >= 0) {
      rec.totalPurchasesCents = list[idx].totalPurchasesCents;
      rec.lastPurchase = list[idx].lastPurchase;
      rec.walkIn = list[idx].walkIn;
      list[idx] = rec;
    } else list.push(rec);
    S().saveCustomers(list);
    return { ok: true, customer: rec };
  }

  function remove(id) {
    const c = getById(id);
    if (c && c.walkIn) return { ok: false, errors: ["The walk-in customer cannot be deleted."] };
    S().saveCustomers(getCustomers().filter((x) => x.id !== id));
    return { ok: true };
  }

  function recordPurchase(id, amountCents, when) {
    const list = getCustomers();
    const c = list.find((x) => x.id === id) || list.find((x) => x.walkIn);
    if (!c) return;
    c.totalPurchasesCents = (c.totalPurchasesCents || 0) + amountCents;
    c.lastPurchase = when;
    S().saveCustomers(list);
  }

  function reversePurchase(id, amountCents) {
    const list = getCustomers();
    const c = list.find((x) => x.id === id);
    if (!c) return;
    c.totalPurchasesCents = Math.max(0, (c.totalPurchasesCents || 0) - amountCents);
    S().saveCustomers(list);
  }

  MMP.customers = {
    getCustomers,
    walkIn,
    getById,
    upsert,
    remove,
    recordPurchase,
    reversePurchase,
  };
})(window);
