import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import * as suppliers from "../lib/suppliers.js";
import { Field } from "../components/Widgets.jsx";

export default function SuppliersView({ toast, confirm }) {
  const { refresh } = useApp();
  const [editing, setEditing] = useState(null);
  const list = suppliers.getSuppliers();

  return (
    <section className="view is-active">
      <div className="page-head">
        <div>
          <h2>Suppliers</h2>
          <p>Link products to the vendor that supplies them.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => setEditing({})}>
          Add supplier
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Products</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.contactPerson || "—"}</td>
                <td>{s.phone || "—"}</td>
                <td>{s.email || "—"}</td>
                <td>{s.address || "—"}</td>
                <td>{suppliers.productsFor(s.id).length}</td>
                <td className="row-actions">
                  <button className="btn" type="button" onClick={() => setEditing(s)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() =>
                      confirm("Delete this supplier?", () => {
                        const res = suppliers.remove(s.id);
                        if (!res.ok) return toast(res.errors[0], "error");
                        toast("Supplier deleted");
                        refresh();
                      })
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing ? (
        <div className="modal-backdrop is-open" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal">
            <h3>{editing.id ? "Edit supplier" : "Add supplier"}</h3>
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target;
                const res = suppliers.upsert({
                  id: editing.id,
                  name: form.name.value,
                  contactPerson: form.contactPerson.value,
                  phone: form.phone.value,
                  email: form.email.value,
                  address: form.address.value,
                });
                if (!res.ok) return toast(res.errors[0], "error");
                toast("Supplier saved");
                refresh();
                setEditing(null);
              }}
            >
              <Field label="Supplier name" name="name" defaultValue={editing.name || ""} required />
              <Field label="Contact person" name="contactPerson" defaultValue={editing.contactPerson || ""} />
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
