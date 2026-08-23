/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../utils/api";

function Stars({ value }) { return <span className="stars">{"★".repeat(Math.round(value || 0))}{"☆".repeat(5 - Math.round(value || 0))}</span>; }

export default function UserDashboard() {
  const [stores, setStores] = useState([]);
  const [query, setQuery] = useState(""); const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true); const [message, setMessage] = useState("");
  const loadStores = async () => { setLoading(true); try { const response = await api.get("/user/stores", { params: { q: query } }); setStores(response.data); } catch (error) { setMessage(error.response?.data?.message || "Could not load stores."); } finally { setLoading(false); } };
  useEffect(() => { loadStores(); }, []);
  const rate = async (storeId) => { const rating = selected[storeId]; if (!rating) return setMessage("Choose a star rating first."); try { const response = await api.post("/user/rating", { storeId, rating }); setMessage(response.data.message); loadStores(); } catch (error) { setMessage(error.response?.data?.message || "Could not save rating."); } };
  return <AppShell role="user" active="overview" title="Discover stores" subtitle="Search local places and share your experience.">
    <section id="overview" className="section"><div className="section-title"><h2>All stores</h2><div className="tools"><input className="table-search" placeholder="Search name or address" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="secondary-btn" onClick={loadStores}>Search</button></div></div>
      {message && <p className="notice success">{message}</p>}
      {loading ? <div className="empty">Loading stores…</div> : <div className="store-grid">{stores.map((store) => <article className="store-card" key={store.id}><h3>{store.name}</h3><p>{store.address || "Address not listed"}</p><div className="rating-row"><span><Stars value={store.avgRating} /><br /><small>{store.avgRating ? `${store.avgRating.toFixed(1)} average` : "No ratings yet"}</small></span><span className="badge">Your rating: {store.userRating || "—"}</span></div><div className="rating-control">{[1, 2, 3, 4, 5].map((number) => <button key={number} className={(selected[store.id] || store.userRating) >= number ? "selected" : ""} onClick={() => setSelected({ ...selected, [store.id]: number })} aria-label={`${number} stars`}>★</button>)}</div><button className="primary-btn" onClick={() => rate(store.id)}>{store.userRating ? "Update rating" : "Submit rating"}</button></article>)}</div>}
      {!loading && !stores.length && <div className="empty">No stores match your search.</div>}
    </section>
  </AppShell>;
}