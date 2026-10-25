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
      <h4>{store.storeName}</h4>
      <p>
        {store.address}
        <br />
        {store.phone}
      </p>
      <p>
        Receipt {sale.receiptNo}
        <br />
        {when(sale.createdAt)}
        <br />
        Cashier: {sale.cashier}
        <br />
        Customer: {sale.customerName}
      </p>
      <table>
        <tbody>
          {sale.items.map((i) => (
            <tr key={i.productId + i.name}>
              <td>
                {i.name}
                <br />
                {i.qty} × {money(i.unitPriceCents)}
              </td>
              <td style={{ textAlign: "right" }}>{money(i.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Subtotal {money(sale.subtotalCents)}
        <br />
        Discount {money(sale.discountCents)}
        <br />
        Tax {money(sale.taxCents)}
        <br />
        <strong>Total {money(sale.grandTotalCents)}</strong>
        <br />
        {payLabel(sale.paymentMethod)}
        <br />
        Received {money(sale.amountReceivedCents)}
        <br />
        Change {money(sale.changeCents)}
        <br />
        Status: {sale.status}
      </p>
      <p>{store.receiptFooter}</p>
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
