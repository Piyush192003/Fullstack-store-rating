import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../utils/api";

const ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");
const blankReg = { name: "", address: "", categoryId: "", phone: "", openingHours: "", priceLevel: "", description: "" };

export default function OwnerWorkspace() {
  const [data, setData] = useState(null); const [categories, setCategories] = useState([]);
  const [noStore, setNoStore] = useState(false); const [unclaimed, setUnclaimed] = useState([]);
  const [msg, setMsg] = useState(""); const [error, setError] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false); const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", email: "", phone: "", openingHours: "", priceLevel: "", description: "", categoryId: "" });
  const [regForm, setRegForm] = useState(blankReg);

  const load = async () => { try { const response = await api.get("/owner/ratings"); setData(response.data); setNoStore(false); setForm({ name: response.data.store.name || "", address: response.data.store.address || "", email: response.data.store.email || "", phone: response.data.store.phone || "", openingHours: response.data.store.openingHours || "", priceLevel: response.data.store.priceLevel ? String(response.data.store.priceLevel) : "", description: response.data.store.description || "", categoryId: response.data.store.categoryId ? String(response.data.store.categoryId) : "" }); } catch (e) { if (e.response?.status === 404) { setData(null); setNoStore(true); api.get("/owner/unclaimed").then((r) => setUnclaimed(r.data)).catch(() => {}); } else { setMsg(e.response?.data?.message || "Could not load your store."); } } };
  useEffect(() => { api.get("/categories").then((r) => setCategories(r.data)).catch(() => {}); load(); }, []);

  const saveStore = async (event) => { event.preventDefault(); setSubmitting(true); try { await api.put("/owner/store", form); setMsg("Store updated."); setShowEdit(false); load(); } catch (e) { setMsg(e.response?.data?.message || "Could not update store."); } finally { setSubmitting(false); } };
  const reply = async (ratingId, replyText) => { if (!replyText || !replyText.trim()) { setMsg("Enter a reply first."); return; } try { await api.post(`/owner/rating/${ratingId}/reply`, { reply: replyText }); setMsg("Reply posted."); load(); } catch (e) { setMsg(e.response?.data?.message || "Could not post reply."); } };
  const report = async (ratingId) => { try { const response = await api.post(`/owner/rating/${ratingId}/report`); setMsg(response.data.message); load(); } catch (e) { setMsg(e.response?.data?.message || "Could not report review."); } };
  const updateReg = (event) => setRegForm({ ...regForm, [event.target.name]: event.target.value });
  const registerStore = async (event) => { event.preventDefault(); setError(""); setMsg(""); if (!regForm.name.trim()) return setError("Store name is required."); setSubmitting(true); try { const r = await api.post("/owner/store", regForm); setMsg(r.data.message); setTimeout(load, 900); } catch (e) { setError(e.response?.data?.message || "Could not register the store."); } finally { setSubmitting(false); } };
  const claimStore = async (storeId) => { setError(""); setMsg(""); setSubmitting(true); try { const r = await api.post("/owner/store/claim", { storeId }); setMsg(r.data.message); setTimeout(load, 900); } catch (e) { setError(e.response?.data?.message || "Could not claim that store."); } finally { setSubmitting(false); } };
  const uploadImages = async (event) => { const files = event.target.files; if (!files || !files.length) return; setError(""); setMsg(""); const fd = new FormData(); Array.from(files).forEach((f) => fd.append("images", f)); setUploading(true); try { const r = await api.post("/owner/store/images", fd, { headers: { "Content-Type": "multipart/form-data" } }); setMsg(r.data.message); load(); } catch (e) { setError(e.response?.data?.message || "Upload failed."); } finally { setUploading(false); event.target.value = ""; } };
  const removeImage = async (index) => { setError(""); setMsg(""); try { const r = await api.delete(`/owner/store/images/${index}`); setMsg(r.data.message); load(); } catch (e) { setError(e.response?.data?.message || "Could not remove the image."); } };

  return <AppShell role="owner" active="overview" title={noStore ? "Set up your store" : "Your store dashboard"} subtitle={noStore ? "Register a new store or claim an existing listing to get started." : "Track reviews, respond to customers, and manage your store."}>
    {msg && <p className="notice success">{msg}</p>}
    {error && <p className="notice error">{error}</p>}
    {!data && !noStore && <div className="section empty">Loading your store…</div>}
    {noStore && <div className="split-2">
      <section className="section"><div className="section-title"><div><h2>Register a new store</h2><p className="muted">Create a fresh listing for your business.</p></div></div>
        <form onSubmit={registerStore} className="grid-form">
          <label className="field">Store name *<input name="name" value={regForm.name} onChange={updateReg} maxLength="120" placeholder="e.g. Sunrise Bakery" /></label>
          <label className="field">Category<select name="categoryId" value={regForm.categoryId} onChange={updateReg}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="field">Address<input name="address" value={regForm.address} onChange={updateReg} /></label>
          <label className="field">Phone<input name="phone" value={regForm.phone} onChange={updateReg} placeholder="e.g. +91 98765 43210" /></label>
          <label className="field">Opening hours<input name="openingHours" value={regForm.openingHours} onChange={updateReg} placeholder="e.g. Mon-Sat 9am-6pm" /></label>
          <label className="field">Price level<select name="priceLevel" value={regForm.priceLevel} onChange={updateReg}><option value="">Not set</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{"$".repeat(n)}</option>)}</select></label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>Description<textarea className="field-text" rows="3" name="description" value={regForm.description} onChange={updateReg} /></label>
          <button className="primary-btn" disabled={submitting}>{submitting ? "Saving…" : "Register store"}</button>
        </form>
      </section>
      <section className="section"><div className="section-title"><div><h2>Claim an existing listing</h2><p className="muted">If your store was already listed by our team, take ownership of it.</p></div></div>
        {unclaimed.length ? <div className="claim-list">{unclaimed.map((s) => <div className="list-item" key={s.id}><span><strong>{s.name}</strong><br /><small className="muted">{s.address || "No address"}</small></span><button className="secondary-btn" disabled={submitting} onClick={() => claimStore(s.id)}>Claim</button></div>)}</div> : <div className="empty">Nothing to claim right now — register your store instead.</div>}
      </section>
    </div>}
    {data && <>{!data.store.isApproved && <p className="notice warn">Your store is awaiting administrator approval — customers can&apos;t see it yet.</p>}<div className="metrics"><Metric label="Average rating" value={data.avgRating ? `${data.avgRating.toFixed(1)} / 5` : "—"} /><Metric label="Total reviews" value={data.ratingCount} /><Metric label="Positive (4-5★)" value={`${data.positivePercent}%`} /><Metric label="This month" value={data.thisMonthCount} /><Metric label="Month-on-month" value={`${data.trendPercent > 0 ? "+" : ""}${data.trendPercent}%`} /></div>
      <section className="section"><div className="section-title"><div><h2>{data.store.name}</h2><p className="muted">{data.store.category || "Uncategorized"} · {data.store.address || "No address"}</p></div><button className="secondary-btn" onClick={() => setShowEdit(!showEdit)}>{showEdit ? "Close editor" : "Edit store info"}</button></div>
        <p className="muted">{data.store.phone ? `Phone: ${data.store.phone}` : "No phone"}{data.store.openingHours ? ` · Hours: ${data.store.openingHours}` : ""}{data.store.priceLevel ? ` · Price: ${"$".repeat(data.store.priceLevel)}` : ""}</p>
        {data.store.description && <p>{data.store.description}</p>}
      </section>
      {showEdit && <StoreEditForm form={form} setForm={setForm} categories={categories} onSubmit={saveStore} submitting={submitting} />}
      <section className="section"><div className="section-title"><h2>Store images</h2><label className={`secondary-btn file-btn`}>{uploading ? "Uploading…" : "Upload images"}<input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={uploadImages} /></label></div>
        {(data.store.images || []).length ? <div className="img-grid">{data.store.images.map((src, i) => <div className="img-tile" key={src}><img src={`${ORIGIN}${src}`} alt={`Store photo ${i + 1}`} />{i === 0 && <span className="badge owner">Cover</span>}<button type="button" className="img-remove" title="Remove image" onClick={() => removeImage(i)}>×</button></div>)}</div> : <p className="muted">No images yet — upload photos so customers can see your store.</p>}
      </section>
      <section className="section"><div className="section-title"><h2>Customer reviews</h2></div>
        {!data.ratings.length ? <div className="empty">No reviews yet. Share your store profile with customers.</div> : <div>{data.ratings.map((review) => <div className="review-item" key={review.id}><div className="review-head"><strong>{review.user ? review.user.name : "Customer"}</strong><span className="stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div><p className="muted">{new Date(review.createdAt).toLocaleDateString()} · {review.helpful} helpful</p>{review.review && <p>{review.review}</p>}{review.ownerReply && <div className="owner-reply"><span className="badge owner">Your response</span><p>{review.ownerReply}</p></div>}<div className="review-actions"><button className="danger-btn" onClick={() => report(review.id)}>Report review</button></div><ReplyForm review={review} onReply={reply} /></div>)}</div>}
      </section>
    </>}
  </AppShell>;
}
function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
function ReplyForm({ review, onReply }) { const [text, setText] = useState(review.ownerReply || ""); return <form onSubmit={(e) => { e.preventDefault(); onReply(review.id, text); }} className="reply-form"><input className="table-search" value={text} onChange={(e) => setText(e.target.value)} placeholder={review.ownerReply ? "Update your response…" : "Respond to this review…"} /><button className="secondary-btn">{review.ownerReply ? "Update reply" : "Post reply"}</button></form>; }
function StoreEditForm({ form, setForm, categories, onSubmit, submitting }) { const update = (event) => setForm({ ...form, [event.target.name]: event.target.value }); return <section className="section"><div className="section-title"><h2>Edit store information</h2></div><form onSubmit={onSubmit} className="grid-form"><label className="field">Name<input name="name" value={form.name} onChange={update} /></label><label className="field">Category<select name="categoryId" value={form.categoryId} onChange={update}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="field">Phone<input name="phone" value={form.phone} onChange={update} /></label><label className="field">Price level<select name="priceLevel" value={form.priceLevel} onChange={update}><option value="">Not set</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{"$".repeat(n)}</option>)}</select></label><label className="field">Address<input name="address" value={form.address} onChange={update} /></label><label className="field">Contact email<input name="email" value={form.email} onChange={update} /></label><label className="field">Opening hours<input name="openingHours" value={form.openingHours} onChange={update} placeholder="e.g. Mon-Sat 9am-6pm" /></label><label className="field">Description<textarea className="field-text" rows="3" name="description" value={form.description} onChange={update} /></label><button className="primary-btn" disabled={submitting}>{submitting ? "Saving…" : "Save changes"}</button></form></section>; }
