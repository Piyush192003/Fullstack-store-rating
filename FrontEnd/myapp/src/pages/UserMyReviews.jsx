/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import StoreDetailModal from "../components/StoreDetailModal";
import api from "../utils/api";

const ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, "");
const currentUserId = () => Number(localStorage.getItem("uid") || 0);
function Stars({ value }) { return <span className="stars">{"★".repeat(Math.round(value || 0))}{"☆".repeat(5 - Math.round(value || 0))}</span>; }

export default function UserMyReviews() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const load = async () => { try { setRows((await api.get("/user/my-reviews")).data); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const openDetail = async (id) => { try { const r = await api.get(`/user/stores/${id}`); r.data.mine = r.data.reviews.find((rv) => rv.user && rv.user.id === currentUserId()) || null; setDetail(r.data); } catch {} };
  const refreshDetail = () => { if (detail) openDetail(detail.store.id); };

  return <AppShell role="user" active="myreviews" title="My Ratings & Reviews" subtitle="Everything you’ve rated across StoreScope.">
    {loading && <div className="empty">Loading your reviews…</div>}
    {!loading && !rows.length && <div className="empty">You haven’t reviewed any stores yet. Open a store in Discover Stores to write your first review.</div>}
    {!loading && !!rows.length && rows.map((r) => <div className="myrev-card" key={r.id}>
      <div className="rev-thumb">{r.store && r.store.images && r.store.images[0] ? <img src={`${ORIGIN}${r.store.images[0]}`} alt={r.store.name} /> : (r.store ? (r.store.name[0] || "S").toUpperCase() : "?")}</div>
      <div className="myrev-main">
        <strong>{r.store ? r.store.name : "Deleted store"}</strong>
        <div style={{ margin: "4px 0" }}><Stars value={r.rating} /> <small className="muted">{new Date(r.createdAt).toLocaleDateString()}</small></div>
        {r.review && <p>{r.review}</p>}
        {r.ownerReply && <div className="owner-reply"><span className="badge owner">Store response</span><p>{r.ownerReply}</p></div>}
      </div>
      {r.store && <button className="secondary-btn" onClick={() => openDetail(r.store.id)}>Open store</button>}
    </div>)}
    {detail && <StoreDetailModal detail={detail} onClose={() => setDetail(null)} onChanged={refreshDetail} />}
  </AppShell>;
}
