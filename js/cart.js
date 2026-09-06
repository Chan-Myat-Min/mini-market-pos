(function (global) {
  const MMP = (global.MMP = global.MMP || {});
  const S = () => MMP.storage;

  function getCart() {
    return S().getCart();
  }

  function persist(cart) {
    S().saveCart(cart);
    return cart;
  }

  function lineFor(productId) {
    return getCart().items.find((i) => i.productId === productId);
  }

  function add(productId, qty) {
    const product = MMP.products.getById(productId);
    if (!product) return { ok: false, errors: ["Product not found."] };
    const addQty = Math.max(1, parseInt(qty, 10) || 1);
    const cart = getCart();
    const existing = cart.items.find((i) => i.productId === productId);
    const nextQty = (existing ? existing.qty : 0) + addQty;
    if (nextQty > product.stock) {
      return {
        ok: false,
        errors: ["Only " + product.stock + " in stock for " + product.name + "."],
      };
    }
    if (existing) existing.qty = nextQty;
    else cart.items.push({ productId, qty: addQty });
    persist(cart);
    return { ok: true, cart };
  }

  function setQty(productId, qty) {
    const product = MMP.products.getById(productId);
    if (!product) return { ok: false, errors: ["Product not found."] };
    const next = parseInt(qty, 10);
    if (!Number.isFinite(next) || next < 1) {
      return remove(productId);
    }
    if (next > product.stock) {
      return { ok: false, errors: ["Only " + product.stock + " in stock."] };
    }
    const cart = getCart();
    const line = cart.items.find((i) => i.productId === productId);
    if (!line) return { ok: false, errors: ["Item is not in the cart."] };
    line.qty = next;
    persist(cart);
    return { ok: true, cart };
  }

  function remove(productId) {
    const cart = getCart();
    cart.items = cart.items.filter((i) => i.productId !== productId);
    persist(cart);
    return { ok: true, cart };
  }

  function clear() {
    persist(S().defaultCart());
  }

  function setDiscountCents(cents) {
    const cart = getCart();
    cart.discountCents = Math.max(0, Math.round(Number(cents) || 0));
    persist(cart);
  }

  function setPayment(method, amountReceivedCents) {
    const cart = getCart();
    cart.paymentMethod = method;
    if (amountReceivedCents != null) {
      cart.amountReceivedCents = Math.max(0, Math.round(Number(amountReceivedCents) || 0));
    }
    persist(cart);
  }

  function setCustomer(customerId) {
    const cart = getCart();
    cart.customerId = customerId || "";
    persist(cart);
  }

  function hydratedItems() {
    return getCart()
      .items.map((line) => {
        const product = MMP.products.getById(line.productId);
        if (!product) return null;
        const lineTotal = product.sellingPriceCents * line.qty;
        return {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          qty: line.qty,
          unit: product.unit,
          unitPriceCents: product.sellingPriceCents,
          costPriceCents: product.costPriceCents,
          lineTotalCents: lineTotal,
          stock: product.stock,
        };
      })
      .filter(Boolean);
  }

  /**
   * Subtotal = sum(price × qty)
   * Taxable = subtotal - discount
   * Tax = taxable × taxRate
   * Grand total = taxable + tax
   */
  function totals() {
    const cart = getCart();
    const items = hydratedItems();
    const subtotal = items.reduce((sum, i) => sum + i.lineTotalCents, 0);
    const discount = Math.min(cart.discountCents || 0, subtotal);
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round(taxable * MMP.settings.taxRate());
    const grandTotal = taxable + tax;
    const method = cart.paymentMethod || "cash";
    const received =
      method === "cash" ? cart.amountReceivedCents || 0 : grandTotal;
    const change = received - grandTotal;
    return {
      items,
      subtotalCents: subtotal,
      discountCents: discount,
      taxCents: tax,
      grandTotalCents: grandTotal,
      amountReceivedCents: received,
      changeCents: change,
      paymentMethod: method,
      empty: items.length === 0,
    };
  }

  MMP.cart = {
    getCart,
    add,
    setQty,
    remove,
    clear,
    setDiscountCents,
    setPayment,
    setCustomer,
    hydratedItems,
    totals,
    lineFor,
  };
})(window);
