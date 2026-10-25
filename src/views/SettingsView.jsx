import { useApp } from "../AppContext.jsx";
import * as settings from "../lib/settings.js";
import * as storage from "../lib/storage.js";
import { Field } from "../components/Widgets.jsx";

export default function SettingsView({ toast, confirm }) {
  const { rev, refresh, language, setLanguage } = useApp();
  const s = settings.getSettings();

  return (
    <section className="view is-active">
      <div className="page-head">
        <div>
          <h2>Settings</h2>
          <p>Store identity, tax, currency, and theme. Saved in LocalStorage.</p>
        </div>
      </div>
      <div className="card form-grid" style={{ marginBottom: 16 }}>
        <Field label="Language">
          <select
            className="select"
            name="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="ja">Japanese Language</option>
            <option value="my">Myanmar Language</option>
          </select>
        </Field>
      </div>
      <form
        key={rev}
        className="card form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const f = e.target;
          settings.saveSettings({
            storeName: f.storeName.value,
            address: f.address.value,
            phone: f.phone.value,
            cashierName: f.cashierName.value,
            taxPercent: Number(f.taxPercent.value),
            currency: f.currency.value,
            currencySymbol: f.currencySymbol.value,
            lowStockThreshold: Number(f.lowStockThreshold.value),
            theme: f.theme.value,
            receiptFooter: f.receiptFooter.value,
          });
          toast("Settings saved");
          refresh();
        }}
      >
        <Field label="Store name" name="storeName" defaultValue={s.storeName} required />
        <Field label="Address" name="address" defaultValue={s.address} />
        <Field label="Phone" name="phone" defaultValue={s.phone} />
        <Field label="Default cashier" name="cashierName" defaultValue={s.cashierName} />
        <Field label="Tax %" name="taxPercent" type="number" min="0" step="0.01" defaultValue={s.taxPercent} />
        <Field label="Currency code" name="currency" defaultValue={s.currency} />
        <Field label="Currency symbol" name="currencySymbol" defaultValue={s.currencySymbol} />
        <Field label="Default low-stock threshold" name="lowStockThreshold" type="number" min="0" step="1" defaultValue={s.lowStockThreshold} />
        <Field label="Theme">
          <select className="select" name="theme" defaultValue={s.theme}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
        <div className="field full">
          <label>Receipt footer</label>
          <textarea className="textarea" name="receiptFooter" defaultValue={s.receiptFooter} />
        </div>
        <div className="toolbar full">
          <button className="btn btn-primary">Save settings</button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={() =>
              confirm("Erase all local POS data and restore the demo catalog?", () => {
                storage.resetAllData();
                settings.applyTheme(settings.getSettings().theme);
                toast("Demo data restored");
                refresh();
              })
            }
          >
            Reset demo data
          </button>
        </div>
      </form>
    </section>
  );
}
