import { useMemo } from "react";
import { useApp } from "../AppContext.jsx";
import * as reports from "../lib/reports.js";
import * as inventory from "../lib/inventory.js";
import { money, payLabel } from "../format.js";
import { HBars, Kpi, WeekChart } from "../components/Widgets.jsx";

export default function ReportsView() {
  const { rev } = useApp();
  const p = useMemo(() => reports.periodStats(), [rev]);
  const best = useMemo(() => reports.bestSellers(8), [rev]);
  const cats = useMemo(() => reports.salesByCategory(), [rev]);
  const pays = useMemo(() => reports.salesByPayment(), [rev]);
  const week = useMemo(() => reports.last7Days(), [rev]);
  const low = useMemo(() => inventory.lowStock(), [rev]);

  return (
    <section className="view is-active">
      <div className="page-head">
        <div>
          <h2>Reports</h2>
          <p>Built from local sales — no hardcoded numbers.</p>
        </div>
      </div>
      <div className="cards">
        <Kpi label="Today" value={money(p.todayCents)} hint={p.todayCount + " sales"} />
        <Kpi label="This week" value={money(p.weekCents)} hint={p.weekCount + " sales"} />
        <Kpi label="This month" value={money(p.monthCents)} hint={p.monthCount + " sales"} />
        <Kpi label="All transactions" value={String(p.transactions)} hint={"Profit " + money(p.monthProfitCents) + " this month"} />
      </div>
      <div className="grid-2" style={{ marginTop: 14 }}>
        <article className="card">
          <h3>Weekly sales</h3>
          <WeekChart days={week} />
        </article>
        <article className="card">
          <h3>Payment methods</h3>
          <HBars rows={pays} valueFn={(r) => r.cents} labelFn={(r) => payLabel(r.name)} format={money} />
        </article>
      </div>
      <div className="grid-2">
        <article className="card">
          <h3>Best sellers</h3>
          {best.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {best.map((b) => (
                    <tr key={b.productId}>
                      <td>{b.name}</td>
                      <td>{b.qty}</td>
                      <td>{money(b.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No sales yet.</div>
          )}
        </article>
        <article className="card">
          <h3>Sales by category</h3>
          {cats.length ? (
            <HBars rows={cats} valueFn={(r) => r.cents} labelFn={(r) => r.name} format={money} />
          ) : (
            <div className="empty">No category sales yet.</div>
          )}
        </article>
      </div>
      <article className="card" style={{ marginTop: 14 }}>
        <h3>Low stock</h3>
        <p>{low.length ? low.map((x) => x.name + " (" + x.stock + ")").join(", ") : "None."}</p>
        <p>
          Estimated profit today: <strong>{money(p.todayProfitCents)}</strong>
        </p>
      </article>
    </section>
  );
}
