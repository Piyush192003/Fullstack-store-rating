/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import StoreDetailModal from "../components/StoreDetailModal";
import api from "../utils/api";

function Stars({ value }) { return <span className="stars">{"★".repeat(Math.round(value || 0))}{"☆".repeat(5 - Math.round(value || 0))}</span>; }

export default function UserNearby() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [heading, setHeading] = useState("Finding stores near you…");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const currentUserId = () => Number(localStorage.getItem("uid") || 0);

  const openDetail = async (id) => { try { const r = await api.get(`/user/stores/${id}`); r.data.mine = r.data.reviews.find((rv) => rv.user && rv.user.id === currentUserId()) || null; setDetail(r.data); } catch {} };
  const refreshDetail = () => { if (detail) openDetail(detail.store.id); };

  const search = async (term) => {
    setLoading(true);
    try {
      const list = (await api.get("/user/stores", { params: { sortBy: "name" } })).data;
      if (term && term.trim()) {
        const t = term.trim().toLowerCase();
        setResults(list.filter((s) => (s.address || "").toLowerCase().includes(t) || (s.name || "").toLowerCase().includes(t)));
        setHeading(`Results for “${term.trim()}”`);
        setHint("");
      } else {
        let tokens = [];
        try { const me = await api.get("/auth/me"); tokens = ((me.data.user.address || "").split(/[\s,]+/).filter((w) => w.length >= 4)).slice(0, 8); } catch {}
        setResults(list.filter((s) => tokens.some((tk) => (s.address || "").toLowerCase().includes(tk.toLowerCase()))));
        if (tokens.length) { setHeading(`Stores near ${tokens.slice(0, 2).join(", ")}`); setHint("Based on the address saved in your profile — or search a different area above."); }
        else { setHeading("Add an address to your profile"); setHint("Save your address in Settings and we’ll match stores in your area. You can also search manually above."); }
      }
    } catch { setHeading("Could not load stores."); } finally { setLoading(false); }
  };

  useEffect(() => { search(""); }, []);

  return <AppShell role="user" active="nearby" title="Nearby Stores" subtitle="Find stores around your area.">
    <div className="tools" style={{ marginBottom: 14 }}><input className="table-search" placeholder="Search by area, city or store name…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search(q)} /><button className="secondary-btn" onClick={() => search(q)}>Search</button><button className="primary-btn" onClick={() => { setQ(""); search(""); }}>Use my profile address</button></div>
    {hint && <p className="muted" style={{ marginBottom: 12 }}>{hint}</p>}
    <h2 style={{ marginBottom: 14 }}>{loading ? "Searching…" : heading}</h2>
    {!loading && !results.length && <div className="empty">No stores matched. Try a nearby area name.</div>}
    {!loading && !!results.length && <div className="store-grid">{results.map((store) => <article className="store-card clickable" key={store.id} role="button" tabIndex={0} onClick={() => openDetail(store.id)} onKeyDown={(e) => { if (e.key === "Enter") openDetail(store.id); }}><div className="store-meta"><span className={`badge ${store.category ? "owner" : ""}`}>{store.category || "Uncategorized"}</span><span className="muted">{store.priceLevel ? "$".repeat(store.priceLevel) : "Price not listed"}</span></div><h3>{store.name}</h3><p>{store.address || "Address not listed"}</p><div className="rating-row"><span><Stars value={store.avgRating} /><br /><small>{store.avgRating ? `${store.avgRating.toFixed(1)} avg · ${store.ratingCount} review${store.ratingCount === 1 ? "" : "s"}` : "No ratings yet"}</small></span></div><button className="primary-btn full" onClick={(e) => { e.stopPropagation(); openDetail(store.id); }}>View details</button></article>)}</div>}
    {detail && <StoreDetailModal detail={detail} onClose={() => setDetail(null)} onChanged={refreshDetail} />}
  </AppShell>;
}
