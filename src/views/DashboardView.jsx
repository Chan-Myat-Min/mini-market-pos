import { useMemo } from "react";
import { useApp } from "../AppContext.jsx";
import * as reports from "../lib/reports.js";
import { money } from "../format.js";
import { Kpi, WeekChart, SalesTable } from "../components/Widgets.jsx";

export default function DashboardView({ onNavigate, onViewSale }) {
  const { rev } = useApp();
  const d = useMemo(() => reports.dashboard(), [rev]);
  const week = useMemo(() => reports.last7Days(), [rev]);

  return (
    <section className="view is-active">
      <div className="page-head">
        <div>
          <h2>Today at a glance</h2>
          <p>Live totals from completed sales stored on this device.</p>
        </div>
        <div className="toolbar">
          <button className="btn btn-primary" type="button" onClick={() => onNavigate("pos")}>
            Open POS
          </button>
          <button className="btn" type="button" onClick={() => onNavigate("reports")}>
            Reports
          </button>
        </div>
      </div>
      <div className="cards">
        <Kpi label="Today's sales" value={money(d.todaySalesCents)} hint={d.todayTransactions + " transactions"} />
        <Kpi label="Transactions" value={String(d.todayTransactions)} hint="Completed today" />
        <Kpi label="Products" value={String(d.productCount)} hint={d.lowStock.length + " low stock"} />
        <Kpi label="Profit estimate" value={money(d.todayProfitCents)} hint="After discounts, before overhead" />
      </div>
      <div className="grid-2">
        <article className="card">
          <h3>Last 7 days</h3>
          <WeekChart days={week} />
        </article>
        <article className="card">
          <h3>Stock alerts</h3>
          <p>
            {d.outOfStock.length
              ? "Out of stock: " + d.outOfStock.map((p) => p.name).join(", ")
              : "No out-of-stock items."}
          </p>
          <p>
            {d.lowStock.length ? "Low stock: " + d.lowStock.map((p) => p.name).join(", ") : "No low-stock items."}
          </p>
        </article>
      </div>
      <article className="card" style={{ marginTop: 14 }}>
        <h3>Recent transactions</h3>
        {d.recent.length ? (
          <SalesTable sales={d.recent} onView={onViewSale} />
        ) : (
          <div className="empty">No sales yet. Complete a checkout to see activity here.</div>
        )}
      </article>
    </section>
  );
}
