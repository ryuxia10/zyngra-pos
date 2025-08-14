import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSessionRole } from "../hooks/useSessionRole";
import { toast } from "../ui/toastStore";
import dayjs from "dayjs";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { auditLog } from "../lib/audit";

type Move = {
  id: string;
  orgId: string;
  productId: string;
  type: "adjustment";
  qty: number;
  delta: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  note?: string | null;
  adjustmentDate?: any;
  createdAt?: any;
  byUid?: string | null;
  productName?: string;
};

export default function StockAdjustments() {
  const { org, user } = useAuth();
  const { role } = useSessionRole();
  const canAdmin = role === "admin";

  const [products, setProducts] = useState<any[]>([]);
  const [sel, setSel] = useState<string>("");
  const [delta, setDelta] = useState<string>("");
  const [reason, setReason] = useState<string>("Opname");
  const [note, setNote] = useState<string>("");
  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [history, setHistory] = useState<Move[]>([]);
  const [search, setSearch] = useState("");

  const prodSelRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const loadProducts = async () => {
      if (!org) return;
      const qy = query(
        collection(db, "products"),
        where("orgId", "==", org.id)
      );
      const snap = await getDocs(qy);
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      arr.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      );
      setProducts(arr);
      if (!sel && arr.length) setSel(arr[0].id);
    };
    const loadMoves = async () => {
      if (!org) return;
      const qy = query(
        collection(db, "stockMoves"),
        where("orgId", "==", org.id),
        where("type", "==", "adjustment")
      );
      const snap = await getDocs(qy);
      const arr = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as any[];
      const mapName = new Map<string, string>();
      products.forEach((p) => mapName.set(p.id, p.name));
      arr.forEach((m) => {
        m.productName = mapName.get(m.productId) || m.productId;
      });
      arr.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
      );
      setHistory(arr as Move[]);
    };
    loadProducts().then(loadMoves);
  }, [org?.id]);

  useEffect(() => {
    const mapName = new Map<string, string>();
    products.forEach((p) => mapName.set(p.id, p.name));
    setHistory((h) =>
      h.map((m) => ({
        ...m,
        productName: mapName.get(m.productId) || m.productId,
      }))
    );
  }, [products]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return history;
    return history.filter((m) => {
      const a = String(m.productName || "").toLowerCase();
      const b = String(m.reason || "").toLowerCase();
      const c = String(m.note || "").toLowerCase();
      return a.includes(s) || b.includes(s) || c.includes(s);
    });
  }, [history, search]);

  const submit = async () => {
    if (!org) return toast.error("Organisasi belum siap");
    if (!canAdmin) return toast.error("Hanya admin");
    if (!sel) return toast.error("Pilih produk");
    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0)
      return toast.error(
        "Masukkan angka selain 0. Gunakan minus untuk mengurangi"
      );
    try {
      await runTransaction(db, async (tx) => {
        const pref = doc(db, "products", sel);
        const snap = await tx.get(pref);
        if (!snap.exists()) throw new Error("Produk tidak ditemukan");
        const before = Number((snap.data() as any)?.stock || 0);
        const after = before + n;
        if (after < 0) throw new Error("Stok tidak boleh negatif");
        tx.update(pref, { stock: after });
        const mref = doc(collection(db, "stockMoves"));
        tx.set(mref, {
          orgId: org.id,
          productId: sel,
          type: "adjustment",
          qty: Math.abs(n),
          delta: n,
          stockBefore: before,
          stockAfter: after,
          reason: reason || "Koreksi",
          note: note.trim() || null,
          adjustmentDate: Timestamp.fromDate(dayjs(date).toDate()),
          createdAt: serverTimestamp(),
          byUid: user?.uid || null,
        } as any);
      });
      await auditLog({
        orgId: org.id,
        user,
        entity: "stock",
        action: "adjustment",
        entityId: sel,
        after: { delta: Number(delta), reason, note: note.trim() || null },
      });
      setDelta("");
      setNote("");
      toast.success("Stok diperbarui");
      const qy = query(
        collection(db, "stockMoves"),
        where("orgId", "==", org.id),
        where("type", "==", "adjustment")
      );
      const snap = await getDocs(qy);
      const arr = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as any[];
      const mapName = new Map<string, string>();
      products.forEach((p) => mapName.set(p.id, p.name));
      arr.forEach((m) => {
        m.productName = mapName.get(m.productId) || m.productId;
      });
      arr.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
      );
      setHistory(arr as Move[]);
    } catch (e: any) {
      toast.error(e?.message || "Gagal penyesuaian stok");
    }
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Penyesuaian Stok</h1>

      <div className="card p-4 grid gap-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <select
            ref={prodSelRef}
            value={sel}
            onChange={(e) => setSel(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.category ? `(${p.category})` : ""} • Stok{" "}
                {Number(p.stock || 0)}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Delta (mis. 5 atau -3)"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
          />
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Opname</option>
            <option>Barang Rusak</option>
            <option>Hilang</option>
            <option>Koreksi</option>
            <option>Gratis/Promo</option>
            <option>Lainnya</option>
          </select>
          <input
            placeholder="Catatan (opsional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            onClick={submit}
            className="px-3 py-2 rounded bg-green-600 text-white"
          >
            Simpan
          </button>
        </div>
      </div>

      <div className="card p-4 grid gap-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Riwayat Penyesuaian</div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama/alasannya"
            className="w-64 max-w-full"
          />
        </div>
        <div className="grid gap-2 max-h-[520px] overflow-auto">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="p-2 rounded bg-black/5 grid grid-cols-[1fr_auto_auto] gap-2 items-center"
            >
              <div>
                <div className="text-sm opacity-70">
                  {m.adjustmentDate?.toDate
                    ? dayjs(m.adjustmentDate.toDate()).format("DD/MM/YYYY")
                    : "-"}{" "}
                  • {m.reason}
                </div>
                <div className="font-semibold">{m.productName}</div>
                <div className="text-xs opacity-70">
                  Stok: {m.stockBefore} → {m.stockAfter}
                </div>
                {m.note ? (
                  <div className="text-xs opacity-70">Catatan: {m.note}</div>
                ) : null}
              </div>
              <div
                className={`px-2 py-1 rounded text-sm ${m.delta >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
              >
                {m.delta >= 0 ? `+${m.delta}` : `${m.delta}`}
              </div>
              <div className="text-sm opacity-70">Rp 0</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="opacity-70">Belum ada penyesuaian</div>
          )}
        </div>
      </div>
    </div>
  );
}
