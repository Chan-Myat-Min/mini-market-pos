import { useMemo, useRef, useState } from "react";
import { useApp } from "../AppContext.jsx";
import * as products from "../lib/products.js";
import * as cart from "../lib/cart.js";
import * as customers from "../lib/customers.js";
import * as settings from "../lib/settings.js";
import * as storage from "../lib/storage.js";
import { money } from "../format.js";
import { Thumb } from "../components/Widgets.jsx";

export default function PosView({ searchRef, barcodeRef, onComplete, onClear, toast }) {
  const { rev, refresh } = useApp();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const barcode = useRef(null);

  const catalog = useMemo(
    () => products.sortProducts(products.search(query, categoryId), "name"),
    [query, categoryId, rev]
  );
  const t = cart.totals();
  const open = cart.getCart();
  const cats = products.getCategories();
  const people = useMemo(() => customers.getCustomers(), [rev]);
  const selectedCustomerId = open.customerId || people.find((c) => c.walkIn)?.id || "";
  const selectedCustomer = people.find((c) => c.id === selectedCustomerId);
  const matchingPeople = useMemo(() => {
    const search = customerSearch.trim().toLocaleLowerCase();
    if (!search) return people;
    return people.filter((c) => `${c.name} ${c.phone || ""}`.toLocaleLowerCase().includes(search));
  }, [people, customerSearch]);
  const visiblePeople = selectedCustomer && !matchingPeople.some((c) => c.id === selectedCustomer.id)
    ? [selectedCustomer, ...matchingPeople]
    : matchingPeople;
  const store = settings.getSettings();
  const cash = t.paymentMethod === "cash";

  function addProduct(id) {
    const res = cart.add(id, 1);
    if (!res.ok) return toast(res.errors[0], "error");
    toast("Added to cart");
    refresh();
  }

  function scan(code) {
    const p = products.findByCode(code);
    if (!p) return toast("Barcode not found: " + code, "error");
    addProduct(p.id);
  }

  function addByQuery(value) {
    const exact = products.findByCode(value);
    if (exact) return addProduct(exact.id);
    const list = products.search(value, categoryId);
    if (list.length === 1) return addProduct(list[0].id);
    setQuery(value);
    if (!list.length) toast("No product found.", "error");
  }

  function createCustomer(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const result = customers.upsert({
      name: form.customerName.value,
      phone: form.customerPhone.value,
    });
    if (!result.ok) return toast(result.errors[0], "error");
    cart.setCustomer(result.customer.id);
    setShowNewCustomer(false);
    setCustomerSearch("");
    toast("Customer saved");
    refresh();
  }

  return (
    <section className="view is-active">
      <div className="page-head">
        <div>
          <h2>Checkout</h2>
          <p>Search, scan, or tap products. F1 search · F2 barcode · F4 complete sale.</p>
        </div>
      </div>
      <div className="pos">
        <div>
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <input
              ref={searchRef}
              className="input"
              placeholder="Search name, SKU, or barcode"
              value={query}
              style={{ maxWidth: 280 }}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addByQuery(query);
                }
              }}
            />
            <input
              ref={(el) => {
                barcode.current = el;
                if (barcodeRef) barcodeRef.current = el;
              }}
              className="input"
              placeholder="Scan or type barcode"
              style={{ maxWidth: 220 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  scan(e.target.value);
                  e.target.value = "";
                }
              }}
            />
            <select
              className="select"
              style={{ maxWidth: 180 }}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">All categories</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {catalog.length ? (
            <div className="product-grid">
              {catalog.map((p) => {
                const st = products.stockStatus(p);
                return (
                  <article className="product-card" key={p.id}>
                    <Thumb product={p} className="thumb" />
                    <h3>{p.name}</h3>
                    <div className="sku">
                      {p.sku} · {p.barcode || "no barcode"}
                    </div>
                    <div className="price">{money(p.sellingPriceCents)}</div>
                    <div>
                      <span className={"badge badge-" + st}>
                        {products.statusLabel(st)} · {p.stock}
                      </span>
                    </div>
                    <button className="btn btn-primary" type="button" disabled={p.stock <= 0} onClick={() => addProduct(p.id)}>
                      Add to cart
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="card empty">No matching products.</div>
          )}
        </div>
        <aside className="cart-panel">
          <h3>Current cart</h3>
          <label className="field">
            Customer
            <input
              className="input customer-search"
              type="search"
              placeholder="Search customer names or phone"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <select
              className="select"
              value={selectedCustomerId}
              onChange={(e) => {
                if (e.target.value === "__new_customer__") {
                  setShowNewCustomer(true);
                  return;
                }
                setShowNewCustomer(false);
                cart.setCustomer(e.target.value);
                setCustomerSearch("");
                refresh();
              }}
            >
              {visiblePeople.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` · ${c.phone}` : c.walkIn ? " (walk-in)" : ""}
                </option>
              ))}
              <option value="__new_customer__">+ Add new customer</option>
            </select>
          </label>
          {showNewCustomer ? (
            <form className="card form-grid checkout-customer-form" onSubmit={createCustomer}>
              <h4 className="full">New customer</h4>
              <label className="field full">
                Customer name
                <input className="input" name="customerName" autoFocus required />
              </label>
              <label className="field full">
                Phone number
                <input className="input" name="customerPhone" type="tel" required />
              </label>
              <div className="toolbar full">
                <button className="btn btn-primary" type="submit">Save customer</button>
                <button className="btn btn-ghost" type="button" onClick={() => setShowNewCustomer(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
          {t.items.length ? (
            t.items.map((i) => (
              <div className="cart-item" key={i.productId}>
                <div>
                  <strong>{i.name}</strong>
                  <div className="sku">
                    {money(i.unitPriceCents)} × {i.qty}
                  </div>
                </div>
                <div>
                  <div className="qty-row">
                    <button
                      type="button"
                      onClick={() => {
                        const res = cart.setQty(i.productId, i.qty - 1);
                        if (!res.ok) toast(res.errors[0], "error");
                        refresh();
                      }}
                    >
                      −
                    </button>
                    <strong>{i.qty}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        const res = cart.setQty(i.productId, i.qty + 1);
                        if (!res.ok) toast(res.errors[0], "error");
                        refresh();
                      }}
                    >
                      +
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => {
                        cart.remove(i.productId);
                        refresh();
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div>{money(i.lineTotalCents)}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">Cart is empty</div>
          )}
          <div className="totals">
            <div className="totals-row">
              <span>Subtotal</span>
              <span>{money(t.subtotalCents)}</span>
            </div>
            <label className="field">
              Discount ({store.currencySymbol})
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                defaultValue={storage.fromCents(open.discountCents)}
                key={"disc-" + open.discountCents}
                onBlur={(e) => {
                  cart.setDiscountCents(storage.toCents(e.target.value));
                  refresh();
                }}
              />
            </label>
            <div className="totals-row">
              <span>Discount</span>
              <span>− {money(t.discountCents)}</span>
            </div>
            <div className="totals-row">
              <span>Tax ({store.taxPercent}%)</span>
              <span>{money(t.taxCents)}</span>
            </div>
            <div className="totals-row grand">
              <span>Total</span>
              <span>{money(t.grandTotalCents)}</span>
            </div>
          </div>
          <label className="field">
            Payment method
            <select
              className="select"
              value={t.paymentMethod}
              onChange={(e) => {
                cart.setPayment(e.target.value);
                refresh();
              }}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile">Mobile Payment</option>
            </select>
          </label>
          {cash ? (
            <>
              <label className="field">
                Amount received
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={open.amountReceivedCents ? storage.fromCents(open.amountReceivedCents) : ""}
                  key={"recv-" + open.amountReceivedCents}
                  onBlur={(e) => {
                    cart.setPayment("cash", storage.toCents(e.target.value));
                    refresh();
                  }}
                />
              </label>
              <div className={"totals-row " + (t.changeCents >= 0 ? "change-ok" : "change-bad")}>
                <span>Change</span>
                <span>{money(t.changeCents)}</span>
              </div>
            </>
          ) : (
            <p>Card / mobile charges the exact total.</p>
          )}
          <div className="toolbar" style={{ marginTop: 12, flexDirection: "column" }}>
            <button className="btn btn-accent btn-lg btn-block" type="button" onClick={onComplete}>
              Complete sale
            </button>
            <button className="btn btn-ghost btn-block" type="button" onClick={onClear}>
              Clear cart
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
