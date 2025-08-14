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
import { useShift } from "../hooks/useShift";

type PurchaseKind = "inventory" | "other";

type PurchaseItem = {
  productId: string;
  name: string;
  qty: number;
  unitCost: number;
};

type MiscItem = {
  name: string;
  amount: number;
};

type Purchase = {
  id: string;
  orgId: string;
  date?: any;
  supplier?: string;
  method?: "tunai" | "qris" | "transfer" | "kartu" | string;
  kind?: PurchaseKind;
  items?: PurchaseItem[];
  itemsOther?: MiscItem[];
  total?: number;
  createdAt?: any;
  voidedAt?: any | null;
  voidedByUid?: string | null;
};

const METHOD_LABEL = (m?: string) => {
  const s = (m || "").toString().trim().toLowerCase();
  return s ? s.toUpperCase() : "-";
};

const DERIVE_KIND = (p: Purchase): PurchaseKind => {
  if (p.kind === "inventory" || p.kind === "other") return p.kind;
  const hasInv =
    Array.isArray(p.items) && p.items.some((it) => !!it?.productId);
  return hasInv ? "inventory" : "other";
};

export default function Purchases() {
  const { org, user } = useAuth();
  const { role } = useSessionRole();
  const canAdmin = role === "admin";
  const { addCashOut } = useShift();

  const [products, setProducts] = useState<any[]>([]);
  const [list, setList] = useState<Purchase[]>([]);

  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [supplier, setSupplier] = useState("");
  const [method, setMethod] =
    useState<NonNullable<Purchase["method"]>>("tunai");
  const [kind, setKind] = useState<PurchaseKind>("inventory");

  const [selProduct, setSelProduct] = useState<string>("");
  const [qty, setQty] = useState<number | "">("");
  const [unitCost, setUnitCost] = useState<number | "">("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const prodSelRef = useRef<HTMLSelectElement>(null);

  const [miscName, setMiscName] = useState("");
  const [miscAmount, setMiscAmount] = useState<number | "">("");
  const [itemsOther, setItemsOther] = useState<MiscItem[]>([]);

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
      if (!selProduct && arr.length) setSelProduct(arr[0].id);
    };
    const loadPurchases = async () => {
      if (!org) return;
      const qy = query(
        collection(db, "purchases"),
        where("orgId", "==", org.id)
      );
      const snap = await getDocs(qy);
      const arr = snap.docs.map((d) => {
        const data = d.data() as any;
        const p: Purchase = {
          id: d.id,
          orgId: data.orgId,
          date: data.date,
          supplier: data.supplier ?? "",
          method: data.method ?? "",
          kind: data.kind ?? undefined,
          items: Array.isArray(data.items) ? data.items : [],
          itemsOther: Array.isArray(data.itemsOther) ? data.itemsOther : [],
          total: Number(data.total || 0),
          createdAt: data.createdAt,
          voidedAt: data.voidedAt ?? null,
          voidedByUid: data.voidedByUid ?? null,
        };
        return p;
      });
      arr.sort(
        (a, b) =>
          (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
      );
      arr.reverse();
      setList(arr);
    };
    loadProducts();
    loadPurchases();
  }, [org?.id]);

  const addItem = () => {
    if (!selProduct) return toast.error("Pilih produk");
    if (!qty || !unitCost) return toast.error("Isi qty dan harga modal");
    const p = products.find((x) => x.id === selProduct);
    if (!p) return toast.error("Produk tidak ditemukan");
    const exists = items.findIndex((it) => it.productId === selProduct);
    const obj: PurchaseItem = {
      productId: selProduct,
      name: p.name,
      qty: Number(qty || 0),
      unitCost: Number(unitCost || 0),
    };
    if (exists >= 0) {
      const copy = [...items];
      copy[exists] = {
        ...copy[exists],
        qty: copy[exists].qty + obj.qty,
        unitCost: obj.unitCost,
      };
      setItems(copy);
    } else {
      setItems((prev) => [...prev, obj]);
    }
    setQty("");
    setUnitCost("");
    prodSelRef.current?.focus();
  };
  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((x) => x.productId !== id));

  const addMisc = () => {
    if (!miscName.trim() || !miscAmount)
      return toast.error("Isi nama dan harga");
    setItemsOther((prev) => [
      ...prev,
      { name: miscName.trim(), amount: Number(miscAmount || 0) },
    ]);
    setMiscName("");
    setMiscAmount("");
  };
  const removeMisc = (name: string) =>
    setItemsOther((prev) => prev.filter((x) => x.name !== name));

  const totalInventory = useMemo(
    () => items.reduce((s, it) => s + it.qty * it.unitCost, 0),
    [items]
  );
  const totalOther = useMemo(
    () => itemsOther.reduce((s, it) => s + Number(it.amount || 0), 0),
    [itemsOther]
  );
  const total = kind === "inventory" ? totalInventory : totalOther;

  const save = async () => {
    if (!org) return toast.error("Organisasi belum siap");
    if (!canAdmin) return toast.error("Hanya admin");
    const supplierName = supplier.trim() || "Tanpa Pemasok";
    if (kind === "inventory" && !items.length)
      return toast.error("Item kosong");
    if (kind === "other" && !itemsOther.length)
      return toast.error("Item kosong");

    try {
      if (kind === "inventory") {
        const purchaseId = await runTransaction(db, async (tx) => {
          const pref = doc(collection(db, "purchases"));
          const payload = {
            orgId: org.id,
            date: Timestamp.fromDate(dayjs(date).toDate()),
            supplier: supplierName,
            method: method || "tunai",
            kind: "inventory",
            items,
            itemsOther: [],
            total,
            createdAt: serverTimestamp(),
            voidedAt: null,
            voidedByUid: null,
          };

          for (const it of items) {
            const prodRef = doc(db, "products", it.productId);
            const snap = await tx.get(prodRef);
            if (!snap.exists())
              throw new Error("Produk tidak ditemukan: " + it.name);

            const data = snap.data() as any;
            const beforeStock = Number(data?.stock || 0);
            const beforeAvg = Number(data?.avgCost || 0);
            const beforeContent = Number(data?.stockContent || 0);
            const hasM = Boolean(data?.hasMeasure);
            const unit = data?.measureUnit || null;
            const perItem = Number(data?.contentPerItem || 0);

            const addQty = Number(it.qty || 0);
            const unitCost = Number(it.unitCost || 0);

            const afterStock = beforeStock + addQty;
            const afterAvg =
              afterStock > 0
                ? (beforeAvg * beforeStock + unitCost * addQty) / afterStock
                : 0;

            const addContent = hasM ? addQty * perItem : 0;
            const afterContent = hasM
              ? beforeContent + addContent
              : beforeContent;

            tx.update(prodRef, {
              stock: afterStock,
              avgCost: afterAvg,
              ...(hasM ? { stockContent: afterContent } : {}),
            });

            const mref = doc(collection(db, "stockMoves"));
            tx.set(mref, {
              orgId: org.id,
              productId: it.productId,
              type: "purchase",
              qty: addQty,
              stockBefore: beforeStock,
              stockAfter: afterStock,
              avgBefore: beforeAvg,
              avgAfter: afterAvg,
              unitCost,
              measureUnit: hasM ? unit : null,
              contentDelta: hasM ? addContent : 0,
              contentBefore: hasM ? beforeContent : 0,
              contentAfter: hasM ? afterContent : 0,
              reason: `Pembelian dari ${supplierName}`,
              purchaseId: pref.id,
              createdAt: serverTimestamp(),
              byUid: user?.uid || null,
            });
          }

          tx.set(pref, payload as any);
          return pref.id;
        });

        await auditLog({
          orgId: org.id,
          user,
          entity: "purchase",
          action: "create",
          entityId: purchaseId,
          after: {
            supplier: supplierName,
            method: method || "tunai",
            kind: "inventory",
            total,
            itemCount: items.length,
          },
        });

        if ((method || "tunai") === "tunai") {
          try {
            await addCashOut(
              total,
              `Pembelian bahan baku dari ${supplierName}`
            );
          } catch {}
        }
      } else {
        const ref = await addDoc(collection(db, "purchases"), {
          orgId: org.id,
          date: Timestamp.fromDate(dayjs(date).toDate()),
          supplier: supplierName,
          method: method || "tunai",
          kind: "other",
          items: [],
          itemsOther,
          total,
          createdAt: serverTimestamp(),
          voidedAt: null,
          voidedByUid: null,
        } as any);

        await auditLog({
          orgId: org.id,
          user,
          entity: "purchase",
          action: "create",
          entityId: ref.id,
          after: {
            supplier: supplierName,
            method: method || "tunai",
            kind: "other",
            total,
            itemCount: itemsOther.length,
          },
        });

        if ((method || "tunai") === "tunai") {
          try {
            await addCashOut(total, `Pembelian lainnya dari ${supplierName}`);
          } catch {}
        }
      }

      setSupplier("");
      setItems([]);
      setItemsOther([]);
      toast.success("Pembelian disimpan");

      const qy = query(
        collection(db, "purchases"),
        where("orgId", "==", org.id)
      );
      const snap = await getDocs(qy);
      const arr = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          orgId: data.orgId,
          date: data.date,
          supplier: data.supplier ?? "",
          method: data.method ?? "",
          kind: data.kind ?? undefined,
          items: Array.isArray(data.items) ? data.items : [],
          itemsOther: Array.isArray(data.itemsOther) ? data.itemsOther : [],
          total: Number(data.total || 0),
          createdAt: data.createdAt,
          voidedAt: data.voidedAt ?? null,
          voidedByUid: data.voidedByUid ?? null,
        } as Purchase;
      });
      arr.sort(
        (a, b) =>
          (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
      );
      arr.reverse();
      setList(arr);
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan pembelian");
    }
  };

  const voidPurchase = async (p: Purchase) => {
    if (!org) return;
    if (!canAdmin) return toast.error("Hanya admin");
    if (p.voidedAt) return toast.info("Dokumen ini sudah dibatalkan");

    const realKind = DERIVE_KIND(p);

    try {
      if (realKind === "inventory") {
        const safeItems = Array.isArray(p.items) ? p.items : [];
        await runTransaction(db, async (tx) => {
          for (const it of safeItems) {
            const pref = doc(db, "products", it.productId);
            const snap = await tx.get(pref);
            if (!snap.exists())
              throw new Error("Produk tidak ditemukan: " + it.name);
            const cur = Number((snap.data() as any)?.stock || 0);
            if (cur < it.qty) {
              throw new Error(
                `Tidak bisa void. Stok ${it.name} tidak cukup (${cur} < ${it.qty}).`
              );
            }
          }
          for (const it of safeItems) {
            const pref = doc(db, "products", it.productId);
            const snap = await tx.get(pref);
            const before = Number((snap.data() as any)?.stock || 0);
            const after = before - it.qty;
            // Catatan: avgCost tidak diubah saat void (rollback average itu kompleks).
            tx.update(pref, { stock: after });

            const mref = doc(collection(db, "stockMoves"));
            tx.set(mref, {
              orgId: org.id,
              productId: it.productId,
              type: "purchase_void",
              qty: Number(it.qty || 0),
              stockBefore: before,
              stockAfter: after,
              unitCost: Number(it.unitCost || 0),
              reason: `Void pembelian ${p.id}`,
              purchaseId: p.id,
              createdAt: serverTimestamp(),
              byUid: user?.uid || null,
            });
          }
          tx.set(
            doc(db, "purchases", p.id),
            { voidedAt: serverTimestamp(), voidedByUid: user?.uid || null },
            { merge: true }
          );
        });
      } else {
        await setDoc(
          doc(db, "purchases", p.id),
          { voidedAt: serverTimestamp(), voidedByUid: user?.uid || null },
          { merge: true }
        );
      }

      await auditLog({
        orgId: org.id,
        user,
        entity: "purchase",
        action: "delete",
        entityId: p.id,
        before: {
          supplier: p.supplier || "",
          total: Number(p.total || 0),
          kind: realKind,
        },
        after: { status: "void" },
      });

      toast.success("Pembelian dibatalkan");
      const qy = query(
        collection(db, "purchases"),
        where("orgId", "==", org.id)
      );
      const snap = await getDocs(qy);
      const arr = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          orgId: data.orgId,
          date: data.date,
          supplier: data.supplier ?? "",
          method: data.method ?? "",
          kind: data.kind ?? undefined,
          items: Array.isArray(data.items) ? data.items : [],
          itemsOther: Array.isArray(data.itemsOther) ? data.itemsOther : [],
          total: Number(data.total || 0),
          createdAt: data.createdAt,
          voidedAt: data.voidedAt ?? null,
          voidedByUid: data.voidedByUid ?? null,
        } as Purchase;
      });
      arr.sort(
        (a, b) =>
          (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
      );
      arr.reverse();
      setList(arr);
    } catch (e: any) {
      toast.error(e?.message || "Gagal membatalkan pembelian");
    }
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Pembelian</h1>

      <div className="card p-4 grid gap-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            placeholder="Pemasok (boleh kosong)"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
          >
            <option value="tunai">Tunai</option>
            <option value="qris">QRIS</option>
            <option value="transfer">Transfer</option>
            <option value="kartu">Kartu</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70">Jenis</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as PurchaseKind)}
            >
              <option value="inventory">Bahan Baku</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
          <div className="md:col-span-2 text-sm opacity-70 self-center">
            Total: <b>Rp {total.toLocaleString("id-ID")}</b>
          </div>
        </div>

        {kind === "inventory" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <select
                ref={prodSelRef}
                value={selProduct}
                onChange={(e) => setSelProduct(e.target.value)}
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
                placeholder="Qty"
                value={qty}
                onChange={(e) =>
                  setQty(e.target.value ? Number(e.target.value) : "")
                }
              />
              <input
                type="number"
                placeholder="Harga modal/unit"
                value={unitCost}
                onChange={(e) =>
                  setUnitCost(e.target.value ? Number(e.target.value) : "")
                }
              />
              <button
                onClick={addItem}
                className="px-3 py-2 rounded bg-blue-600 text-white"
              >
                Tambah Item
              </button>
            </div>

            <div className="grid gap-2">
              {items.map((it) => (
                <div
                  key={it.productId}
                  className="p-2 rounded bg-black/5 grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center"
                >
                  <div>
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-xs opacity-70">ID: {it.productId}</div>
                  </div>
                  <div>Qty: {it.qty}</div>
                  <div>Unit: Rp {it.unitCost.toLocaleString("id-ID")}</div>
                  <button
                    onClick={() => removeItem(it.productId)}
                    className="px-2 py-1 rounded bg-red-500/90 text-white"
                  >
                    Hapus
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <div className="opacity-70 text-sm">Belum ada item</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <input
                placeholder="Nama barang (mis. Susu)"
                value={miscName}
                onChange={(e) => setMiscName(e.target.value)}
              />
              <input
                type="number"
                placeholder="Harga"
                value={miscAmount}
                onChange={(e) =>
                  setMiscAmount(e.target.value ? Number(e.target.value) : "")
                }
              />
              <button
                onClick={addMisc}
                className="px-3 py-2 rounded bg-blue-600 text-white"
              >
                Tambah Item
              </button>
            </div>

            <div className="grid gap-2">
              {itemsOther.map((it) => (
                <div
                  key={it.name + it.amount}
                  className="p-2 rounded bg-black/5 grid grid-cols-[1fr_auto_auto] gap-2 items-center"
                >
                  <div className="font-semibold">{it.name}</div>
                  <div>Rp {Number(it.amount || 0).toLocaleString("id-ID")}</div>
                  <button
                    onClick={() => removeMisc(it.name)}
                    className="px-2 py-1 rounded bg-red-500/90 text-white"
                  >
                    Hapus
                  </button>
                </div>
              ))}
              {itemsOther.length === 0 && (
                <div className="opacity-70 text-sm">Belum ada item</div>
              )}
            </div>
          </>
        )}

        <div>
          <button
            onClick={save}
            className="px-4 py-2 rounded bg-green-600 text-white"
          >
            Simpan Pembelian
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="font-semibold mb-2">Riwayat Pembelian</div>
        <div className="grid gap-2 max-h-[520px] overflow-auto">
          {list.map((p) => {
            const labelDate = p.date?.toDate
              ? dayjs(p.date.toDate()).format("DD/MM/YYYY")
              : "-";
            const labelMethod = METHOD_LABEL(p.method);
            const realKind = DERIVE_KIND(p);
            const isVoid = Boolean(p.voidedAt);
            const total = Number(p.total || 0);
            const invCount = Array.isArray(p.items) ? p.items.length : 0;
            const miscCount = Array.isArray(p.itemsOther)
              ? p.itemsOther.length
              : 0;
            const count = realKind === "inventory" ? invCount : miscCount;

            return (
              <div
                key={p.id}
                className={`p-2 rounded grid grid-cols-[1fr_auto_auto] items-center gap-2 ${
                  isVoid ? "bg-red-50" : "bg-black/5"
                }`}
              >
                <div>
                  <div className="text-sm opacity-70">
                    {labelDate} • {p.supplier || "-"} • {labelMethod} •{" "}
                    {realKind === "inventory" ? "Bahan Baku" : "Lainnya"}
                  </div>
                  <div className="font-semibold">
                    Rp {total.toLocaleString("id-ID")}{" "}
                    {isVoid ? (
                      <span className="text-red-600 text-xs">(VOID)</span>
                    ) : null}
                  </div>
                  <div className="text-xs opacity-70">{count} item</div>
                </div>
                {!isVoid && canAdmin && (
                  <button
                    onClick={() => voidPurchase(p)}
                    className="px-2 py-1 rounded bg-black/10"
                  >
                    Void
                  </button>
                )}
                {isVoid && <div className="text-xs opacity-70">Dibatalkan</div>}
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="opacity-70">Belum ada pembelian</div>
          )}
        </div>
      </div>
    </div>
  );
}
