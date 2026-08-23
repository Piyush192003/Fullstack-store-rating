import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import api from "../utils/api";
import { blankStore, validateStoreForm } from "../utils/validateStoreForm";

export default function AdminAddStore() {
  const navigate = useNavigate();
  const [form, setForm] = useState(blankStore);
  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/admin/users").then((r) => setUsers(r.data.users)).catch(() => {});
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setErrors({ ...errors, [event.target.name]: undefined });
  };
  const ownerUsers = users.filter((u) => u.role === "owner");

  const submit = async (event) => {
    event.preventDefault();
    setError(""); setMsg("");
    const fieldErrors = validateStoreForm(form);
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    setSubmitting(true);
    try {
      await api.post("/admin/add-store", { ...form, ownerId: form.ownerId || undefined });
      setMsg("Store created successfully. Taking you back to the dashboard…");
      setTimeout(() => navigate("/admin/dashboard"), 1200);
    } catch (e) {
      setError(e.response?.data?.errors?.[0]?.msg || e.response?.data?.message || "Could not create the store.");
      setSubmitting(false);
    }
  };

  return <AppShell role="admin" active="overview" title="Add a new store" subtitle="Create a store listing that owners can manage and customers can rate.">
    <section className="section">
      <div className="section-title"><div><h2>Store details</h2><p className="muted">Only the store name is required — everything else can be added later.</p></div><button className="secondary-btn" onClick={() => navigate("/admin/dashboard")}>Back to dashboard</button></div>
      {msg && <p className="notice success">{msg}</p>}
      {error && <p className="notice error">{error}</p>}
      <form onSubmit={submit} className="grid-form">
        <label className="field">Store name *<input name="name" value={form.name} onChange={update} maxLength="120" placeholder="e.g. Northside Roasters" />{errors.name && <span className="field-error">{errors.name}</span>}</label>
        <label className="field">Category<select name="categoryId" value={form.categoryId} onChange={update}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="field">Price level<select name="priceLevel" value={form.priceLevel} onChange={update}><option value="">Not set</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{"$".repeat(n)}</option>)}</select>{errors.priceLevel && <span className="field-error">{errors.priceLevel}</span>}</label>
        <label className="field">Address<input name="address" value={form.address} onChange={update} />{errors.address && <span className="field-error">{errors.address}</span>}</label>
        <label className="field">Phone<input name="phone" value={form.phone} onChange={update} placeholder="e.g. +91 98765 43210" />{errors.phone && <span className="field-error">{errors.phone}</span>}</label>
        <label className="field">Contact email<input name="email" type="email" value={form.email} onChange={update} />{errors.email && <span className="field-error">{errors.email}</span>}</label>
        <label className="field">Opening hours<input name="openingHours" value={form.openingHours} onChange={update} placeholder="e.g. Mon-Sat 9am-6pm" />{errors.openingHours && <span className="field-error">{errors.openingHours}</span>}</label>
        <label className="field">Owner <span className="muted">(optional)</span><select name="ownerId" value={form.ownerId} onChange={update}><option value="">No owner</option>{ownerUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>Description<textarea className="field-text" rows="3" name="description" value={form.description} onChange={update} /></label>
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12 }}>
          <button type="button" className="secondary-btn" onClick={() => navigate("/admin/dashboard")}>Cancel</button>
          <button className="primary-btn" disabled={submitting}>{submitting ? "Creating…" : "Create store"}</button>
        </div>
      </form>
    </section>
  </AppShell>;
}

