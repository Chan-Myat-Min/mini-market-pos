(function (global) {
  const MMP = (global.MMP = global.MMP || {});
  const S = () => MMP.storage;

  function localDay(iso) {
    const x = new Date(iso);
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const d = String(x.getDate()).padStart(2, "0");
    return x.getFullYear() + "-" + m + "-" + d;
  }

  function nextReceiptNo() {
    const n = S().getSales().length + 1;
    return "RCP-" + String(n).padStart(6, "0");
  }

  function completeSale() {
    const cart = S().getCart();
    const t = MMP.cart.totals();
    if (t.empty) return { ok: false, errors: ["Cart is empty."] };

    for (const item of t.items) {
      const live = MMP.products.getById(item.productId);
      if (!live) return { ok: false, errors: ["A cart product is no longer available."] };
      if (item.qty > live.stock) {
        return { ok: false, errors: ["Not enough stock for " + live.name + "."] };
      }
    }

    if (t.paymentMethod === "cash" && t.amountReceivedCents < t.grandTotalCents) {
      return { ok: false, errors: ["Cash received is less than the total due."] };
    }

    const settings = S().getSettings();
    const customer =
      MMP.customers.getById(cart.customerId) || MMP.customers.walkIn();

    const sale = {
      id: S().uid("sale"),
      receiptNo: nextReceiptNo(),
      createdAt: S().nowIso(),
      cashier: settings.cashierName || "Cashier",
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
      taxRate: MMP.settings.taxRate(),
      taxCents: t.taxCents,
      grandTotalCents: t.grandTotalCents,
      paymentMethod: t.paymentMethod,
      amountReceivedCents: t.amountReceivedCents,
      changeCents: Math.max(0, t.changeCents),
      status: "completed",
      refundedAt: "",
    };

    t.items.forEach((item) => {
      MMP.inventory.move(item.productId, "sale", item.qty, "Sale " + sale.receiptNo, {
        saleId: sale.id,
      });
    });

    MMP.customers.recordPurchase(customer.id, sale.grandTotalCents, sale.createdAt);
    S().saveSale(sale);
    MMP.cart.clear();
    return { ok: true, sale };
  }

  function refund(saleId) {
    const sale = S().getSales().find((s) => s.id === saleId);
    if (!sale) return { ok: false, errors: ["Sale not found."] };
    if (sale.status === "refunded") return { ok: false, errors: ["This sale is already refunded."] };

    sale.items.forEach((item) => {
      if (MMP.products.getById(item.productId)) {
        MMP.inventory.move(item.productId, "refund", item.qty, "Refund " + sale.receiptNo, {
          saleId: sale.id,
        });
      }
    });

    MMP.customers.reversePurchase(sale.customerId, sale.grandTotalCents);
    sale.status = "refunded";
    sale.refundedAt = S().nowIso();
    S().saveSale(sale);
    return { ok: true, sale };
  }

  function getById(id) {
    return S().getSales().find((s) => s.id === id) || null;
  }

  function filterSales({ query, payment, from, to, status } = {}) {
    const q = String(query || "").trim().toLowerCase();
    return S().getSales().filter((s) => {
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

  MMP.sales = {
    nextReceiptNo,
    completeSale,
    refund,
    getById,
    filterSales,
    getSales: () => S().getSales(),
  };
})(window);
