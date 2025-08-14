import { useEffect, useState } from "react";
import hotkeys from "hotkeys-js";
import clsx from "clsx";

type Item = { keys: string; desc: string };
type Section = { title: string; items: Item[] };

const sections: Section[] = [
  {
    title: "Navigasi",
    items: [
      { keys: "Alt + 1", desc: "Penjualan" },
      { keys: "Alt + 2", desc: "Pembelian" },
      { keys: "Alt + C", desc: "Kas & Shift" },
      { keys: "Alt + P", desc: "Produk" },
      { keys: "Alt + D", desc: "Dashboard" },
      { keys: "Alt + R", desc: "Laporan" },
      { keys: "Alt + S", desc: "Setting" },
    ],
  },
  {
    title: "Penjualan",
    items: [
      { keys: "F2", desc: "Fokus kolom pencarian produk" },
      { keys: "Alt + K", desc: "Checkout" },
    ],
  },
  {
    title: "Global",
    items: [
      { keys: "F1 / ?", desc: "Buka/utup Shortcut Overlay" },
      { keys: "Esc", desc: "Tutup overlay" },
      { keys: "Enter", desc: "Submit form aktif" },
      { keys: "Tab", desc: "Pindah fokus" },
    ],
  },
];

export default function ShortcutOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hk = "f1,shift+/";
    hotkeys(hk, (e) => {
      e.preventDefault();
      setOpen((v) => !v);
    });
    hotkeys("esc", (e) => {
      if (!open) return;
      e.preventDefault();
      setOpen(false);
    });
    return () => {
      hotkeys.unbind(hk);
      hotkeys.unbind("esc");
    };
  }, [open]);

  return (
    <>
      <button
        aria-label="Bantuan Shortcut"
        className="fixed left-3 bottom-3 z-[96] px-3 py-2 rounded-2xl bg-white/95 border border-black/10 shadow"
        onClick={() => setOpen(true)}
      >
        ?
      </button>

      <div
        className={clsx(
          "fixed inset-0 z-[120] transition",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={clsx(
            "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity",
            open ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={clsx(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,92vw)]",
            "card p-5 shadow-2xl transition-all",
            open ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}
        >
          <div className="text-lg font-bold mb-1">Shortcut</div>
          <div className="text-sm opacity-70 mb-4">
            Tekan F1 atau ? untuk membuka, Esc untuk menutup
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {sections.map((sec) => (
              <div
                key={sec.title}
                className="p-3 rounded-xl bg-white/70 border border-black/10"
              >
                <div className="font-semibold mb-2">{sec.title}</div>
                <div className="grid gap-1">
                  {sec.items.map((it) => (
                    <div
                      key={it.keys}
                      className="flex items-center justify-between gap-3"
                    >
                      <kbd className="px-2 py-1 rounded bg-black/[.06] border border-black/10 text-sm">
                        {it.keys}
                      </kbd>
                      <div className="text-sm">{it.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className="px-3 py-1.5 rounded bg-black/10"
              onClick={() => setOpen(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
