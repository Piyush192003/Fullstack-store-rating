import { useState } from "react";
import api from "../utils/api";

// Shared, self-contained store detail experience used by the user pages.
const ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");

function Stars({ value }) { return <span className="stars">{"★".repeat(Math.round(value || 0))}{"☆".repeat(5 - Math.round(value || 0))}</span>; }
function Price({ level }) { return level ? <span className="muted">{"$".repeat(level)}</span> : <span className="muted">Price not listed</span>; }
function DistributionBars({ dist, total }) { const rows = [5, 4, 3, 2, 1]; const t = total || 0; return <div>{rows.map((n) => { const count = dist && dist[n] ? dist[n] : 0; const pct = t ? Math.round((count / t) * 100) : 0; return <div key={n} className="dist-row"><span className="muted">{n}★</span><div className="dist-track"><div className="dist-fill" style={{ width: `${pct}%` }} /></div><span className="muted">{pct}%</span></div>; })}</div>; }
function StarInput({ value, onChange }) { return <div className="rating-control">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={value >= n ? "selected" : ""} onClick={() => onChange(n)} aria-label={`${n} stars`}>★</button>)}</div>; }

export default function StoreDetailModal({ detail, onClose, onChanged }) {
  const store = detail.store;
  const mine = detail.mine;
  const images = store.images || [];
  const [heroIdx, setHeroIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [stars, setStars] = useState(mine ? mine.rating : 0);
  const [reviewText, setReviewText] = useState(mine ? (mine.review || "") : "");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const canSubmit = stars > 0;
  const startEdit = (review) => { setStars(review.rating); setReviewText(review.review || ""); const box = document.querySelector(".rate-box"); if (box) box.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const prevImage = (e) => { e.stopPropagation(); setHeroIdx((heroIdx - 1 + images.length) % images.length); };
  const nextImage = (e) => { e.stopPropagation(); setHeroIdx((heroIdx + 1) % images.length); };
  const infoRows = [["📍", store.address || "Address not listed"], ["📞", store.phone], ["✉️", store.email], ["🕘", store.openingHours ? `Hours: ${store.openingHours}` : null]].filter((row) => row[1]);

  const submitReview = async () => {
    if (!canSubmit) return;
    setErr(""); setMsg("");
    try { const r = await api.post("/user/rating", { storeId: store.id, rating: stars, review: reviewText }); setMsg(r.data.message); onChanged && onChanged(); } catch (e) { setErr(e.response?.data?.message || "Could not save review."); }
  };
  const removeMine = async () => {
    setErr(""); setMsg("");
    try { const r = await api.delete(`/user/rating/${store.id}`); setMsg(r.data.message); setStars(0); setReviewText(""); onChanged && onChanged(); } catch (e) { setErr(e.response?.data?.message || "Could not delete review."); }
  };
  const markHelpful = async (id) => {
    try { await api.post(`/user/rating/${id}/helpful`); onChanged && onChanged(); } catch (e) { setErr(e.response?.data?.message || "Could not save vote."); }
  };

  return <div className="modal-backdrop"><div className="modal modal-wide">
    {images.length ? <>
      <div className="detail-hero" title="Click to view full image" onClick={() => setLightbox(true)}><img src={`${ORIGIN}${images[heroIdx]}`} alt={`${store.name} photo ${heroIdx + 1}`} /></div>
      {images.length > 1 && <div className="hero-thumbs">{images.map((src, i) => <button type="button" key={src} className={`hero-thumb${i === heroIdx ? " active" : ""}`} onClick={() => setHeroIdx(i)}><img src={`${ORIGIN}${src}`} alt={`Thumbnail ${i + 1}`} /></button>)}</div>}
    </> : <div className="detail-hero"><span className="hero-letter">{(store.name[0] || "S").toUpperCase()}</span></div>}
    <div className="modal-header"><div><h2>{store.name}</h2><p className="muted"><span className={`badge ${store.category ? "owner" : ""}`}>{store.category || "Uncategorized"}</span> <Price level={store.priceLevel} /></p></div><button className="danger-btn" onClick={onClose}>✕ Close</button></div>
    {msg && <p className="notice success">{msg}</p>}
    {err && <p className="notice error">{err}</p>}
    {store.description && <p>{store.description}</p>}
    <div className="rating-summary">
      <div className="rating-big">{detail.avgRating ? detail.avgRating.toFixed(1) : "—"}</div>
      <div><Stars value={detail.avgRating} /><br /><small className="muted">{detail.ratingCount} review{detail.ratingCount === 1 ? "" : "s"}{detail.avgRating ? ` · ${detail.avgRating.toFixed(1)} / 5` : ""}</small></div>
      <div className="dist-wrap"><DistributionBars dist={detail.distribution} total={detail.ratingCount} /></div>
    </div>
    <div className="detail-grid">
      <div><h3>Store information</h3>{infoRows.map(([ico, text]) => <div className="info-row" key={text}><span className="info-ico">{ico}</span><span>{text}</span></div>)}</div>
      <div className="rate-box"><h3>{mine ? "Update your review" : "Rate this store"}</h3>
        <StarInput value={stars} onChange={setStars} />
        <textarea className="field-text" rows="3" placeholder="Share your experience…" value={reviewText} onChange={(e) => setReviewText(e.target.value)} maxLength="4000" />
        {!canSubmit && <p className="muted" style={{ marginTop: 8 }}>Pick a star rating above, then submit your review.</p>}
        <button className="primary-btn full" disabled={!canSubmit} onClick={submitReview}>{mine ? "Update & submit review" : "Submit review"}</button>
        {mine && <button className="danger-btn full" onClick={removeMine}>Delete my review</button>}
      </div>
    </div>
    <hr />
    <h3>Reviews ({detail.reviews.length})</h3>
    {!detail.reviews.length && <div className="empty">No reviews yet — be the first!</div>}
    {detail.reviews.map((review) => <div className="review-item" key={review.id}><div className="review-head"><strong>{review.user ? review.user.name : "Former member"}</strong><span><Stars value={review.rating} /></span></div><p className="muted">{new Date(review.createdAt).toLocaleDateString()}</p>{review.review && <p>{review.review}</p>}{review.ownerReply && <div className="owner-reply"><span className="badge owner">Store response</span><p>{review.ownerReply}</p></div>}<div className="review-actions"><button className="secondary-btn" onClick={() => markHelpful(review.id)}>Helpful ({review.helpful.count}){review.helpful.mine ? " ✓" : ""}</button>{mine && review.id === mine.id && <button className="secondary-btn" onClick={() => startEdit(review)}>Edit / update</button>}</div></div>)}
    {lightbox && images.length > 0 && <div className="lightbox" onClick={() => setLightbox(false)}>
      <img src={`${ORIGIN}${images[heroIdx]}`} alt={`${store.name} full view`} onClick={(e) => e.stopPropagation()} />
      <button type="button" className="secondary-btn lb-close" onClick={() => setLightbox(false)}>✕ Close</button>
      {images.length > 1 && <><button type="button" className="secondary-btn lb-prev" onClick={prevImage}>‹</button><button type="button" className="secondary-btn lb-next" onClick={nextImage}>›</button></>}
    </div>}
  </div></div>;
}