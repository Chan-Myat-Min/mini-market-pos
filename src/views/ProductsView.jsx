import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import * as products from "../lib/products.js";
import * as storage from "../lib/storage.js";
import * as settings from "../lib/settings.js";
import * as suppliers from "../lib/suppliers.js";
import { money } from "../format.js";
import { Field, Thumb } from "../components/Widgets.jsx";

export default function ProductsView({ toast, confirm }) {
  const { refresh } = useApp();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [editing, setEditing] = useState(null);
  const [showSellingCost, setShowSellingCost] = useState(() => settings.getSettings().showSellingCost !== false);

  const list = products.sortProducts(products.search(query, categoryId), sortKey);
  const cats = products.getCategories();

  function toggleSellingCost() {
    const next = !showSellingCost;
    setShowSellingCost(next);
    settings.saveSettings({ showSellingCost: next });
  }

  return (
    <section className="view is-active">
      <div className="page-head">
        <div>
          <h2>Products</h2>
          <p>Catalog, pricing, and stock status.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => setEditing({})}>
          Add product
        </button>
      </div>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <input className="input" placeholder="Search products" value={query} style={{ maxWidth: 240 }} onChange={(e) => setQuery(e.target.value)} />
        <select className="select" style={{ maxWidth: 180 }} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="select" style={{ maxWidth: 160 }} value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          <option value="name">Name</option>
          <option value="sku">SKU</option>
          <option value="price">Price</option>
          <option value="stock">Stock</option>
        </select>
        <button className="btn" type="button" onClick={toggleSellingCost} aria-pressed={!showSellingCost}>
          {showSellingCost ? "Hide selling & cost" : "Show selling & cost"}
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <span className="th-with-action">
                  Product
                  <button
                    className="btn btn-ghost btn-compact"
                    type="button"
                    onClick={toggleSellingCost}
                    title={showSellingCost ? "Hide selling and cost" : "Show selling and cost"}
                    aria-label={showSellingCost ? "Hide selling and cost" : "Show selling and cost"}
                  >
                    {showSellingCost ? "Hide" : "Show"}
                  </button>
                </span>
              </th>
              <th>Brand</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Selling</th>
              <th>Cost</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length ? (
              list.map((p) => {
                const st = products.stockStatus(p);
                return (
                  <tr key={p.id}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <Thumb product={p} className="thumb-sm" />
                        {p.name}
                      </span>
                    </td>
                    <td>{p.brand || "—"}</td>
                    <td>{p.sku}</td>
                    <td>{products.categoryName(p.categoryId)}</td>
                    <td>{showSellingCost ? money(p.sellingPriceCents) : "••••"}</td>
                    <td>{showSellingCost ? money(p.costPriceCents) : "••••"}</td>
                    <td>{p.stock}</td>
                    <td>
                      <span className={"badge badge-" + st}>{products.statusLabel(st)}</span>
                    </td>
                    <td className="row-actions">
                      <button className="btn" type="button" onClick={() => setEditing(p)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        type="button"
                        onClick={() =>
                          confirm("Delete this product?", () => {
                            products.remove(p.id);
                            toast("Product deleted");
                            refresh();
                          })
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9">
                  <div className="empty">No products found.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editing ? (
        <ProductForm
          product={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          toast={toast}
          onSaved={refresh}
        />
      ) : null}
    </section>
  );
}

function ProductForm({ product, onClose, toast, onSaved }) {
  const p = product || {
    name: "",
    brand: "",
    sku: "",
    barcode: "",
    categoryId: "",
    unit: "pc",
    sellingPriceCents: 0,
    costPriceCents: 0,
    stock: 0,
    minStock: settings.getSettings().lowStockThreshold,
    supplierId: "",
    expiryDate: "",
    icon: "🛒",
    image: "",
  };
  const cats = products.getCategories();
  const sups = suppliers.getSuppliers();
  const [image, setImage] = useState(p.image || "");

  function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const sell = storage.toCents(form.selling.value);
    const cost = storage.toCents(form.cost.value);
    const stock = Number(form.stock.value);
    if (sell < 0 || cost < 0) return toast("Prices cannot be negative.", "error");
    if (stock < 0) return toast("Stock cannot be negative.", "error");
    const res = products.upsert({
      id: product && product.id,
      createdAt: product && product.createdAt,
      name: form.name.value,
      brand: form.brand.value,
      sku: form.sku.value,
      barcode: form.barcode.value,
      categoryId: form.categoryId.value,
      unit: form.unit.value,
      sellingPriceCents: sell,
      costPriceCents: cost,
      stock,
      minStock: Number(form.minStock.value) || 0,
      supplierId: form.supplierId.value,
      expiryDate: form.expiryDate.value,
      icon: form.icon.value || "🛒",
      image,
    });
    if (!res.ok) return toast(res.errors[0], "error");
    toast("Product saved");
    onSaved();
    onClose();
  }

  return (
    <div className="modal-backdrop is-open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog">
        <h3>{product ? "Edit product" : "Add product"}</h3>
        <form className="form-grid" onSubmit={onSubmit}>
          <Field label="Product name" name="name" defaultValue={p.name} required />
          <Field label="Brand" name="brand" defaultValue={p.brand || ""} />
          <Field label="SKU" name="sku" defaultValue={p.sku} />
          <Field label="Barcode" name="barcode" defaultValue={p.barcode} />
          <Field label="Category">
            <select className="select" name="categoryId" defaultValue={p.categoryId}>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unit" name="unit" defaultValue={p.unit} />
          <Field label="Selling price" name="selling" type="number" min="0" step="0.01" defaultValue={storage.fromCents(p.sellingPriceCents)} />
          <Field label="Cost price" name="cost" type="number" min="0" step="0.01" defaultValue={storage.fromCents(p.costPriceCents)} />
          <Field label="Stock" name="stock" type="number" min="0" step="1" defaultValue={p.stock} />
          <Field label="Min stock" name="minStock" type="number" min="0" step="1" defaultValue={p.minStock} />
          <Field label="Supplier">
            <select className="select" name="supplierId" defaultValue={p.supplierId}>
              <option value="">None</option>
              {sups.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Expiry date" name="expiryDate" type="date" defaultValue={p.expiryDate} />
          <Field label="Icon / emoji" name="icon" defaultValue={p.icon} />
          <div className="field full">
            <label>Product image</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setImage(reader.result);
                reader.readAsDataURL(file);
              }}
            />
          </div>
          <div className="toolbar full">
            <button className="btn btn-primary" type="submit">
              Save
            </button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
