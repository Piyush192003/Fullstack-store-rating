/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import StoreDetailModal from "../components/StoreDetailModal";
import api from "../utils/api";

// Read at call time (NOT module scope): the SPA logs in without a page reload,
// so a module-level constant would still hold 0 after login and break the
// "my review" detection (edit/update/delete own review).
const currentUserId = () => Number(localStorage.getItem("uid") || 0);
const ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");

function Stars({ value }) { return <span className="stars">{"★".repeat(Math.round(value || 0))}{"☆".repeat(5 - Math.round(value || 0))}</span>; }
function Price({ level }) { return level ? <span className="muted">{"$".repeat(level)}</span> : <span className="muted">Price not listed</span>; }
function DistributionBars({ dist, total }) { const rows = [5, 4, 3, 2, 1]; const t = total || 0; return <div>{rows.map((n) => { const count = dist && dist[n] ? dist[n] : 0; const pct = t ? Math.round((count / t) * 100) : 0; return <div key={n} className="dist-row"><span className="muted">{n}★</span><div className="dist-track"><div className="dist-fill" style={{ width: `${pct}%` }} /></div><span className="muted">{pct}%</span></div>; })}</div>; }
function StarInput({ value, onChange }) { return <div className="rating-control">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={value >= n ? "selected" : ""} onClick={() => onChange(n)} aria-label={`${n} stars`}>★</button>)}</div>; }
function Chip({ active, onClick, children }) { return <button type="button" className={active ? "chip active" : "chip"} onClick={onClick}>{children}</button>; }
function PriceFilter({ value, onChange }) { return <div className="chip-group">{[["", "Any"], ["1", "$"], ["2", "$$"], ["3", "$$$"], ["4", "$$$$"]].map(([v, label]) => <Chip key={v} active={String(value) === v} onClick={() => onChange(v)}>{label}</Chip>)}</div>; }

