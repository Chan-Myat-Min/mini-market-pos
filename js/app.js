(function () {
  const MMP = window.MMP;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const labels = {
    dashboard: "Dashboard",
    pos: "POS / Checkout",
    products: "Products",
    inventory: "Inventory",
    categories: "Categories",
    sales: "Sales",
    customers: "Customers",
    suppliers: "Suppliers",
    reports: "Reports",
    settings: "Settings",
  };

  let state = {
    view: "dashboard",
    productQuery: "",
    productCategory: "",
    productSort: "name",
    posQuery: "",
    posCategory: "",
    salesQuery: "",
    salesPayment: "",
    salesFrom: "",
    salesTo: "",
    invFilter: "all",
  };

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function money(cents) {
    return MMP.settings.formatMoney(cents);
  }

  function toast(message, type) {
    const wrap = $("#toasts");
    const el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " error" : "");
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function closeModal() {
    $("#modal-backdrop").classList.remove("is-open");
    $("#modal").innerHTML = "";
  }

  function openModal(html) {
    $("#modal").innerHTML = html;
    $("#modal-backdrop").classList.add("is-open");
    const first = $("#modal").querySelector("input, select, textarea, button");
    if (first) first.focus();
  }

  function confirmAction(message, onYes) {
    openModal(
      "<h3>Please confirm</h3><p>" +
        escapeHtml(message) +
        '</p><div class="toolbar"><button class="btn btn-danger" id="confirm-yes">Confirm</button><button class="btn btn-ghost" id="confirm-no">Cancel</button></div>'
    );
    $("#confirm-yes").onclick = () => {
      closeModal();
      onYes();
    };
    $("#confirm-no").onclick = closeModal;
  }

  function formVal(form, name) {
    const el = form.elements[name];
    return el ? el.value : "";
  }

  function thumbHtml(product, cls) {
    if (product.image) {
      return '<div class="' + cls + '"><img alt="" src="' + escapeHtml(product.image) + '"></div>';
    }
    return '<div class="' + cls + '">' + escapeHtml(product.icon || "🛒") + "</div>";
  }

  function when(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString();
  }

  function payLabel(m) {
    return m === "card" ? "Card" : m === "mobile" ? "Mobile Payment" : "Cash";
  }

  function showView(name) {
    state.view = name;
    $$(".view").forEach((v) => v.classList.toggle("is-active", v.dataset.view === name));
    $$(".nav-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.nav === name));
    $("#page-label").textContent = labels[name] || name;
    $("#sidebar").classList.remove("is-open");
    $("#overlay").classList.remove("is-open");
    render();
  }

  function render() {
    const s = MMP.settings.getSettings();
    $("#store-title").textContent = s.storeName;
    $("#sidebar-foot").textContent = s.cashierName + " · " + s.currency;
    const map = {
      dashboard: renderDashboard,
      pos: renderPOS,
      products: renderProducts,
      inventory: renderInventory,
      categories: renderCategories,
      sales: renderSales,
      customers: renderCustomers,
      suppliers: renderSuppliers,
      reports: renderReports,
      settings: renderSettings,
    };
    (map[state.view] || renderDashboard)();
  }

  function renderDashboard() {
    const d = MMP.reports.dashboard();
    const week = MMP.reports.last7Days();
    const max = Math.max.apply(null, week.map((x) => x.cents).concat([1]));
    $("#view-dashboard").innerHTML =
      '<div class="page-head"><div><h2>Today at a glance</h2><p>Live totals from completed sales stored on this device.</p></div>' +
      '<div class="toolbar"><button class="btn btn-primary" data-nav="pos">Open POS</button><button class="btn" data-nav="reports">Reports</button></div></div>' +
      '<div class="cards">' +
      kpi("Today's sales", money(d.todaySalesCents), d.todayTransactions + " transactions") +
      kpi("Transactions", String(d.todayTransactions), "Completed today") +
      kpi("Products", String(d.productCount), d.lowStock.length + " low stock") +
      kpi("Profit estimate", money(d.todayProfitCents), "After discounts, before overhead") +
      "</div>" +
      '<div class="grid-2">' +
      '<article class="card"><h3>Last 7 days</h3><div class="chart">' +
      week
        .map((x) => {
          const h = Math.max(6, Math.round((x.cents / max) * 140));
          return '<div class="chart-bar" style="height:' + h + 'px" title="' + escapeHtml(money(x.cents)) + '"><span>' + escapeHtml(x.label) + "</span></div>";
        })
        .join("") +
      "</div></article>" +
      '<article class="card"><h3>Stock alerts</h3>' +
      (d.outOfStock.length
        ? "<p><strong>Out of stock:</strong> " + escapeHtml(d.outOfStock.map((p) => p.name).join(", ")) + "</p>"
        : "<p>No out-of-stock items.</p>") +
      (d.lowStock.length
        ? "<p><strong>Low stock:</strong> " + escapeHtml(d.lowStock.map((p) => p.name).join(", ")) + "</p>"
        : "<p>No low-stock items.</p>") +
      "</article></div>" +
      '<article class="card" style="margin-top:14px"><h3>Recent transactions</h3>' +
      (d.recent.length ? salesTable(d.recent) : '<div class="empty">No sales yet. Complete a checkout to see activity here.</div>') +
      "</article>";
  }

  function kpi(label, value, hint) {
    return (
      '<article class="card kpi"><div class="label">' +
      escapeHtml(label) +
      '</div><div class="value">' +
      escapeHtml(value) +
      '</div><div class="hint">' +
      escapeHtml(hint) +
      "</div></article>"
    );
  }

  function salesTable(list) {
    return (
      '<div class="table-wrap"><table><thead><tr><th>Receipt</th><th>When</th><th>Cashier</th><th>Items</th><th>Total</th><th>Pay</th><th>Status</th><th></th></tr></thead><tbody>' +
      list
        .map((s) => {
          const status = s.status === "refunded" ? "badge-refund" : "badge-done";
          return (
            "<tr><td>" +
            escapeHtml(s.receiptNo) +
            "</td><td>" +
            escapeHtml(when(s.createdAt)) +
            "</td><td>" +
            escapeHtml(s.cashier) +
            "</td><td>" +
            s.items.reduce((n, i) => n + i.qty, 0) +
            "</td><td>" +
            escapeHtml(money(s.grandTotalCents)) +
            "</td><td>" +
            escapeHtml(payLabel(s.paymentMethod)) +
            '</td><td><span class="badge ' +
            status +
            '">' +
            escapeHtml(s.status) +
            '</span></td><td class="row-actions"><button class="btn" data-sale-view="' +
            escapeHtml(s.id) +
            '">View</button></td></tr>'
          );
        })
        .join("") +
      "</tbody></table></div>"
    );
  }

  function renderPOS() {
    const cats = MMP.products.getCategories();
    const products = MMP.products.sortProducts(
      MMP.products.search(state.posQuery, state.posCategory),
      "name"
    );
    const t = MMP.cart.totals();
    const cart = MMP.cart.getCart();
    const customers = MMP.customers.getCustomers();

    $("#view-pos").innerHTML =
      '<div class="page-head"><div><h2>Checkout</h2><p>Search, scan, or tap products. F1 search · F2 barcode · F4 complete sale.</p></div></div>' +
      '<div class="pos"><div><div class="toolbar" style="margin-bottom:12px">' +
      '<input class="input" id="product-search" placeholder="Search name, SKU, or barcode" value="' +
      escapeHtml(state.posQuery) +
      '" style="max-width:280px">' +
      '<input class="input" id="barcode-input" placeholder="Scan or type barcode" style="max-width:220px">' +
      '<select class="select" id="pos-category" style="max-width:180px"><option value="">All categories</option>' +
      cats
        .map(
          (c) =>
            '<option value="' +
            escapeHtml(c.id) +
            '"' +
            (state.posCategory === c.id ? " selected" : "") +
            ">" +
            escapeHtml(c.name) +
            "</option>"
        )
        .join("") +
      "</select></div>" +
      '<div id="pos-grid">' + posGridHtml(products) + "</div>" +
      '</div><aside class="cart-panel">' +
      cartPanel(t, cart, customers) +
      "</aside></div>";

    const search = $("#product-search");
    const barcode = $("#barcode-input");
    search.addEventListener("input", () => {
      state.posQuery = search.value;
      const list = MMP.products.sortProducts(
        MMP.products.search(state.posQuery, state.posCategory),
        "name"
      );
      const grid = $("#pos-grid");
      if (grid) grid.innerHTML = posGridHtml(list);
    });
    search.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addByQuery(search.value);
      }
    });
    barcode.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        scanBarcode(barcode.value);
        barcode.value = "";
      }
    });
    $("#pos-category").addEventListener("change", (e) => {
      state.posCategory = e.target.value;
      renderPOS();
    });
  }

  function posGridHtml(products) {
    if (!products.length) return '<div class="card empty">No matching products.</div>';
    return '<div class="product-grid">' + products.map(posCard).join("") + "</div>";
  }

  function posCard(p) {
    const st = MMP.products.stockStatus(p);
    const disabled = p.stock <= 0 ? " disabled" : "";
    return (
      '<article class="product-card">' +
      thumbHtml(p, "thumb") +
      "<h3>" +
      escapeHtml(p.name) +
      '</h3><div class="sku">' +
      escapeHtml(p.sku) +
      " · " +
      escapeHtml(p.barcode || "no barcode") +
      '</div><div class="price">' +
      escapeHtml(money(p.sellingPriceCents)) +
      '</div><div><span class="badge badge-' +
      st +
      '">' +
      escapeHtml(MMP.products.statusLabel(st)) +
      " · " +
      p.stock +
      '</span></div><button class="btn btn-primary" data-add="' +
      escapeHtml(p.id) +
      '"' +
      disabled +
      ">Add to cart</button></article>"
    );
  }

  function cartPanel(t, cart, customers) {
    const changeClass = t.changeCents >= 0 ? "change-ok" : "change-bad";
    const cash = t.paymentMethod === "cash";
    const itemsHtml = t.items.length
      ? t.items
          .map((i) => {
            return (
              '<div class="cart-item"><div><strong>' +
              escapeHtml(i.name) +
              '</strong><div class="sku">' +
              escapeHtml(money(i.unitPriceCents)) +
              " × " +
              i.qty +
              '</div></div><div><div class="qty-row"><button type="button" data-qty="' +
              escapeHtml(i.productId) +
              '" data-delta="-1">−</button><strong>' +
              i.qty +
              '</strong><button type="button" data-qty="' +
              escapeHtml(i.productId) +
              '" data-delta="1">+</button><button class="btn btn-ghost" data-remove="' +
              escapeHtml(i.productId) +
              '">✕</button></div><div>' +
              escapeHtml(money(i.lineTotalCents)) +
              "</div></div></div>"
            );
          })
          .join("")
      : '<div class="empty">Cart is empty</div>';

    return (
      "<h3>Current cart</h3>" +
      '<label class="field">Customer<select class="select" id="pos-customer">' +
      customers
        .map(
          (c) =>
            '<option value="' +
            escapeHtml(c.id) +
            '"' +
            (cart.customerId === c.id || (!cart.customerId && c.walkIn) ? " selected" : "") +
            ">" +
            escapeHtml(c.name) +
            (c.walkIn ? " (walk-in)" : "") +
            "</option>"
        )
        .join("") +
      "</select></label>" +
      itemsHtml +
      '<div class="totals"><div class="totals-row"><span>Subtotal</span><span>' +
      escapeHtml(money(t.subtotalCents)) +
      '</span></div><label class="field">Discount (' +
      escapeHtml(MMP.settings.getSettings().currencySymbol) +
      ')<input class="input" id="pos-discount" type="number" min="0" step="0.01" value="' +
      MMP.storage.fromCents(cart.discountCents) +
      '"></label><div class="totals-row"><span>Discount</span><span>− ' +
      escapeHtml(money(t.discountCents)) +
      '</span></div><div class="totals-row"><span>Tax (' +
      escapeHtml(String(MMP.settings.getSettings().taxPercent)) +
      '%)</span><span>' +
      escapeHtml(money(t.taxCents)) +
      '</span></div><div class="totals-row grand"><span>Total</span><span>' +
      escapeHtml(money(t.grandTotalCents)) +
      "</span></div></div>" +
      '<label class="field">Payment method<select class="select" id="pos-pay">' +
      ["cash", "card", "mobile"]
        .map((m) => '<option value="' + m + '"' + (t.paymentMethod === m ? " selected" : "") + ">" + payLabel(m) + "</option>")
        .join("") +
      "</select></label>" +
      (cash
        ? '<label class="field">Amount received<input class="input" id="pos-received" type="number" min="0" step="0.01" value="' +
          (cart.amountReceivedCents ? MMP.storage.fromCents(cart.amountReceivedCents) : "") +
          '"></label><div class="totals-row ' +
          changeClass +
          '"><span>Change</span><span>' +
          escapeHtml(money(t.changeCents)) +
          "</span></div>"
        : "<p>Card / mobile charges the exact total.</p>") +
      '<div class="toolbar" style="margin-top:12px;flex-direction:column">' +
      '<button class="btn btn-accent btn-lg btn-block" id="complete-sale">Complete sale</button>' +
      '<button class="btn btn-ghost btn-block" id="clear-cart">Clear cart</button></div>'
    );
  }

  function addByQuery(q) {
    const exact = MMP.products.findByCode(q);
    if (exact) return addToCart(exact.id);
    const list = MMP.products.search(q, state.posCategory);
    if (list.length === 1) return addToCart(list[0].id);
    state.posQuery = q;
    renderPOS();
    if (!list.length) toast("No product found.", "error");
  }

  function scanBarcode(code) {
    const p = MMP.products.findByCode(code);
    if (!p) return toast("Barcode not found: " + code, "error");
    addToCart(p.id);
  }

  function addToCart(id) {
    const res = MMP.cart.add(id, 1);
    if (!res.ok) return toast(res.errors[0], "error");
    toast("Added to cart");
    if (state.view === "pos") renderPOS();
  }

  function completeSale() {
    const res = MMP.sales.completeSale();
    if (!res.ok) return toast(res.errors[0], "error");
    toast("Sale " + res.sale.receiptNo + " completed");
    openReceipt(res.sale, true);
    render();
  }

  function openReceipt(sale, afterSale) {
    const s = MMP.settings.getSettings();
    const html = receiptHtml(sale, s);
    openModal(
      html +
        '<div class="toolbar no-print"><button class="btn btn-primary" id="print-receipt">Print receipt</button>' +
        (afterSale ? "" : "") +
        '<button class="btn btn-ghost" id="close-receipt">Close</button></div>'
    );
    $("#print-root").innerHTML = html;
    $("#print-receipt").onclick = () => {
      $("#print-root").hidden = false;
      window.print();
      $("#print-root").hidden = true;
    };
    $("#close-receipt").onclick = closeModal;
  }

  function receiptHtml(sale, s) {
    const rows = sale.items
      .map(
        (i) =>
          "<tr><td>" +
          escapeHtml(i.name) +
          "<br>" +
          i.qty +
          " × " +
          escapeHtml(money(i.unitPriceCents)) +
          "</td><td style='text-align:right'>" +
          escapeHtml(money(i.lineTotalCents)) +
          "</td></tr>"
      )
      .join("");
    return (
      '<div class="receipt"><h4>' +
      escapeHtml(s.storeName) +
      "</h4><p>" +
      escapeHtml(s.address) +
      "<br>" +
      escapeHtml(s.phone) +
      "</p><p>Receipt " +
      escapeHtml(sale.receiptNo) +
      "<br>" +
      escapeHtml(when(sale.createdAt)) +
      "<br>Cashier: " +
      escapeHtml(sale.cashier) +
      "<br>Customer: " +
      escapeHtml(sale.customerName) +
      "</p><table>" +
      rows +
      "</table><p>Subtotal " +
      escapeHtml(money(sale.subtotalCents)) +
      "<br>Discount " +
      escapeHtml(money(sale.discountCents)) +
      "<br>Tax " +
      escapeHtml(money(sale.taxCents)) +
      "<br><strong>Total " +
      escapeHtml(money(sale.grandTotalCents)) +
      "</strong><br>" +
      escapeHtml(payLabel(sale.paymentMethod)) +
      "<br>Received " +
      escapeHtml(money(sale.amountReceivedCents)) +
      "<br>Change " +
      escapeHtml(money(sale.changeCents)) +
      "<br>Status: " +
      escapeHtml(sale.status) +
      "</p><p>" +
      escapeHtml(s.receiptFooter) +
      "</p></div>"
    );
  }

  function renderProducts() {
    let list = MMP.products.search(state.productQuery, state.productCategory);
    list = MMP.products.sortProducts(list, state.productSort);
    const cats = MMP.products.getCategories();
    $("#view-products").innerHTML =
      '<div class="page-head"><div><h2>Products</h2><p>Catalog, pricing, and stock status.</p></div><button class="btn btn-primary" id="add-product">Add product</button></div>' +
      '<div class="toolbar" style="margin-bottom:12px"><input class="input" id="prod-q" placeholder="Search products" value="' +
      escapeHtml(state.productQuery) +
      '" style="max-width:240px"><select class="select" id="prod-cat" style="max-width:180px"><option value="">All categories</option>' +
      cats.map((c) => option(c.id, c.name, state.productCategory)).join("") +
      '</select><select class="select" id="prod-sort" style="max-width:160px">' +
      option("name", "Name", state.productSort) +
      option("sku", "SKU", state.productSort) +
      option("price", "Price", state.productSort) +
      option("stock", "Stock", state.productSort) +
      "</select></div>" +
      '<div class="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Selling</th><th>Cost</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
      (list.length
        ? list
            .map((p) => {
              const st = MMP.products.stockStatus(p);
              return (
                "<tr><td>" +
                thumbHtml(p, "thumb-sm") +
                " " +
                escapeHtml(p.name) +
                "</td><td>" +
                escapeHtml(p.sku) +
                "</td><td>" +
                escapeHtml(MMP.products.categoryName(p.categoryId)) +
                "</td><td>" +
                escapeHtml(money(p.sellingPriceCents)) +
                "</td><td>" +
                escapeHtml(money(p.costPriceCents)) +
                "</td><td>" +
                p.stock +
                '</td><td><span class="badge badge-' +
                st +
                '">' +
                escapeHtml(MMP.products.statusLabel(st)) +
                '</span></td><td class="row-actions"><button class="btn" data-edit-product="' +
                escapeHtml(p.id) +
                '">Edit</button><button class="btn btn-danger" data-del-product="' +
                escapeHtml(p.id) +
                '">Delete</button></td></tr>'
              );
            })
            .join("")
        : '<tr><td colspan="8"><div class="empty">No products found.</div></td></tr>') +
      "</tbody></table></div>";

    $("#prod-q").oninput = (e) => {
      state.productQuery = e.target.value;
    };
    $("#prod-q").onchange = () => renderProducts();
    $("#prod-cat").onchange = (e) => {
      state.productCategory = e.target.value;
      renderProducts();
    };
    $("#prod-sort").onchange = (e) => {
      state.productSort = e.target.value;
      renderProducts();
    };
    $("#add-product").onclick = () => productModal(null);
  }

  function option(value, label, selected) {
    return (
      '<option value="' +
      escapeHtml(value) +
      '"' +
      (selected === value ? " selected" : "") +
      ">" +
      escapeHtml(label) +
      "</option>"
    );
  }

  function productModal(product) {
    const p = product || {
      name: "",
      sku: "",
      barcode: "",
      categoryId: "",
      unit: "pc",
      sellingPriceCents: 0,
      costPriceCents: 0,
      stock: 0,
      minStock: MMP.settings.getSettings().lowStockThreshold,
      supplierId: "",
      expiryDate: "",
      icon: "🛒",
      image: "",
    };
    const cats = MMP.products.getCategories();
    const sups = MMP.suppliers.getSuppliers();
    openModal(
      "<h3>" +
        (product ? "Edit product" : "Add product") +
        '</h3><form id="product-form" class="form-grid">' +
        field("name", "Product name", p.name, "text", true) +
        field("sku", "SKU", p.sku) +
        field("barcode", "Barcode", p.barcode) +
        '<div class="field"><label>Category</label><select class="select" name="categoryId">' +
        cats.map((c) => option(c.id, c.name, p.categoryId)).join("") +
        '</select></div>' +
        field("unit", "Unit", p.unit) +
        field("selling", "Selling price", MMP.storage.fromCents(p.sellingPriceCents), "number") +
        field("cost", "Cost price", MMP.storage.fromCents(p.costPriceCents), "number") +
        field("stock", "Stock", p.stock, "number") +
        field("minStock", "Min stock", p.minStock, "number") +
        '<div class="field"><label>Supplier</label><select class="select" name="supplierId"><option value="">None</option>' +
        sups.map((s) => option(s.id, s.name, p.supplierId)).join("") +
        "</select></div>" +
        field("expiryDate", "Expiry date", p.expiryDate, "date") +
        field("icon", "Icon / emoji", p.icon) +
        '<div class="field full"><label>Product image</label><input class="input" name="imageFile" type="file" accept="image/*"></div>' +
        '<input type="hidden" name="image" value="' +
        escapeHtml(p.image || "") +
        '">' +
        '<div class="toolbar full"><button class="btn btn-primary" type="submit">Save</button><button class="btn btn-ghost" type="button" id="cancel-modal">Cancel</button></div></form>'
    );
    $("#cancel-modal").onclick = closeModal;
    const form = $("#product-form");
    form.elements.imageFile.addEventListener("change", () => {
      const file = form.elements.imageFile.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        form.elements.image.value = reader.result;
      };
      reader.readAsDataURL(file);
    });
    form.onsubmit = (e) => {
      e.preventDefault();
      const sell = MMP.storage.toCents(formVal(form, "selling"));
      const cost = MMP.storage.toCents(formVal(form, "cost"));
      const stock = Number(formVal(form, "stock"));
      if (sell < 0 || cost < 0) return toast("Prices cannot be negative.", "error");
      if (stock < 0) return toast("Stock cannot be negative.", "error");
      const res = MMP.products.upsert({
        id: product && product.id,
        createdAt: product && product.createdAt,
        name: formVal(form, "name"),
        sku: formVal(form, "sku"),
        barcode: formVal(form, "barcode"),
        categoryId: formVal(form, "categoryId"),
        unit: formVal(form, "unit"),
        sellingPriceCents: sell,
        costPriceCents: cost,
        stock: stock,
        minStock: Number(formVal(form, "minStock")) || 0,
        supplierId: formVal(form, "supplierId"),
        expiryDate: formVal(form, "expiryDate"),
        icon: formVal(form, "icon") || "🛒",
        image: formVal(form, "image"),
      });
      if (!res.ok) return toast(res.errors[0], "error");
      closeModal();
      toast("Product saved");
      render();
    };
  }

  function field(name, label, value, type, required) {
    return (
      '<div class="field"><label>' +
      escapeHtml(label) +
      '</label><input class="input" name="' +
      name +
      '" type="' +
      (type || "text") +
      '" value="' +
      escapeHtml(value == null ? "" : value) +
      '"' +
      (required ? " required" : "") +
      (type === "number" ? ' min="0" step="0.01"' : "") +
      "></div>"
    );
  }

  function renderInventory() {
    const products = MMP.products.getProducts();
    const hist = MMP.inventory.history();
    const filtered =
      state.invFilter === "low"
        ? MMP.inventory.lowStock()
        : state.invFilter === "out"
          ? MMP.inventory.outOfStock()
          : products;
    $("#view-inventory").innerHTML =
      '<div class="page-head"><div><h2>Inventory</h2><p>Stock-in, adjustments, and movement history. Sales reduce stock automatically.</p></div>' +
      '<div class="toolbar"><button class="btn btn-primary" id="stock-in-btn">Stock-in</button><button class="btn" id="stock-adj-btn">Adjust</button><button class="btn" id="stock-out-btn">Stock-out</button></div></div>' +
      '<div class="toolbar" style="margin-bottom:12px">' +
      '<button class="btn' +
      (state.invFilter === "all" ? " btn-primary" : "") +
      '" data-inv-filter="all">All</button>' +
      '<button class="btn' +
      (state.invFilter === "low" ? " btn-primary" : "") +
      '" data-inv-filter="low">Low stock (' +
      MMP.inventory.lowStock().length +
      ")</button>" +
      '<button class="btn' +
      (state.invFilter === "out" ? " btn-primary" : "") +
      '" data-inv-filter="out">Out of stock (' +
      MMP.inventory.outOfStock().length +
      ")</button></div>" +
      '<div class="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Min</th><th>Status</th></tr></thead><tbody>' +
      filtered
        .map((p) => {
          const st = MMP.products.stockStatus(p);
          return (
            "<tr><td>" +
            escapeHtml(p.name) +
            "</td><td>" +
            escapeHtml(p.sku) +
            "</td><td>" +
            p.stock +
            "</td><td>" +
            p.minStock +
            '</td><td><span class="badge badge-' +
            st +
            '">' +
            escapeHtml(MMP.products.statusLabel(st)) +
            "</span></td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>" +
      '<article class="card" style="margin-top:14px"><h3>Inventory history</h3>' +
      (hist.length
        ? '<div class="table-wrap"><table><thead><tr><th>When</th><th>Product</th><th>Type</th><th>Qty</th><th>Before</th><th>After</th><th>Note</th></tr></thead><tbody>' +
          hist
            .slice(0, 80)
            .map(
              (h) =>
                "<tr><td>" +
                escapeHtml(when(h.createdAt)) +
                "</td><td>" +
                escapeHtml(h.productName) +
                "</td><td>" +
                escapeHtml(h.type) +
                "</td><td>" +
                h.qty +
                "</td><td>" +
                h.before +
                "</td><td>" +
                h.after +
                "</td><td>" +
                escapeHtml(h.note || "") +
                "</td></tr>"
            )
            .join("") +
          "</tbody></table></div>"
        : '<div class="empty">No inventory movements yet.</div>') +
      "</article>";

    $("#stock-in-btn").onclick = () => stockModal("in");
    $("#stock-adj-btn").onclick = () => stockModal("adjust");
    $("#stock-out-btn").onclick = () => stockModal("out");
    $$("[data-inv-filter]").forEach((b) => {
      b.onclick = () => {
        state.invFilter = b.dataset.invFilter;
        renderInventory();
      };
    });
  }

  function stockModal(type) {
    const products = MMP.products.getProducts();
    const title = type === "in" ? "Stock-in" : type === "out" ? "Stock-out" : "Stock adjustment";
    const qtyLabel = type === "adjust" ? "New stock quantity" : "Quantity";
    openModal(
      "<h3>" +
        title +
        '</h3><form id="stock-form"><div class="field"><label>Product</label><select class="select" name="productId" required>' +
        products.map((p) => option(p.id, p.name + " (stock " + p.stock + ")", "")).join("") +
        '</select></div>' +
        field("qty", qtyLabel, 1, "number") +
        '<div class="field"><label>Note</label><input class="input" name="note"></div>' +
        '<div class="toolbar"><button class="btn btn-primary" type="submit">Save</button><button class="btn btn-ghost" type="button" id="cancel-modal">Cancel</button></div></form>'
    );
    $("#cancel-modal").onclick = closeModal;
    $("#stock-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.target;
      const res = MMP.inventory.move(formVal(form, "productId"), type, Number(formVal(form, "qty")), formVal(form, "note"));
      if (!res.ok) return toast(res.errors[0], "error");
      closeModal();
      toast("Inventory updated");
      render();
    };
  }

  function renderCategories() {
    const cats = MMP.products.getCategories();
    $("#view-categories").innerHTML =
      '<div class="page-head"><div><h2>Categories</h2><p>Organize the catalog used on the POS grid.</p></div><button class="btn btn-primary" id="add-cat">Add category</button></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Products</th><th></th></tr></thead><tbody>' +
      cats
        .map(
          (c) =>
            "<tr><td>" +
            escapeHtml(c.name) +
            "</td><td>" +
            MMP.products.countByCategory(c.id) +
            '</td><td class="row-actions"><button class="btn" data-edit-cat="' +
            escapeHtml(c.id) +
            '">Edit</button><button class="btn btn-danger" data-del-cat="' +
            escapeHtml(c.id) +
            '">Delete</button></td></tr>'
        )
        .join("") +
      "</tbody></table></div>";
    $("#add-cat").onclick = () => categoryModal(null);
  }

  function categoryModal(cat) {
    openModal(
      "<h3>" +
        (cat ? "Edit category" : "Add category") +
        '</h3><form id="cat-form">' +
        field("name", "Name", cat ? cat.name : "") +
        '<div class="toolbar"><button class="btn btn-primary">Save</button><button class="btn btn-ghost" type="button" id="cancel-modal">Cancel</button></div></form>'
    );
    $("#cancel-modal").onclick = closeModal;
    $("#cat-form").onsubmit = (e) => {
      e.preventDefault();
      const res = MMP.products.saveCategory({ id: cat && cat.id, name: formVal(e.target, "name") });
      if (!res.ok) return toast(res.errors[0], "error");
      closeModal();
      toast("Category saved");
      render();
    };
  }

  function renderSales() {
    const list = MMP.sales.filterSales({
      query: state.salesQuery,
      payment: state.salesPayment,
      from: state.salesFrom,
      to: state.salesTo,
    });
    $("#view-sales").innerHTML =
      '<div class="page-head"><div><h2>Sales history</h2><p>Search, reprint, or refund completed tickets.</p></div></div>' +
      '<div class="toolbar" style="margin-bottom:12px"><input class="input" id="sale-q" placeholder="Search receipt, cashier, items" value="' +
      escapeHtml(state.salesQuery) +
      '" style="max-width:240px"><input class="input" id="sale-from" type="date" value="' +
      escapeHtml(state.salesFrom) +
      '" style="max-width:160px"><input class="input" id="sale-to" type="date" value="' +
      escapeHtml(state.salesTo) +
      '" style="max-width:160px"><select class="select" id="sale-pay" style="max-width:180px"><option value="">All payments</option>' +
      option("cash", "Cash", state.salesPayment) +
      option("card", "Card", state.salesPayment) +
      option("mobile", "Mobile Payment", state.salesPayment) +
      "</select></div>" +
      (list.length ? salesTable(list) : '<div class="card empty">No matching transactions.</div>');
    $("#sale-q").onchange = (e) => {
      state.salesQuery = e.target.value;
      renderSales();
    };
    $("#sale-from").onchange = (e) => {
      state.salesFrom = e.target.value;
      renderSales();
    };
    $("#sale-to").onchange = (e) => {
      state.salesTo = e.target.value;
      renderSales();
    };
    $("#sale-pay").onchange = (e) => {
      state.salesPayment = e.target.value;
      renderSales();
    };
  }

  function saleDetail(sale) {
    openModal(
      "<h3>" +
        escapeHtml(sale.receiptNo) +
        "</h3><p>" +
        escapeHtml(when(sale.createdAt)) +
        " · " +
        escapeHtml(sale.cashier) +
        " · " +
        escapeHtml(sale.customerName) +
        '</p><div class="table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>' +
        sale.items
          .map(
            (i) =>
              "<tr><td>" +
              escapeHtml(i.name) +
              "</td><td>" +
              i.qty +
              "</td><td>" +
              escapeHtml(money(i.lineTotalCents)) +
              "</td></tr>"
          )
          .join("") +
        "</tbody></table></div><p>Total " +
        escapeHtml(money(sale.grandTotalCents)) +
        " · " +
        escapeHtml(payLabel(sale.paymentMethod)) +
        " · " +
        escapeHtml(sale.status) +
        '</p><div class="toolbar"><button class="btn btn-primary" id="reprint">Print receipt</button>' +
        (sale.status === "completed"
          ? '<button class="btn btn-danger" id="refund-sale">Refund / cancel</button>'
          : "") +
        '<button class="btn btn-ghost" id="cancel-modal">Close</button></div>'
    );
    $("#cancel-modal").onclick = closeModal;
    $("#reprint").onclick = () => openReceipt(sale, false);
    const refundBtn = $("#refund-sale");
    if (refundBtn) {
      refundBtn.onclick = () => {
        confirmAction("Refund this sale and restore stock?", () => {
          const res = MMP.sales.refund(sale.id);
          if (!res.ok) return toast(res.errors[0], "error");
          toast("Sale refunded");
          render();
        });
      };
    }
  }

  function renderCustomers() {
    const list = MMP.customers.getCustomers();
    $("#view-customers").innerHTML =
      '<div class="page-head"><div><h2>Customers</h2><p>Walk-in is always available on the POS. Registered customers keep purchase totals.</p></div><button class="btn btn-primary" id="add-cust">Add customer</button></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th>Total purchases</th><th>Last purchase</th><th></th></tr></thead><tbody>' +
      list
        .map(
          (c) =>
            "<tr><td>" +
            escapeHtml(c.name) +
            (c.walkIn ? " (walk-in)" : "") +
            "</td><td>" +
            escapeHtml(c.phone || "—") +
            "</td><td>" +
            escapeHtml(c.email || "—") +
            "</td><td>" +
            escapeHtml(c.address || "—") +
            "</td><td>" +
            escapeHtml(money(c.totalPurchasesCents || 0)) +
            "</td><td>" +
            escapeHtml(c.lastPurchase ? when(c.lastPurchase) : "—") +
            '</td><td class="row-actions">' +
            (c.walkIn
              ? ""
              : '<button class="btn" data-edit-cust="' +
                escapeHtml(c.id) +
                '">Edit</button><button class="btn btn-danger" data-del-cust="' +
                escapeHtml(c.id) +
                '">Delete</button>') +
            "</td></tr>"
        )
        .join("") +
      "</tbody></table></div>";
    $("#add-cust").onclick = () => customerModal(null);
  }

  function customerModal(c) {
    openModal(
      "<h3>" +
        (c ? "Edit customer" : "Add customer") +
        '</h3><form id="cust-form" class="form-grid">' +
        field("name", "Name", c ? c.name : "", "text", true) +
        field("phone", "Phone", c ? c.phone : "") +
        field("email", "Email", c ? c.email : "") +
        '<div class="field full"><label>Address</label><input class="input" name="address" value="' +
        escapeHtml(c ? c.address : "") +
        '"></div><div class="toolbar full"><button class="btn btn-primary">Save</button><button class="btn btn-ghost" type="button" id="cancel-modal">Cancel</button></div></form>'
    );
    $("#cancel-modal").onclick = closeModal;
    $("#cust-form").onsubmit = (e) => {
      e.preventDefault();
      const res = MMP.customers.upsert({
        id: c && c.id,
        name: formVal(e.target, "name"),
        phone: formVal(e.target, "phone"),
        email: formVal(e.target, "email"),
        address: formVal(e.target, "address"),
      });
      if (!res.ok) return toast(res.errors[0], "error");
      closeModal();
      toast("Customer saved");
      render();
    };
  }

  function renderSuppliers() {
    const list = MMP.suppliers.getSuppliers();
    $("#view-suppliers").innerHTML =
      '<div class="page-head"><div><h2>Suppliers</h2><p>Link products to the vendor that supplies them.</p></div><button class="btn btn-primary" id="add-sup">Add supplier</button></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th><th>Products</th><th></th></tr></thead><tbody>' +
      list
        .map((s) => {
          const n = MMP.suppliers.productsFor(s.id).length;
          return (
            "<tr><td>" +
            escapeHtml(s.name) +
            "</td><td>" +
            escapeHtml(s.contactPerson || "—") +
            "</td><td>" +
            escapeHtml(s.phone || "—") +
            "</td><td>" +
            escapeHtml(s.email || "—") +
            "</td><td>" +
            escapeHtml(s.address || "—") +
            "</td><td>" +
            n +
            '</td><td class="row-actions"><button class="btn" data-edit-sup="' +
            escapeHtml(s.id) +
            '">Edit</button><button class="btn btn-danger" data-del-sup="' +
            escapeHtml(s.id) +
            '">Delete</button></td></tr>'
          );
        })
        .join("") +
      "</tbody></table></div>";
    $("#add-sup").onclick = () => supplierModal(null);
  }

  function supplierModal(s) {
    openModal(
      "<h3>" +
        (s ? "Edit supplier" : "Add supplier") +
        '</h3><form id="sup-form" class="form-grid">' +
        field("name", "Supplier name", s ? s.name : "", "text", true) +
        field("contactPerson", "Contact person", s ? s.contactPerson : "") +
        field("phone", "Phone", s ? s.phone : "") +
        field("email", "Email", s ? s.email : "") +
        '<div class="field full"><label>Address</label><input class="input" name="address" value="' +
        escapeHtml(s ? s.address : "") +
        '"></div><div class="toolbar full"><button class="btn btn-primary">Save</button><button class="btn btn-ghost" type="button" id="cancel-modal">Cancel</button></div></form>'
    );
    $("#cancel-modal").onclick = closeModal;
    $("#sup-form").onsubmit = (e) => {
      e.preventDefault();
      const res = MMP.suppliers.upsert({
        id: s && s.id,
        name: formVal(e.target, "name"),
        contactPerson: formVal(e.target, "contactPerson"),
        phone: formVal(e.target, "phone"),
        email: formVal(e.target, "email"),
        address: formVal(e.target, "address"),
      });
      if (!res.ok) return toast(res.errors[0], "error");
      closeModal();
      toast("Supplier saved");
      render();
    };
  }

  function hBars(rows, valueFn, labelFn) {
    const max = Math.max.apply(null, rows.map(valueFn).concat([1]));
    return (
      '<div class="h-bars">' +
      rows
        .map((r) => {
          const w = Math.round((valueFn(r) / max) * 100);
          return (
            '<div class="h-bar"><span>' +
            escapeHtml(labelFn(r)) +
            '</span><div class="track"><div class="fill" style="width:' +
            w +
            '%"></div></div><span>' +
            escapeHtml(money(valueFn(r))) +
            "</span></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderReports() {
    const p = MMP.reports.periodStats();
    const best = MMP.reports.bestSellers(8);
    const cats = MMP.reports.salesByCategory();
    const pays = MMP.reports.salesByPayment();
    const week = MMP.reports.last7Days();
    const max = Math.max.apply(null, week.map((x) => x.cents).concat([1]));
    $("#view-reports").innerHTML =
      '<div class="page-head"><div><h2>Reports</h2><p>Built from local sales — no hardcoded numbers.</p></div></div>' +
      '<div class="cards">' +
      kpi("Today", money(p.todayCents), p.todayCount + " sales") +
      kpi("This week", money(p.weekCents), p.weekCount + " sales") +
      kpi("This month", money(p.monthCents), p.monthCount + " sales") +
      kpi("All transactions", String(p.transactions), "Profit " + money(p.monthProfitCents) + " this month") +
      "</div>" +
      '<div class="grid-2" style="margin-top:14px"><article class="card"><h3>Weekly sales</h3><div class="chart">' +
      week
        .map((x) => {
          const h = Math.max(6, Math.round((x.cents / max) * 140));
          return '<div class="chart-bar" style="height:' + h + 'px"><span>' + escapeHtml(x.label) + "</span></div>";
        })
        .join("") +
      '</div></article><article class="card"><h3>Payment methods</h3>' +
      hBars(pays, (r) => r.cents, (r) => payLabel(r.name)) +
      "</article></div>" +
      '<div class="grid-2"><article class="card"><h3>Best sellers</h3>' +
      (best.length
        ? '<div class="table-wrap"><table><thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead><tbody>' +
          best
            .map(
              (b) =>
                "<tr><td>" +
                escapeHtml(b.name) +
                "</td><td>" +
                b.qty +
                "</td><td>" +
                escapeHtml(money(b.revenueCents)) +
                "</td></tr>"
            )
            .join("") +
          "</tbody></table></div>"
        : '<div class="empty">No sales yet.</div>') +
      '</article><article class="card"><h3>Sales by category</h3>' +
      (cats.length ? hBars(cats, (r) => r.cents, (r) => r.name) : '<div class="empty">No category sales yet.</div>') +
      "</article></div>" +
      '<article class="card" style="margin-top:14px"><h3>Low stock</h3>' +
      (MMP.inventory.lowStock().length
        ? "<p>" + escapeHtml(MMP.inventory.lowStock().map((x) => x.name + " (" + x.stock + ")").join(", ")) + "</p>"
        : "<p>None.</p>") +
      "<p>Estimated profit today: <strong>" +
      escapeHtml(money(p.todayProfitCents)) +
      "</strong></p></article>";
  }

  function renderSettings() {
    const s = MMP.settings.getSettings();
    $("#view-settings").innerHTML =
      '<div class="page-head"><div><h2>Settings</h2><p>Store identity, tax, currency, and theme. Saved in LocalStorage.</p></div></div>' +
      '<form id="settings-form" class="card form-grid">' +
      field("storeName", "Store name", s.storeName, "text", true) +
      field("address", "Address", s.address) +
      field("phone", "Phone", s.phone) +
      field("cashierName", "Default cashier", s.cashierName) +
      field("taxPercent", "Tax %", s.taxPercent, "number") +
      field("currency", "Currency code", s.currency) +
      field("currencySymbol", "Currency symbol", s.currencySymbol) +
      field("lowStockThreshold", "Default low-stock threshold", s.lowStockThreshold, "number") +
      '<div class="field"><label>Theme</label><select class="select" name="theme">' +
      option("light", "Light", s.theme) +
      option("dark", "Dark", s.theme) +
      '</select></div><div class="field full"><label>Receipt footer</label><textarea class="textarea" name="receiptFooter">' +
      escapeHtml(s.receiptFooter) +
      '</textarea></div><div class="toolbar full"><button class="btn btn-primary">Save settings</button><button class="btn btn-danger" type="button" id="reset-data">Reset demo data</button></div></form>';
    $("#settings-form").onsubmit = (e) => {
      e.preventDefault();
      const f = e.target;
      MMP.settings.saveSettings({
        storeName: formVal(f, "storeName"),
        address: formVal(f, "address"),
        phone: formVal(f, "phone"),
        cashierName: formVal(f, "cashierName"),
        taxPercent: Number(formVal(f, "taxPercent")),
        currency: formVal(f, "currency"),
        currencySymbol: formVal(f, "currencySymbol"),
        lowStockThreshold: Number(formVal(f, "lowStockThreshold")),
        theme: formVal(f, "theme"),
        receiptFooter: formVal(f, "receiptFooter"),
      });
      toast("Settings saved");
      render();
    };
    $("#reset-data").onclick = () => {
      confirmAction("Erase all local POS data and restore the demo catalog?", () => {
        MMP.storage.resetAllData();
        MMP.settings.applyTheme(MMP.settings.getSettings().theme);
        toast("Demo data restored");
        render();
      });
    };
  }

  function bindGlobal() {
    document.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-nav]");
      if (nav) {
        showView(nav.dataset.nav);
        return;
      }
      const add = e.target.closest("[data-add]");
      if (add) {
        addToCart(add.dataset.add);
        return;
      }
      const qty = e.target.closest("[data-qty]");
      if (qty) {
        const line = MMP.cart.lineFor(qty.dataset.qty);
        const next = (line ? line.qty : 1) + Number(qty.dataset.delta);
        const res = MMP.cart.setQty(qty.dataset.qty, next);
        if (!res.ok) toast(res.errors[0], "error");
        renderPOS();
        return;
      }
      const rem = e.target.closest("[data-remove]");
      if (rem) {
        MMP.cart.remove(rem.dataset.remove);
        renderPOS();
        return;
      }
      const editP = e.target.closest("[data-edit-product]");
      if (editP) {
        productModal(MMP.products.getById(editP.dataset.editProduct));
        return;
      }
      const delP = e.target.closest("[data-del-product]");
      if (delP) {
        confirmAction("Delete this product?", () => {
          MMP.products.remove(delP.dataset.delProduct);
          toast("Product deleted");
          render();
        });
        return;
      }
      const editC = e.target.closest("[data-edit-cat]");
      if (editC) {
        categoryModal(MMP.products.getCategories().find((c) => c.id === editC.dataset.editCat));
        return;
      }
      const delC = e.target.closest("[data-del-cat]");
      if (delC) {
        confirmAction("Delete this category?", () => {
          const res = MMP.products.deleteCategory(delC.dataset.delCat);
          if (!res.ok) return toast(res.errors[0], "error");
          toast("Category deleted");
          render();
        });
        return;
      }
      const saleV = e.target.closest("[data-sale-view]");
      if (saleV) {
        saleDetail(MMP.sales.getById(saleV.dataset.saleView));
        return;
      }
      const editCu = e.target.closest("[data-edit-cust]");
      if (editCu) {
        customerModal(MMP.customers.getById(editCu.dataset.editCust));
        return;
      }
      const delCu = e.target.closest("[data-del-cust]");
      if (delCu) {
        confirmAction("Delete this customer?", () => {
          const res = MMP.customers.remove(delCu.dataset.delCust);
          if (!res.ok) return toast(res.errors[0], "error");
          toast("Customer deleted");
          render();
        });
        return;
      }
      const editS = e.target.closest("[data-edit-sup]");
      if (editS) {
        supplierModal(MMP.suppliers.getById(editS.dataset.editSup));
        return;
      }
      const delS = e.target.closest("[data-del-sup]");
      if (delS) {
        confirmAction("Delete this supplier?", () => {
          const res = MMP.suppliers.remove(delS.dataset.delSup);
          if (!res.ok) return toast(res.errors[0], "error");
          toast("Supplier deleted");
          render();
        });
      }
    });

    document.addEventListener("change", (e) => {
      if (e.target.id === "pos-customer") MMP.cart.setCustomer(e.target.value);
      if (e.target.id === "pos-pay") {
        MMP.cart.setPayment(e.target.value);
        renderPOS();
      }
      if (e.target.id === "pos-discount") {
        MMP.cart.setDiscountCents(MMP.storage.toCents(e.target.value));
        renderPOS();
      }
      if (e.target.id === "pos-received") {
        MMP.cart.setPayment("cash", MMP.storage.toCents(e.target.value));
        renderPOS();
      }
    });

    document.addEventListener("click", (e) => {
      if (e.target.id === "complete-sale") completeSale();
      if (e.target.id === "clear-cart") {
        confirmAction("Clear the current cart?", () => {
          MMP.cart.clear();
          renderPOS();
        });
      }
    });

    $("#menu-toggle").onclick = () => {
      $("#sidebar").classList.toggle("is-open");
      $("#overlay").classList.toggle("is-open");
    };
    $("#overlay").onclick = () => {
      $("#sidebar").classList.remove("is-open");
      $("#overlay").classList.remove("is-open");
    };
    $("#shortcut-toggle").onclick = () => $("#shortcuts").classList.toggle("open");
    $("#modal-backdrop").addEventListener("click", (e) => {
      if (e.target.id === "modal-backdrop") closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal();
        $("#shortcuts").classList.remove("open");
      }
      if (e.key === "F1") {
        e.preventDefault();
        showView("pos");
        setTimeout(() => {
          const el = $("#product-search");
          if (el) el.focus();
        }, 0);
      }
      if (e.key === "F2") {
        e.preventDefault();
        showView("pos");
        setTimeout(() => {
          const el = $("#barcode-input");
          if (el) el.focus();
        }, 0);
      }
      if (e.key === "F4") {
        e.preventDefault();
        completeSale();
      }
      if (e.key === "F8") {
        e.preventDefault();
        if (state.view === "pos") {
          confirmAction("Clear the current cart?", () => {
            MMP.cart.clear();
            renderPOS();
          });
        }
      }
    });
  }

  function tickClock() {
    $("#clock").textContent = new Date().toLocaleString();
  }

  function init() {
    MMP.storage.seedIfNeeded();
    MMP.settings.applyTheme(MMP.settings.getSettings().theme);
    bindGlobal();
    tickClock();
    setInterval(tickClock, 1000);
    showView("dashboard");
  }

  init();
})();
