import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { shortcutDefs, ShortcutSection } from "./shortcutDefs";
import { useShortcutOverlay } from "./ShortcutProvider";

function Keycap({ children }: { children: string }) {
  return (
    <span className="px-2 py-1 rounded-md border border-black/10 bg-white text-xs leading-none shadow-sm">
      {children}
    </span>
  );
}

function Section({ data }: { data: ShortcutSection }) {
  return (
    <div className="grid gap-2">
      <div className="text-sm font-semibold opacity-70">{data.title}</div>
      <div className="grid gap-2">
        {data.items.map((it, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="text-sm">{it.label}</div>
            <Keycap>{it.keys}</Keycap>
          </div>
        ))}
        {data.items.length === 0 && (
          <div className="text-sm opacity-60">Tidak ada shortcut khusus</div>
        )}
      </div>
    </div>
  );
}

export default function ShortcutOverlay() {
  const { isOpen, close } = useShortcutOverlay();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const sections = useMemo(() => shortcutDefs(pathname), [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key.toLowerCase() === "g") {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true } as any);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div className="absolute inset-0 flex items-start justify-center p-4 md:p-8">
        <div className="w-full max-w-xl rounded-2xl bg-white text-black shadow-2xl ring-1 ring-black/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
            <div className="font-semibold">Shortcut & Navigasi Cepat</div>
            <button
              onClick={close}
              className="px-2 py-1 rounded-md bg-black/5 text-sm"
            >
              Tutup
            </button>
          </div>
          <div className="p-4 grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sections.map((s, i) => (
                <Section key={i} data={s} />
              ))}
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-semibold opacity-70">Navigasi</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    navigate("/sales");
                    close();
                  }}
                  className="px-3 py-2 rounded-lg bg-black/5 text-sm"
                >
                  Penjualan
                </button>
                <button
                  onClick={() => {
                    navigate("/purchases");
                    close();
                  }}
                  className="px-3 py-2 rounded-lg bg-black/5 text-sm"
                >
                  Pembelian
                </button>
                <button
                  onClick={() => {
                    navigate("/products");
                    close();
                  }}
                  className="px-3 py-2 rounded-lg bg-black/5 text-sm"
                >
                  Produk
                </button>
                <button
                  onClick={() => {
                    navigate("/dashboard");
                    close();
                  }}
                  className="px-3 py-2 rounded-lg bg-black/5 text-sm"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    navigate("/audit");
                    close();
                  }}
                  className="px-3 py-2 rounded-lg bg-black/5 text-sm"
                >
                  Audit
                </button>
                <button
                  onClick={() => {
                    navigate("/settings");
                    close();
                  }}
                  className="px-3 py-2 rounded-lg bg-black/5 text-sm"
                >
                  Settings
                </button>
              </div>
            </div>
            <div className="text-xs opacity-60">
              Tekan <span className="font-semibold">Esc</span> untuk menutup
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}