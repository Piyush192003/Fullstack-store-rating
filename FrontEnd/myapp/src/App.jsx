import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDiscover from "./pages/UserDiscover";
import AdminConsole from "./pages/AdminConsole";
import AdminAddStore from "./pages/AdminAddStore";
import AdminEditStore from "./pages/AdminEditStore";
import OwnerWorkspace from "./pages/OwnerWorkspace";
import UserProfile from "./pages/UserProfile";
import UserNearby from "./pages/UserNearby";
import UserMyReviews from "./pages/UserMyReviews";
import UserFavorites from "./pages/UserFavorites";
import UserNotifications from "./pages/UserNotifications";
import UserSettings from "./pages/UserSettings";
import AdminProfile from "./pages/AdminProfile";
import OwnerProfile from "./pages/OwnerProfile";
import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace", color: "#b91c1c", whiteSpace: "pre-wrap", direction: "ltr", background: "#fff", minHeight: "100vh" }}>
          <h2 style={{ color: "#172033" }}>Something broke 😢</h2>
          <p style={{ color: "#172033", fontWeight: 700 }}>Please send this error text:</p>
          <pre style={{ background: "#f8fafc", padding: 16, borderRadius: 10, border: "1px solid #e5e7eb", color: "#334155" }}>
            {(this.state.error && (this.state.error.stack || this.state.error.message)) || String(this.state.error)}
          </pre>
          <button onClick={() => { localStorage.clear(); window.location.href = "/"; }} style={{ marginTop: 16, padding: "10px 18px", border: 0, borderRadius: 10, background: "#1d4ed8", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Reset app</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ role, children }) {
  const token = localStorage.getItem("token");
  const currentRole = localStorage.getItem("role");
  if (!token) return <Navigate to="/" replace />;
  if (currentRole !== role) return <Navigate to={`/${currentRole || "user"}/dashboard`} replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/user/dashboard" element={<ProtectedRoute role="user"><UserDiscover /></ProtectedRoute>} />
        <Route path="/user/profile" element={<ProtectedRoute role="user"><UserProfile /></ProtectedRoute>} />
        <Route path="/user/nearby" element={<ProtectedRoute role="user"><UserNearby /></ProtectedRoute>} />
        <Route path="/user/my-reviews" element={<ProtectedRoute role="user"><UserMyReviews /></ProtectedRoute>} />
        <Route path="/user/favorites" element={<ProtectedRoute role="user"><UserFavorites /></ProtectedRoute>} />
        <Route path="/user/notifications" element={<ProtectedRoute role="user"><UserNotifications /></ProtectedRoute>} />
        <Route path="/user/settings" element={<ProtectedRoute role="user"><UserSettings /></ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute role="admin"><AdminProfile /></ProtectedRoute>} />
        <Route path="/owner/profile" element={<ProtectedRoute role="owner"><OwnerProfile /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminConsole /></ProtectedRoute>} />
        <Route path="/admin/add-store" element={<ProtectedRoute role="admin"><AdminAddStore /></ProtectedRoute>} />
        <Route path="/admin/edit-store/:id" element={<ProtectedRoute role="admin"><AdminEditStore /></ProtectedRoute>} />
        <Route path="/owner/dashboard" element={<ProtectedRoute role="owner"><OwnerWorkspace /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;

