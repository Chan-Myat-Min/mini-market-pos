import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import * as sales from "../lib/sales.js";
import { money, payLabel, when } from "../format.js";
import { SalesTable } from "../components/Widgets.jsx";

export default function SalesView({ toast, confirm, onPrint }) {
  const { refresh } = useApp();
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [payment, setPayment] = useState("");
  const [detail, setDetail] = useState(null);
  const list = sales.filterSales({ query, payment, from, to });

  return (
    <section className="view is-active">
      <div className="page-head">
        <div>
          <h2>Sales history</h2>
          <p>Search, reprint, or refund completed tickets.</p>
        </div>
      </div>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <input className="input" placeholder="Search receipt, cashier, items" value={query} style={{ maxWidth: 240 }} onChange={(e) => setQuery(e.target.value)} />
        <input className="input" type="date" value={from} style={{ maxWidth: 160 }} onChange={(e) => setFrom(e.target.value)} />
        <input className="input" type="date" value={to} style={{ maxWidth: 160 }} onChange={(e) => setTo(e.target.value)} />
        <select className="select" style={{ maxWidth: 180 }} value={payment} onChange={(e) => setPayment(e.target.value)}>
          <option value="">All payments</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="mobile">Mobile Payment</option>
        </select>
      </div>
      {list.length ? <SalesTable sales={list} onView={setDetail} /> : <div className="card empty">No matching transactions.</div>}
      {detail ? (
        <div className="modal-backdrop is-open" onClick={(e) => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal">
            <h3>{detail.receiptNo}</h3>
            <p>
              {when(detail.createdAt)} · {detail.cashier} · {detail.customerName}
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((i) => (
                    <tr key={i.productId + i.name}>
                      <td>{i.name}</td>
                      <td>{i.qty}</td>
                      <td>{money(i.lineTotalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Total {money(detail.grandTotalCents)} · {payLabel(detail.paymentMethod)} · {detail.status}
            </p>
            <div className="toolbar">
              <button className="btn btn-primary" type="button" onClick={() => onPrint(detail)}>
                Print receipt
              </button>
              {detail.status === "completed" ? (
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() =>
                    confirm("Refund this sale and restore stock?", () => {
                      const res = sales.refund(detail.id);
                      if (!res.ok) return toast(res.errors[0], "error");
                      toast("Sale refunded");
                      refresh();
                      setDetail(null);
                    })
                  }
                >
                  Refund / cancel
                </button>
              ) : null}
              <button className="btn btn-ghost" type="button" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
