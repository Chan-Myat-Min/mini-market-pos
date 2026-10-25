import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import * as customers from "../lib/customers.js";
import { money, when } from "../format.js";
import { Field } from "../components/Widgets.jsx";

export default function CustomersView({ toast, confirm }) {
  const { refresh } = useApp();
  const [editing, setEditing] = useState(null);
  const list = customers.getCustomers();

  return (
    <section className="view is-active">
      <div className="page-head">
        <div>
          <h2>Customers</h2>
          <p>Walk-in is always available on the POS. Registered customers keep purchase totals.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => setEditing({})}>
          Add customer
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Total purchases</th>
              <th>Last purchase</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.name}
                  {c.walkIn ? " (walk-in)" : ""}
                </td>
                <td>{c.phone || "—"}</td>
                <td>{c.email || "—"}</td>
                <td>{c.address || "—"}</td>
                <td>{money(c.totalPurchasesCents || 0)}</td>
                <td>{c.lastPurchase ? when(c.lastPurchase) : "—"}</td>
                <td className="row-actions">
                  {c.walkIn ? null : (
                    <>
                      <button className="btn" type="button" onClick={() => setEditing(c)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        type="button"
                        onClick={() =>
                          confirm("Delete this customer?", () => {
                            const res = customers.remove(c.id);
                            if (!res.ok) return toast(res.errors[0], "error");
                            toast("Customer deleted");
                            refresh();
                          })
                        }
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing ? (
        <div className="modal-backdrop is-open" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal">
            <h3>{editing.id ? "Edit customer" : "Add customer"}</h3>
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target;
                const res = customers.upsert({
                  id: editing.id,
                  name: form.name.value,
                  phone: form.phone.value,
                  email: form.email.value,
                  address: form.address.value,
                });
                if (!res.ok) return toast(res.errors[0], "error");
                toast("Customer saved");
                refresh();
                setEditing(null);
              }}
            >
              <Field label="Name" name="name" defaultValue={editing.name || ""} required />
              <Field label="Phone" name="phone" defaultValue={editing.phone || ""} />
              <Field label="Email" name="email" defaultValue={editing.email || ""} />
              <div className="field full">
                <label>Address</label>
                <input className="input" name="address" defaultValue={editing.address || ""} />
              </div>
              <div className="toolbar full">
                <button className="btn btn-primary">Save</button>
                <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
