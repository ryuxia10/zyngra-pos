import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";
import { toast } from "../ui/toastStore";
import { useSessionRole } from "../hooks/useSessionRole";
import { auditLog } from "../lib/audit";

export default function Inventory() {
  const { org, user, userDoc } = useAuth();
  const { role } = useSessionRole();
  const canAdmin = role === "admin";

  const [products, setProducts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [moves, setMoves] = useState<any[]>([]);
  const [delta, setDelta] = useState<number | "">("");
  const [count, setCount] = useState<number | "">("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const load = async () => {
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
      if (!selectedId && arr.length) setSelectedId(arr[0].id);
    };
    load();
  }, [org?.id]);

  useEffect(() => {
    const load = async () => {
      if (!org || !selectedId) {
        setMoves([]);
        return;
      }
      const qy = query(
        collection(db, "stockMoves"),
        where("orgId", "==", org.id),
        where("productId", "==", selectedId)
      );
      const snap = await getDocs(qy);
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      arr.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
      );
      setMoves(arr.slice(0, 100));
    };
    load();
  }, [org?.id, selectedId]);

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId),
    [products, selectedId]
  );

  const adjust = async (sign: 1 | -1) => {
    if (!org || !userDoc || !selected) return;
    if (!canAdmin) {
      toast.error("Hanya admin");
      return;
    }
    const v = Number(delta || 0) * sign;
    if (!Number.isFinite(v) || v === 0) {
      toast.error("Jumlah tidak valid");
      return;
    }
    try {
      await runTransaction(db, async (tx) => {
        const pref = doc(db, "products", selected.id);
        const snap = await tx.get(pref);
        const cur = snap.data() as any;
        const before = Number(cur?.stock || 0);
        const after = before + v;
        if (after < 0) throw new Error("Stok tidak boleh negatif");
        tx.update(pref, { stock: after });
        await addDoc(collection(db, "stockMoves"), {
          orgId: org.id,
          productId: selected.id,
          type: v > 0 ? "adjust_in" : "adjust_out",
          qty: Math.abs(v),
          stockBefore: before,
          stockAfter: after,
          reason: reason || "",
          createdAt: serverTimestamp(),
          byUid: userDoc.uid,
        });
      });
      await auditLog({
        orgId: org.id,
        user,
        entity: "stock",
        action: "adjust",
        entityId: selected.id,
        after: { delta: v, reason },
      });
      setDelta("");
      setReason("");
      toast.success("Mutasi stok tersimpan");
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
    } catch (e: any) {
      toast.error(e?.message || "Gagal mutasi");
    }
  };

  const opname = async () => {
    if (!org || !userDoc || !selected) return;
    if (!canAdmin) {
      toast.error("Hanya admin");
      return;
    }
    const target = Number(count || 0);
    if (!Number.isFinite(target) || target < 0) {
      toast.error("Jumlah tidak valid");
      return;
    }
    try {
      await runTransaction(db, async (tx) => {
        const pref = doc(db, "products", selected.id);
        const snap = await tx.get(pref);
        const cur = snap.data() as any;
        const before = Number(cur?.stock || 0);
        const after = target;
        tx.update(pref, { stock: after });
        await addDoc(collection(db, "stockMoves"), {
          orgId: org.id,
          productId: selected.id,
          type: "opname",
          qty: Math.abs(after - before),
          stockBefore: before,
          stockAfter: after,
          reason: reason || "Opname",
          createdAt: serverTimestamp(),
          byUid: userDoc.uid,
        });
      });
      await auditLog({
        orgId: org.id,
        user,
        entity: "stock",
        action: "opname",
        entityId: selected.id,
        after: { to: target, reason },
      });
      setCount("");
      setReason("");
      toast.success("Opname tersimpan");
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
    } catch (e: any) {
      toast.error(e?.message || "Gagal opname");
    }
  };

  const setMinStock = async () => {
    if (!org || !selected) return;
    if (!canAdmin) {
      toast.error("Hanya admin");
      return;
    }
    const nv = prompt("Set minimum stok", String(selected.minStock ?? 0));
    if (nv === null) return;
    const val = Number(nv);
    if (!Number.isFinite(val) || val < 0) {
      toast.error("Nilai tidak valid");
      return;
    }
    await setDoc(
      doc(db, "products", selected.id),
      { minStock: val },
      { merge: true }
    );
    const upd = products.map((p) =>
      p.id === selected.id ? { ...p, minStock: val } : p
    );
    setProducts(upd);
    toast.success("Min stok disimpan");
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Stok</h1>

      <div className="card p-4 grid gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.category ? `(${p.category})` : ""} • Stok{" "}
                {Number(p.stock || 0)}
              </option>
            ))}
          </select>
          <button
            onClick={setMinStock}
            className="px-3 py-2 rounded bg-black/10"
          >
            Atur Min Stok
          </button>
          {selected && (
            <div className="text-sm opacity-70">
              Min: {Number(selected.minStock || 0)} •
              {Number(selected.stock || 0) <= Number(selected.minStock || 0)
                ? " Stok menipis"
                : " Stok aman"}
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 grid md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <div className="font-semibold">Penyesuaian +</div>
          <input
            type="number"
            placeholder="Jumlah"
            value={delta}
            onChange={(e) =>
              setDelta(e.target.value ? Number(e.target.value) : "")
            }
          />
          <input
            placeholder="Keterangan (opsional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            onClick={() => adjust(1)}
            className="px-3 py-2 rounded bg-green-600 text-white w-fit"
          >
            Tambah Stok
          </button>
        </div>
        <div className="grid gap-2">
          <div className="font-semibold">Penyesuaian −</div>
          <input
            type="number"
            placeholder="Jumlah"
            value={delta}
            onChange={(e) =>
              setDelta(e.target.value ? Number(e.target.value) : "")
            }
          />
          <input
            placeholder="Keterangan (opsional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            onClick={() => adjust(-1)}
            className="px-3 py-2 rounded bg-red-600 text-white w-fit"
          >
            Kurangi Stok
          </button>
        </div>
        <div className="grid gap-2">
          <div className="font-semibold">Opname</div>
          <input
            type="number"
            placeholder="Set ke jumlah"
            value={count}
            onChange={(e) =>
              setCount(e.target.value ? Number(e.target.value) : "")
            }
          />
          <input
            placeholder="Keterangan (opsional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            onClick={opname}
            className="px-3 py-2 rounded bg-black text-white w-fit"
          >
            Simpan Opname
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="font-semibold mb-2">Riwayat Mutasi</div>
        <div className="grid gap-2 max-height-[520px] overflow-auto">
          {moves.map((m) => (
            <div
              key={m.id}
              className="p-2 rounded bg-black/5 flex items-center justify-between"
            >
              <div className="text-sm">
                {m.type === "adjust_in"
                  ? "IN +"
                  : m.type === "adjust_out"
                    ? "OUT −"
                    : m.type === "opname"
                      ? "OPNAME"
                      : "SALE"}
                {" • "} {m.reason || "-"}
              </div>
              <div className="text-sm">
                {m.stockBefore} → {m.stockAfter}
                {" • "}{" "}
                {m.createdAt?.toDate
                  ? dayjs(m.createdAt.toDate()).format("DD/MM HH:mm")
                  : "-"}
              </div>
            </div>
          ))}
          {moves.length === 0 && (
            <div className="opacity-70 text-sm">Belum ada mutasi</div>
          )}
        </div>
      </div>
    </div>
  );
}
