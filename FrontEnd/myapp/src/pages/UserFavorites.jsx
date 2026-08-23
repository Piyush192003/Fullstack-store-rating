/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import StoreDetailModal from "../components/StoreDetailModal";
import api from "../utils/api";

const ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");
const currentUserId = () => Number(localStorage.getItem("uid") || 0);
function Stars({ value }) { return <span className="stars">{"★".repeat(Math.round(value || 0))}{"☆".repeat(5 - Math.round(value || 0))}</span>; }

export default function UserFavorites() {
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const load = async () => { try { setFavs((await api.get("/user/favorites")).data); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const openDetail = async (id) => { try { const r = await api.get(`/user/stores/${id}`); r.data.mine = r.data.reviews.find((rv) => rv.user && rv.user.id === currentUserId()) || null; setDetail(r.data); } catch {} };
  const refreshDetail = () => { if (detail) openDetail(detail.store.id); };
  const remove = async (e, id) => { e.stopPropagation(); try { await api.post(`/user/favorites/${id}/toggle`); setFavs((prev) => prev.filter((s) => s.id !== id)); } catch {} };

  return <AppShell role="user" active="favorites" title="Favorites" subtitle="The stores you’ve saved for quick access.">
    {loading && <div className="empty">Loading your favorites…</div>}
    {!loading && !favs.length && <div className="empty">No favorites yet — tap the ♥ on any store in Discover Stores.</div>}
    {!loading && !!favs.length && <div className="store-grid">{favs.map((store) => <article className="store-card clickable" key={store.id} role="button" tabIndex={0} onClick={() => openDetail(store.id)} onKeyDown={(e) => { if (e.key === "Enter") openDetail(store.id); }}><button type="button" className="heart-btn card-heart on" title="Remove from favorites" onClick={(e) => remove(e, store.id)}>♥</button><div className="store-meta"><span className={`badge ${store.category ? "owner" : ""}`}>{store.category || "Uncategorized"}</span><span className="muted">{store.priceLevel ? "$".repeat(store.priceLevel) : "Price not listed"}</span></div><h3>{store.name}</h3><p>{store.address || "Address not listed"}</p><div className="rating-row"><span><Stars value={store.avgRating} /><br /><small>{store.avgRating ? `${store.avgRating.toFixed(1)} avg · ${store.ratingCount} review${store.ratingCount === 1 ? "" : "s"}` : "No ratings yet"}</small></span></div><button className="primary-btn full" onClick={(e) => { e.stopPropagation(); openDetail(store.id); }}>View details</button></article>)}</div>}
    {detail && <StoreDetailModal detail={detail} onClose={() => setDetail(null)} onChanged={refreshDetail} />}
  </AppShell>;
}
