import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Purchases from "./pages/Purchases";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ExpiredTrial from "./pages/ExpiredTrial";
import RoleGate from "./pages/RoleGate";
import Products from "./pages/Products";
import Shell from "./components/Shell";
import { useSessionRole } from "./hooks/useSessionRole";
import ToastContainer from "./ui/toast";
import ClockWidget from "./components/ClockWidget";
import StoreProfile from "./pages/StoreProfile";
import Cash from "./pages/Cash";
import Inventory from "./pages/Inventory";
import Audit from "./pages/Audit";
import { ShortcutProvider } from "./ui/ShortcutProvider";
import StockAdjustments from "./pages/StockAdjustments";

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading, org } = useAuth();
  const { role } = useSessionRole();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user && !role) navigate("/role");
  }, [loading, user, role, navigate]);
  if (loading) return <div className="p-8">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!role) return null;
  if (org && org.trialExpiresAt && org.trialExpiresAt.toMillis() < Date.now())
    return <ExpiredTrial />;
  return children;
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return (
    <AuthProvider>
      <ToastContainer />
      <ClockWidget />
      <ShortcutProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/role" element={<RoleGate />} />
          <Route
            element={
              <Protected>
                <Shell />
              </Protected>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/products" element={<Products />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/store" element={<StoreProfile />} />
            <Route path="/cash" element={<Cash />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/stock-adjustments" element={<StockAdjustments />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ShortcutProvider>
    </AuthProvider>
  );
}