export default function UserDiscover() {
  const [stores, setStores] = useState([]); const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState(""); const [category, setCategory] = useState(""); const [price, setPrice] = useState(""); const [sort, setSort] = useState("name");
  const [loading, setLoading] = useState(true); const [message, setMessage] = useState("");
  const [detail, setDetail] = useState(null);
  const [favIds, setFavIds] = useState([]);

  const load = async (overrides = {}) => { setLoading(true); setMessage(""); try { const sortBy = overrides.sortBy !== undefined ? overrides.sortBy : sort; const cat = overrides.category !== undefined ? overrides.category : category; const params = { q: query, sortBy }; if (cat) params.category = cat; if (price) params.price = price; const response = await api.get("/user/stores", { params }); setStores(response.data); } catch (error) { setMessage(error.response?.data?.message || "Could not load stores."); } finally { setLoading(false); } };
  useEffect(() => {
    (async () => {
      let c = ""; let s = "name";
      try { const me = await api.get("/auth/me"); const p = (me.data.user.settings && me.data.user.settings.preferences) || {}; if (p.defaultCategory) { c = String(p.defaultCategory); setCategory(c); } if (p.defaultSort) { s = p.defaultSort; setSort(s); } } catch {}
      api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
      api.get("/user/favorites/ids").then((r) => setFavIds(r.data)).catch(() => {});
      load({ category: c, sortBy: s });
    })();
  }, []);
  const toggleFav = async (e, id) => { e.stopPropagation(); try { const r = await api.post(`/user/favorites/${id}/toggle`); setFavIds((prev) => r.data.favorited ? [...prev, id] : prev.filter((x) => x !== id)); setMessage(r.data.message); } catch { setMessage("Could not update favorite."); } };
  const openDetail = async (id) => { try { const response = await api.get(`/user/stores/${id}`); response.data.mine = response.data.reviews.find((review) => review.user && review.user.id === currentUserId()) || null; setDetail(response.data); } catch { setMessage("Could not open store details."); } };

  const submitRating = async (storeId, rating, reviewText) => { if (!rating) return setMessage("Choose a star rating first."); try { const response = await api.post("/user/rating", { storeId, rating, review: reviewText }); setMessage(response.data.message); load(); if (detail && detail.store.id === storeId) openDetail(storeId); } catch (error) { setMessage(error.response?.data?.message || "Could not save review."); } };
  const deleteRating = async (storeId) => { try { const response = await api.delete(`/user/rating/${storeId}`); setMessage(response.data.message); load(); if (detail && detail.store.id === storeId) openDetail(storeId); } catch (error) { setMessage(error.response?.data?.message || "Could not delete review."); } };
  const toggleHelpful = async (ratingId) => { try { const response = await api.post(`/user/rating/${ratingId}/helpful`); setMessage(response.data.message); if (detail) openDetail(detail.store.id); } catch (error) { setMessage(error.response?.data?.message || "Could not update helpful."); } };

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);
  useEffect(() => {
    if (!showFilters) return;
    const onDown = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilters(false); };
    const onKey = (e) => { if (e.key === "Escape") setShowFilters(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [showFilters]);

  const activeFilterCount = (category ? 1 : 0) + (price ? 1 : 0) + (sort !== "name" ? 1 : 0);
  const clearAllFilters = () => { setCategory(""); setPrice(""); setSort("name"); load({ category: "", price: "", sortBy: "name" }); };

  const toolbar = (<>
    <input className="table-search nb-search" placeholder="🔍 Search stores by name or address…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
    <div className="filter-wrap" ref={filterRef}>
      <button type="button" className={`filter-btn${activeFilterCount ? " has" : ""}`} onClick={() => setShowFilters((o) => !o)}>
        ⚙️ Filters{activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}<span className={`chev${showFilters ? " up" : ""}`}>▾</span>
      </button>
      {showFilters && <div className="filter-panel">
        <div className="fp-title">Category</div>
        <select className="table-search" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <div className="fp-title">Sort by</div>
        <select className="table-search" value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Name A-Z</option><option value="-name">Name Z-A</option><option value="ratingDesc">Highest rated</option><option value="ratingAsc">Lowest rated</option></select>
        <div className="fp-title">Price range</div>
        <PriceFilter value={price} onChange={setPrice} />
        <div className="fp-actions">
          <button type="button" className="secondary-btn" onClick={clearAllFilters}>Clear all</button>
          <button type="button" className="primary-btn" onClick={() => { setShowFilters(false); load(); }}>Apply filters</button>
        </div>
      </div>}
    </div>
  </>);

  return <AppShell role="user" active="discover" title="Discover stores" subtitle="Filter local places, read reviews, and share your own experience." topbarCenter={toolbar}>
    <section className="section"><div className="section-title"><h2>All stores</h2></div>
      {message && <p className="notice success">{message}</p>}
      {loading ? <div className="empty">Loading stores…</div> : <div className="store-grid">{stores.map((store) => <article className="store-card clickable" key={store.id} role="button" tabIndex={0} onClick={() => openDetail(store.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(store.id); } }}><div className="store-meta"><span className={`badge ${store.category ? "owner" : ""}`}>{store.category || "Uncategorized"}</span><Price level={store.priceLevel} /></div><h3>{store.name}</h3><p>{store.address || "Address not listed"}</p><div className="rating-row"><button type="button" className={`heart-btn card-heart${favIds.includes(store.id) ? " on" : ""}`} title={favIds.includes(store.id) ? "Remove from favorites" : "Add to favorites"} onClick={(e) => toggleFav(e, store.id)}>♥</button><span><Stars value={store.avgRating} /><br /><small>{store.avgRating ? `${store.avgRating.toFixed(1)} avg · ${store.ratingCount} review${store.ratingCount === 1 ? "" : "s"}` : "No ratings yet"}</small></span><span className="badge">Your rating: {store.userRating?.rating || "—"}</span></div><button className="primary-btn full" onClick={(e) => { e.stopPropagation(); openDetail(store.id); }}>Rate &amp; details</button></article>)}</div>}
      {!loading && !stores.length && <div className="empty">No stores match your filters.</div>}
    </section>
    {detail && <StoreDetailModal detail={detail} onClose={() => setDetail(null)} onChanged={() => { load(); if (detail) openDetail(detail.store.id); }} />}
  </AppShell>;
}
