import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Brand from "./Brand";

type Item = { to: string; label: string; icon: React.ReactNode };

const items: Item[] = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/sales", label: "Penjualan", icon: "🛒" },
  { to: "/purchases", label: "Pembelian", icon: "📥" },
  { to: "/products", label: "Produk", icon: "📦" },
  { to: "/inventory", label: "Inventori", icon: "🗂️" },
  { to: "/stock-adjustments", label: "Penyesuaian", icon: "⚖️" },
  { to: "/cash", label: "Kas", icon: "💰" },
  { to: "/audit", label: "Audit", icon: "🧾" },
  { to: "/reports", label: "Laporan", icon: "📑" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
  { to: "/store", label: "Profil Toko", icon: "🏪" },
];

export default function TopNav() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <div className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto h-14 px-3 flex items-center justify-between">
          <Brand size="md" />
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 text-lg font-bold"
            aria-label="Beranda"
          >
          </NavLink>

          <nav className="hidden md:flex items-center gap-2">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                title={it.label}
                className={({ isActive }) =>
                  `group relative flex items-center justify-center w-11 h-11 rounded-xl transition ${
                    isActive
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
                  }`
                }
              >
                <span className="text-base">{it.icon}</span>
                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] whitespace-nowrap rounded-lg px-2 py-1 text-xs bg-neutral-900 text-white opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition">
                  {it.label}
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
              aria-label="Menu"
            >
              ☰
            </button>
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              aria-label="Keluar"
              title="Keluar"
            >
              ⎋
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-0 inset-x-0 bg-white dark:bg-neutral-900 rounded-b-2xl shadow-xl ring-1 ring-black/10 p-4 grid gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-bold">
                <span className="inline-block w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-rose-500" />
                <span>Zyngra POS</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {items.map((it) => (
                <button
                  key={it.to}
                  onClick={() => {
                    navigate(it.to);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-left"
                >
                  <span className="text-base">{it.icon}</span>
                  <span className="text-sm">{it.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
