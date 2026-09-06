(function (global) {
  const MMP = (global.MMP = global.MMP || {});
  const S = () => MMP.storage;

  function history() {
    return S().getInventoryHistory();
  }

  function record(entry) {
    const list = history();
    list.unshift(
      Object.assign(
        {
          id: S().uid("inv"),
          createdAt: S().nowIso(),
        },
        entry
      )
    );
    S().saveInventoryHistory(list);
  }

  /**
   * type: in | out | adjust | sale | refund
   * For in/out, qty is the movement size (positive).
   * For adjust, qty is the new absolute stock.
   */
  function move(productId, type, qty, note, extra) {
    const product = MMP.products.getById(productId);
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

    MMP.products.setStock(productId, after);
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

  function lowStock() {
    return MMP.products.getProducts().filter((p) => MMP.products.stockStatus(p) === "low");
  }

  function outOfStock() {
    return MMP.products.getProducts().filter((p) => MMP.products.stockStatus(p) === "out");
  }

  MMP.inventory = {
    history,
    record,
    move,
    lowStock,
    outOfStock,
  };
})(window);
