import { useMemo, useState } from "react";
import { useApp } from "../AppContext.jsx";
import * as products from "../lib/products.js";
import * as inventory from "../lib/inventory.js";
import { Field } from "../components/Widgets.jsx";
import { when } from "../format.js";

export default function InventoryView({ toast }) {
  const { refresh, rev } = useApp();
  const [filter, setFilter] = useState("all");
  const [moveType, setMoveType] = useState(null);
  const catalog = useMemo(() => products.getProducts(), [rev]);
  const lowStock = useMemo(() => inventory.lowStock(), [rev]);
  const outOfStock = useMemo(() => inventory.outOfStock(), [rev]);
  const shown = filter === "low" ? lowStock : filter === "out" ? outOfStock : catalog;
  const hist = useMemo(() => inventory.history(), [rev]);

  return (
    <section className="view is-active">
      <div className="page-head">
        <div>
          <h2>Inventory</h2>
          <p>Stock-in, adjustments, and movement history. Sales reduce stock automatically.</p>
        </div>
        <div className="toolbar">
          <button className="btn btn-primary" type="button" onClick={() => setMoveType("in")}>
            Stock-in
          </button>
          <button className="btn" type="button" onClick={() => setMoveType("adjust")}>
            Adjust
          </button>
          <button className="btn" type="button" onClick={() => setMoveType("out")}>
            Stock-out
          </button>
        </div>
      </div>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <button className={"btn" + (filter === "all" ? " btn-primary" : "")} type="button" onClick={() => setFilter("all")}>
          All
        </button>
        <button className={"btn" + (filter === "low" ? " btn-primary" : "")} type="button" onClick={() => setFilter("low")}>
          Low stock ({lowStock.length})
        </button>
        <button className={"btn" + (filter === "out" ? " btn-primary" : "")} type="button" onClick={() => setFilter("out")}>
          Out of stock ({outOfStock.length})
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Min</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const st = products.stockStatus(p);
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>{p.stock}</td>
                  <td>{p.minStock}</td>
                  <td>
                    <span className={"badge badge-" + st}>{products.statusLabel(st)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <article className="card" style={{ marginTop: 14 }}>
        <h3>Inventory history</h3>
        {hist.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {hist.slice(0, 80).map((h) => (
                  <tr key={h.id}>
                    <td>{when(h.createdAt)}</td>
                    <td>{h.productName}</td>
                    <td>{h.type}</td>
                    <td>{h.qty}</td>
                    <td>{h.before}</td>
                    <td>{h.after}</td>
                    <td>{h.note || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No inventory movements yet.</div>
        )}
      </article>
      {moveType ? (
        <StockModal
          type={moveType}
          onClose={() => setMoveType(null)}
          toast={toast}
          onSaved={refresh}
        />
      ) : null}
    </section>
  );
}

function StockModal({ type, onClose, toast, onSaved }) {
  const catalog = products.getProducts();
  const title = type === "in" ? "Stock-in" : type === "out" ? "Stock-out" : "Stock adjustment";
  const qtyLabel = type === "adjust" ? "New stock quantity" : "Quantity";

  function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const res = inventory.move(form.productId.value, type, Number(form.qty.value), form.note.value);
    if (!res.ok) return toast(res.errors[0], "error");
    toast("Inventory updated");
    onSaved();
    onClose();
  }

  return (
    <div className="modal-backdrop is-open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>{title}</h3>
        <form onSubmit={onSubmit}>
          <Field label="Product">
            <select className="select" name="productId" required>
              {catalog.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (stock {p.stock})
                </option>
              ))}
            </select>
          </Field>
          <Field label={qtyLabel} name="qty" type="number" min="0" step="1" defaultValue={1} />
          <Field label="Note" name="note" />
          <div className="toolbar">
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
