import { money, when, payLabel } from "../format.js";

export function Thumb({ product, className }) {
  if (product.image) {
    return (
      <div className={className}>
        <img alt="" src={product.image} />
      </div>
    );
  }
  return <div className={className}>{product.icon || "🛒"}</div>;
}

export function Kpi({ label, value, hint }) {
  return (
    <article className="card kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="hint">{hint}</div>
    </article>
  );
}

export function WeekChart({ days }) {
  const max = Math.max(...days.map((x) => x.cents), 1);
  return (
    <div className="chart">
      {days.map((x) => (
        <div
          key={x.label}
          className="chart-bar"
          style={{ height: Math.max(6, Math.round((x.cents / max) * 140)) }}
        >
          <span>{x.label}</span>
        </div>
      ))}
    </div>
  );
}

export function HBars({ rows, valueFn, labelFn, format }) {
  const max = Math.max(...rows.map(valueFn), 1);
  return (
    <div className="h-bars">
      {rows.map((row) => (
        <div className="h-bar" key={labelFn(row)}>
          <span>{labelFn(row)}</span>
          <div className="track">
            <div className="fill" style={{ width: Math.round((valueFn(row) / max) * 100) + "%" }} />
          </div>
          <span>{format(valueFn(row))}</span>
        </div>
      ))}
    </div>
  );
}

export function Field({ label, name, type = "text", defaultValue, required, min, step, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children || (
        <input
          className="input"
          name={name}
          type={type}
          defaultValue={defaultValue ?? ""}
          required={required}
          min={min}
          step={step}
        />
      )}
    </div>
  );
}

export function Receipt({ sale, store }) {
  return (
    <div className="receipt">
      <header className="receipt-header">
        <h4>{store.storeName}</h4>
        <div className="receipt-store-details">
          {store.address ? <div>{store.address}</div> : null}
          {store.phone ? <div>{store.phone}</div> : null}
        </div>
        <div className="receipt-title">SALE RECEIPT</div>
      </header>
      <div className="receipt-divider" />
      <div className="receipt-meta">
        <div><span>Receipt:</span><span>{sale.receiptNo}</span></div>
        <div><span>Date:</span><span>{when(sale.createdAt)}</span></div>
        <div><span>Cashier:</span><span>{sale.cashier}</span></div>
        <div><span>Customer:</span><span>{sale.customerName}</span></div>
      </div>
      <div className="receipt-divider" />
      <table className="receipt-items">
        <thead>
          <tr><th>Item</th><th>Total</th></tr>
        </thead>
        <tbody>
          {sale.items.map((i) => (
            <tr key={i.productId + i.name}>
              <td>
                <div className="receipt-item-name">{i.name}</div>
                <div className="receipt-item-detail">{i.qty} × {money(i.unitPriceCents)}</div>
              </td>
              <td className="receipt-item-total">{money(i.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="receipt-divider" />
      <div className="receipt-totals">
        <div><span>Subtotal</span><span>{money(sale.subtotalCents)}</span></div>
        {sale.discountCents > 0 ? <div><span>Discount</span><span>-{money(sale.discountCents)}</span></div> : null}
        {sale.taxCents > 0 ? <div><span>Tax</span><span>{money(sale.taxCents)}</span></div> : null}
        <div className="receipt-grand-total"><strong>Total Due</strong><strong>{money(sale.grandTotalCents)}</strong></div>
      </div>
      <div className="receipt-divider" />
      <div className="receipt-payment">
        <div><span>Payment</span><span>{payLabel(sale.paymentMethod)}</span></div>
        {sale.paymentMethod === "cash" ? <>
          <div><span>Received</span><span>{money(sale.amountReceivedCents)}</span></div>
          <div><span>Change</span><span>{money(sale.changeCents)}</span></div>
        </> : null}
      </div>
      {store.receiptFooter ? <footer className="receipt-footer">{store.receiptFooter}</footer> : null}
    </div>
  );
}

export function SalesTable({ sales, onView }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Receipt</th>
            <th>When</th>
            <th>Cashier</th>
            <th>Items</th>
            <th>Total</th>
            <th>Pay</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id}>
              <td>{s.receiptNo}</td>
              <td>{when(s.createdAt)}</td>
              <td>{s.cashier}</td>
              <td>{s.items.reduce((n, i) => n + i.qty, 0)}</td>
              <td>{money(s.grandTotalCents)}</td>
              <td>{payLabel(s.paymentMethod)}</td>
              <td>
                <span className={"badge " + (s.status === "refunded" ? "badge-refund" : "badge-done")}>
                  {s.status}
                </span>
              </td>
              <td className="row-actions">
                <button className="btn" type="button" onClick={() => onView(s)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
