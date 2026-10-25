import { useState } from "react";
import { useApp } from "../AppContext.jsx";
import * as products from "../lib/products.js";
import { Field } from "../components/Widgets.jsx";

export default function CategoriesView({ toast, confirm }) {
  const { refresh } = useApp();
  const [editing, setEditing] = useState(null);
  const cats = products.getCategories();

  return (
    <section className="view is-active">
      <div className="page-head">
        <div>
          <h2>Categories</h2>
          <p>Organize the catalog used on the POS grid.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => setEditing({})}>
          Add category
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Products</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{products.countByCategory(c.id)}</td>
                <td className="row-actions">
                  <button className="btn" type="button" onClick={() => setEditing(c)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() =>
                      confirm("Delete this category?", () => {
                        const res = products.deleteCategory(c.id);
                        if (!res.ok) return toast(res.errors[0], "error");
                        toast("Category deleted");
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
            <h3>{editing.id ? "Edit category" : "Add category"}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = products.saveCategory({ id: editing.id, name: e.target.name.value });
                if (!res.ok) return toast(res.errors[0], "error");
                toast("Category saved");
                refresh();
                setEditing(null);
              }}
            >
              <Field label="Name" name="name" defaultValue={editing.name || ""} required />
              <div className="toolbar">
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
