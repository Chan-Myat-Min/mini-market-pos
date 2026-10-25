import { useEffect, useRef, useState } from "react";
import { AppProvider, useApp } from "./AppContext.jsx";
import * as storage from "./lib/storage.js";
import * as settings from "./lib/settings.js";
import * as sales from "./lib/sales.js";
import * as cart from "./lib/cart.js";
import { LABELS, NAV } from "./format.js";
import { Receipt } from "./components/Widgets.jsx";
import DashboardView from "./views/DashboardView.jsx";
import PosView from "./views/PosView.jsx";
import ProductsView from "./views/ProductsView.jsx";
import InventoryView from "./views/InventoryView.jsx";
import CategoriesView from "./views/CategoriesView.jsx";
import SalesView from "./views/SalesView.jsx";
import CustomersView from "./views/CustomersView.jsx";
import SuppliersView from "./views/SuppliersView.jsx";
import ReportsView from "./views/ReportsView.jsx";
import SettingsView from "./views/SettingsView.jsx";

function Shell() {
  const { refresh } = useApp();
  const [view, setView] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date().toLocaleString());
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);
  const searchRef = useRef(null);
  const barcodeRef = useRef(null);

  const store = settings.getSettings();

  useEffect(() => {
    storage.seedIfNeeded();
    settings.applyTheme(settings.getSettings().theme);
    refresh();
    const t = setInterval(() => setClock(new Date().toLocaleString()), 1000);
    return () => clearInterval(t);
  }, [refresh]);

  function toast(message, type) {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 2800);
  }

  function confirm(message, onYes) {
    setConfirmState({ message, onYes });
  }

  function go(name) {
    setView(name);
    setMenuOpen(false);
  }

  function completeSale() {
    const res = sales.completeSale();
    if (!res.ok) return toast(res.errors[0], "error");
    toast("Sale " + res.sale.receiptNo + " completed");
    refresh();
    setReceiptSale(res.sale);
  }

  function printReceipt(sale) {
    setReceiptSale(sale);
    setTimeout(() => window.print(), 50);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setConfirmState(null);
        setReceiptSale(null);
        setShortcutsOpen(false);
      }
      if (e.key === "F1") {
        e.preventDefault();
        go("pos");
        setTimeout(() => searchRef.current && searchRef.current.focus(), 0);
      }
      if (e.key === "F2") {
        e.preventDefault();
        go("pos");
        setTimeout(() => barcodeRef.current && barcodeRef.current.focus(), 0);
      }
      if (e.key === "F4") {
        e.preventDefault();
        completeSale();
      }
      if (e.key === "F8") {
        e.preventDefault();
        confirm("Clear the current cart?", () => {
          cart.clear();
          refresh();
        });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const shared = { toast, confirm, onPrint: printReceipt };

  return (
    <>
      <div className="app">
        <aside className={"sidebar" + (menuOpen ? " is-open" : "")}>
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              🛒
            </div>
            <div>
              <h1>{store.storeName}</h1>
              <p>Cashier workspace</p>
            </div>
          </div>
          <nav className="nav">
            {NAV.map((id) => (
              <button
                key={id}
                className={"nav-btn" + (view === id ? " is-active" : "")}
                type="button"
                onClick={() => go(id)}
              >
                {LABELS[id]}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            {store.cashierName} · {store.currency}
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <button className="menu-toggle" type="button" onClick={() => setMenuOpen((v) => !v)}>
              Menu
            </button>
            <strong>{LABELS[view]}</strong>
            <div className="clock">{clock}</div>
          </header>
          <main>
            {view === "dashboard" && <DashboardView onNavigate={go} onViewSale={setReceiptSale} />}
            {view === "pos" && (
              <PosView
                searchRef={searchRef}
                barcodeRef={barcodeRef}
                toast={toast}
                onComplete={completeSale}
                onClear={() =>
                  confirm("Clear the current cart?", () => {
                    cart.clear();
                    refresh();
                  })
                }
              />
            )}
            {view === "products" && <ProductsView {...shared} />}
            {view === "inventory" && <InventoryView toast={toast} />}
            {view === "categories" && <CategoriesView {...shared} />}
            {view === "sales" && <SalesView {...shared} />}
            {view === "customers" && <CustomersView {...shared} />}
            {view === "suppliers" && <SuppliersView {...shared} />}
            {view === "reports" && <ReportsView />}
            {view === "settings" && <SettingsView {...shared} />}
          </main>
        </div>
      </div>

      <div className={"overlay" + (menuOpen ? " is-open" : "")} onClick={() => setMenuOpen(false)} />
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={"toast" + (t.type === "error" ? " error" : "")}>
            {t.message}
          </div>
        ))}
      </div>

      {confirmState ? (
        <div className="modal-backdrop is-open" onClick={() => setConfirmState(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Please confirm</h3>
            <p>{confirmState.message}</p>
            <div className="toolbar">
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => {
                  const fn = confirmState.onYes;
                  setConfirmState(null);
                  fn();
                }}
              >
                Confirm
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setConfirmState(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {receiptSale ? (
        <div className="modal-backdrop is-open" onClick={() => setReceiptSale(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <Receipt sale={receiptSale} store={store} />
            <div className="toolbar no-print">
              <button className="btn btn-primary" type="button" onClick={() => window.print()}>
                Print receipt
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setReceiptSale(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={"shortcuts" + (shortcutsOpen ? " open" : "")}>
        <div className="shortcuts-panel">
          <strong>Keyboard shortcuts</strong>
          <p>
            <span className="k">F1</span> Product search
          </p>
          <p>
            <span className="k">F2</span> Barcode
          </p>
          <p>
            <span className="k">F4</span> Complete sale
          </p>
          <p>
            <span className="k">F8</span> Clear cart
          </p>
          <p>
            <span className="k">Esc</span> Close modal
          </p>
          <p>
            <span className="k">Enter</span> Add / search
          </p>
        </div>
        <button className="btn" type="button" onClick={() => setShortcutsOpen((v) => !v)}>
          Shortcuts
        </button>
      </div>

      <div id="print-root" hidden={!receiptSale}>
        {receiptSale ? <Receipt sale={receiptSale} store={store} /> : null}
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
