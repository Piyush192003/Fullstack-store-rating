import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import api from "../utils/api";
import { blankStore, validateStoreForm } from "../utils/validateStoreForm";

export default function AdminEditStore() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(blankStore);
  const [ownerFallback, setOwnerFallback] = useState(null);
  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/admin/users").then((r) => setUsers(r.data.users)).catch(() => {});
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
    api.get(`/admin/stores/${id}`).then((r) => {
      const s = r.data.store;
      setForm({
        name: s.name || "",
        email: s.email || "",
        address: s.address || "",
        categoryId: s.categoryId ? String(s.categoryId) : "",
        priceLevel: s.priceLevel ? String(s.priceLevel) : "",
        phone: s.phone || "",
        openingHours: s.openingHours || "",
        description: s.description || "",
        ownerId: s.ownerId ? String(s.ownerId) : ""
      });
      if (s.ownerId && r.data.ownerName) setOwnerFallback({ id: String(s.ownerId), name: r.data.ownerName });
      setLoading(false);
    }).catch((e) => { setError(e.response?.data?.message || "Could not load the store."); setLoading(false); });
  }, [id]);

  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setErrors({ ...errors, [event.target.name]: undefined });
  };
  const ownerUsers = users.filter((u) => u.role === "owner");
  const ownerOptions = [...ownerUsers.map((u) => ({ id: String(u.id), name: u.name })), ...(ownerFallback && !ownerUsers.some((u) => String(u.id) === ownerFallback.id) ? [ownerFallback] : [])];

  const submit = async (event) => {
    event.preventDefault();
    setError(""); setMsg("");
    const fieldErrors = validateStoreForm(form);
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    setSubmitting(true);
    try {
      await api.put(`/admin/stores/${id}`, { ...form, ownerId: form.ownerId || undefined });
      setMsg("Store updated. Taking you back to the dashboard…");
      setTimeout(() => navigate("/admin/dashboard"), 1200);
    } catch (e) {
      setError(e.response?.data?.errors?.[0]?.msg || e.response?.data?.message || "Could not update the store.");
      setSubmitting(false);
    }
  };

  return <AppShell role="admin" active="overview" title="Edit store" subtitle="Update this store's details, category and assigned owner.">
    <section className="section">
      <div className="section-title"><div><h2>{loading ? "Loading…" : form.name}</h2><p className="muted">Changes are visible to customers and the store owner right away.</p></div><button className="secondary-btn" onClick={() => navigate("/admin/dashboard")}>Back to dashboard</button></div>
      {msg && <p className="notice success">{msg}</p>}
      {error && <p className="notice error">{error}</p>}
      {!loading && <form onSubmit={submit} className="grid-form">
        <label className="field">Store name *<input name="name" value={form.name} onChange={update} maxLength="120" />{errors.name && <span className="field-error">{errors.name}</span>}</label>
        <label className="field">Category<select name="categoryId" value={form.categoryId} onChange={update}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="field">Price level<select name="priceLevel" value={form.priceLevel} onChange={update}><option value="">Not set</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{"$".repeat(n)}</option>)}</select>{errors.priceLevel && <span className="field-error">{errors.priceLevel}</span>}</label>
        <label className="field">Address<input name="address" value={form.address} onChange={update} />{errors.address && <span className="field-error">{errors.address}</span>}</label>
        <label className="field">Phone<input name="phone" value={form.phone} onChange={update} placeholder="e.g. +91 98765 43210" />{errors.phone && <span className="field-error">{errors.phone}</span>}</label>
        <label className="field">Contact email<input name="email" type="email" value={form.email} onChange={update} />{errors.email && <span className="field-error">{errors.email}</span>}</label>
        <label className="field">Opening hours<input name="openingHours" value={form.openingHours} onChange={update} placeholder="e.g. Mon-Sat 9am-6pm" />{errors.openingHours && <span className="field-error">{errors.openingHours}</span>}</label>
        <label className="field">Owner <span className="muted">(optional)</span><select name="ownerId" value={form.ownerId} onChange={update}><option value="">No owner</option>{ownerOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>Description<textarea className="field-text" rows="3" name="description" value={form.description} onChange={update} /></label>
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12 }}>
          <button type="button" className="secondary-btn" onClick={() => navigate("/admin/dashboard")}>Cancel</button>
          <button className="primary-btn" disabled={submitting}>{submitting ? "Saving…" : "Save changes"}</button>
        </div>
      </form>}
    </section>
  </AppShell>;
}
