import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../store/cart";
import hotkeys from "hotkeys-js";
import { useAuth } from "../auth/AuthContext";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
  deleteDoc,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "../firebase";
import type { PaymentMethod, Sale } from "../types";
import dayjs from "dayjs";
import Receipt from "../shared/Receipt";
import { useSessionRole } from "../hooks/useSessionRole";
import { toast } from "../ui/toastStore";
import { useShift } from "../hooks/useShift";
import { auditLog } from "../lib/audit";

export default function Sales() {
  const { org, user } = useAuth();
  const { role } = useSessionRole();
  const cart = useCart();
  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [method, setMethod] = useState<PaymentMethod>("tunai");
  const [history, setHistory] = useState<Sale[]>([]);
  const [printing, setPrinting] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickPrice, setQuickPrice] = useState<number | "">("");
  const searchRef = useRef<HTMLInputElement>(null);
  const isAdmin = role === "admin";
  const { addCashSale } = useShift();

  useEffect(() => {
    hotkeys("f2,alt+k", (e, h) => {
      e.preventDefault();
      if (h.key === "f2") searchRef.current?.focus();
      if (h.key === "alt+k") doCheckout();
    });
    return () => hotkeys.unbind("f2,alt+k");
  }, [method, cart.items, date]);

  useEffect(() => {
    const load = async () => {
      if (!org) return;
      const q = query(collection(db, "sales"), where("orgId", "==", org.id));
      const snap = await getDocs(q);
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      arr.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
      );
      setHistory(arr);
    };
    load();
  }, [org]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!org) return;
      const q = query(collection(db, "products"), where("orgId", "==", org.id));
      const snap = await getDocs(q);
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      arr.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      );
      setProducts(arr);
    };
    loadProducts();
  }, [org]);

  const cats = Array.from(
    new Set(
      products.map((p) => String(p.category || "").trim()).filter(Boolean)
    )
  );
  const filtered = products.filter((p) => {
    const s = search.trim().toLowerCase();
    const okName = s ? String(p.name).toLowerCase().includes(s) : true;
    const okCat = category
      ? String(p.category || "").toLowerCase() === category.toLowerCase()
      : true;
    return okName && okCat;
  });

  const addFromProduct = (p: any) => {
    const inCart = cart.items.find((i) => i.productId === p.id);
    const usedQty = inCart ? inCart.qty : 0;
    if ((p.stock || 0) - usedQty <= 0) {
      toast.error("Stok habis untuk " + p.name);
      return;
    }
    cart.add({
      productId: p.id,
      name: p.name,
      price: Number(p.price || 0),
      qty: 1,
    });
    toast.info(p.name + " ditambahkan ke keranjang");
  };

  const addQuick = () => {
    if (!isAdmin) {
      toast.error("Hanya admin yang dapat menambah item custom");
      return;
    }
    if (!quickName || !quickPrice) {
      toast.error("Isi nama dan harga");
      return;
    }
    cart.add({ name: quickName, price: Number(quickPrice), qty: 1 });
    setQuickName("");
    setQuickPrice("");
    toast.success("Item custom ditambahkan");
  };

  const total = useMemo(() => cart.total(), [cart]);
  const ensureMethod = (m: any): PaymentMethod => {
    const allowed: any[] = ["qris", "tunai", "kartu", "grab"];
    return allowed.includes(String(m)) ? m : "tunai";
  };

  const doCheckout = async () => {
    if (!org) return toast.error("Organisasi belum siap");
    if (cart.items.length === 0) return toast.error("Keranjang kosong");
    try {
      let cogsCalc = 0;
      await runTransaction(db, async (tx) => {
        const prodItems = cart.items.filter((i) => i.productId);
        const reads: {
          ref: any;
          cur: any;
          need: number;
          name: string;
        }[] = [];
        for (const i of prodItems) {
          const pref = doc(db, "products", String(i.productId));
          const snap = await tx.get(pref);
          if (!snap.exists())
            throw new Error("Produk tidak ditemukan: " + i.name);
          reads.push({
            ref: pref,
            cur: snap.data(),
            need: Number(i.qty || 1),
            name: i.name,
          });
        }
        for (const r of reads) {
          const stok = Number(r.cur?.stock || 0);
          if (stok < r.need)
            throw new Error("Stok tidak cukup untuk " + r.name);
          const hasM = Boolean(r.cur?.hasMeasure);
          if (hasM) {
            const perItem = Number(r.cur?.contentPerItem || 0);
            const beforeContent = Number(r.cur?.stockContent || 0);
            const decContent = r.need * perItem;
            if (beforeContent < decContent)
              throw new Error("Stok isi tidak cukup untuk " + r.name);
          }
        }
        cogsCalc = reads.reduce(
          (acc, r) => acc + Number(r.need) * Number(r.cur?.avgCost || 0),
          0
        );
        for (const r of reads) {
          const stok = Number(r.cur?.stock || 0);
          const hasM = Boolean(r.cur?.hasMeasure);
          const perItem = Number(r.cur?.contentPerItem || 0);
          const beforeContent = Number(r.cur?.stockContent || 0);
          const upd: any = { stock: stok - r.need };
          if (hasM) {
            const decContent = r.need * perItem;
            upd.stockContent = beforeContent - decContent;
          }
          tx.update(r.ref, upd);
        }
      });

      const m = ensureMethod(method);
      const total = cart.total();
      const grossProfit = total - cogsCalc;
      const margin = total > 0 ? +((grossProfit / total) * 100).toFixed(2) : 0;

      const payload = {
        orgId: org.id,
        date: Timestamp.fromDate(dayjs(date).toDate()),
        items: cart.items.map((i) => ({
          productId: i.productId || null,
          name: i.name,
          qty: Number(i.qty || 1),
          price: Number(i.price || 0),
        })),
        paymentMethod: m,
        total,
        cogs: cogsCalc,
        grossProfit,
        margin,
        source: m === "grab" ? "grab" : "offline",
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "sales"), payload as any);

      await auditLog({
        orgId: org.id,
        user,
        entity: "sale",
        action: "create",
        entityId: ref.id,
        after: {
          total,
          paymentMethod: m,
          itemCount: cart.items.length,
          cogs: cogsCalc,
          grossProfit,
          margin,
        },
      });

      if (m === "tunai") {
        try {
          await addCashSale(total);
        } catch {}
      }

      setPrinting({
        date: dayjs(date).format("DD/MM/YYYY"),
        items: cart.items,
        total,
        method: m,
      });
      cart.clear();
      toast.success("Transaksi tersimpan");

      const q = query(collection(db, "products"), where("orgId", "==", org.id));
      const snap = await getDocs(q);
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      arr.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      );
      setProducts(arr);
    } catch (e: any) {
      toast.error(e?.message || "Gagal checkout");
    }
  };

  const removeSale = async (s: Sale) => {
    if (!isAdmin) return toast.error("Hanya admin yang dapat menghapus");
    await deleteDoc(doc(db, "sales", s.id));
    await auditLog({
      orgId: org.id,
      user,
      entity: "sale",
      action: "delete",
      entityId: s.id,
      before: { total: s.total, paymentMethod: s.paymentMethod },
    });
    setHistory((h) => h.filter((x) => x.id !== s.id));
    toast.success("Penjualan dihapus");
  };

  const editSaleTotal = async (s: Sale) => {
    if (!isAdmin) return toast.error("Hanya admin yang dapat mengedit");
    const nv = prompt("Ubah total (angka)", String(s.total));
    if (!nv) return;
    await updateDoc(doc(db, "sales", s.id), { total: Number(nv) });
    await auditLog({
      orgId: org.id,
      user,
      entity: "sale",
      action: "update",
      entityId: s.id,
      before: { total: s.total },
      after: { total: Number(nv) },
    });
    setHistory((h) =>
      h.map((x) => (x.id === s.id ? { ...x, total: Number(nv) } : x))
    );
    toast.success("Total diperbarui");
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Penjualan</h1>

      <div className="card p-4 grid gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70">Tanggal</span>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70">Metode</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
            >
              <option value="qris">QRIS</option>
              <option value="tunai">Tunai</option>
              <option value="kartu">Kartu</option>
              <option value="grab">Grab</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70">Cari</span>
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk"
              className="flex-1"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Semua</option>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="Nama custom (admin)"
            />
            <input
              value={quickPrice}
              onChange={(e) =>
                setQuickPrice(e.target.value ? Number(e.target.value) : "")
              }
              placeholder="Harga custom"
              type="number"
            />
            <button
              onClick={addQuick}
              className="px-3 py-2 rounded bg-blue-600 text-white"
            >
              Tambah ke Keranjang
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[300px] overflow-auto">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addFromProduct(p)}
                className="p-3 rounded-xl bg-black/5 hover:bg-black/[.08] text-left"
              >
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm opacity-70">{p.category || "-"}</div>
                <div className="text-sm">
                  Rp {Number(p.price || 0).toLocaleString("id-ID")}
                </div>
                <div className="text-xs opacity-70">
                  Stok: {Number(p.stock || 0)}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Keranjang</h3>
            <div className="grid gap-2">
              {cart.items.map((it) => (
                <div
                  key={it.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 p-2 rounded bg-black/5"
                >
                  <span>{it.name}</span>
                  {isAdmin ? (
                    <input
                      type="number"
                      value={it.price}
                      onChange={(e) =>
                        cart.add({
                          id: it.id,
                          productId: it.productId,
                          name: it.name,
                          price: Number(e.target.value || 0),
                          qty: it.qty,
                        })
                      }
                      className="w-28"
                    />
                  ) : (
                    <span>Rp {it.price.toLocaleString("id-ID")}</span>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cart.dec(it.id)}
                      className="px-2 rounded bg-black/10"
                    >
                      -
                    </button>
                    <input
                      value={it.qty}
                      onChange={(e) =>
                        cart.setQty(it.id, Number(e.target.value || 1))
                      }
                      type="number"
                      className="w-14"
                    />
                    <button
                      onClick={() => cart.inc(it.id)}
                      className="px-2 rounded bg-black/10"
                    >
                      +
                    </button>
                  </div>
                  <span>
                    = Rp {(it.qty * it.price).toLocaleString("id-ID")}
                  </span>
                  <button
                    onClick={() => {
                      cart.remove(it.id);
                      toast.info("Item dihapus");
                    }}
                    className="px-2 py-1 rounded bg-red-500/90 text-white"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xl font-bold">
                Total: Rp {total.toLocaleString("id-ID")}
              </div>
              <button
                onClick={doCheckout}
                className="px-4 py-2 rounded-lg bg-green-600 text-white"
              >
                Checkout (Alt+K)
              </button>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-2">Riwayat Penjualan</h3>
          <div className="grid gap-2 max-h-[500px] overflow-auto">
            {history.map((s) => (
              <div
                key={s.id}
                className="p-2 rounded bg-black/5 flex flex-col gap-1"
              >
                <div className="text-sm opacity-70">
                  {dayjs((s as any).date?.toDate?.() || new Date()).format(
                    "DD/MM/YYYY"
                  )}{" "}
                  • {String(s.paymentMethod || "").toUpperCase()}
                </div>
                <div className="font-semibold">
                  Rp {Number(s.total || 0).toLocaleString("id-ID")}
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() =>
                      setPrinting({
                        date: dayjs(
                          (s as any).date?.toDate?.() || new Date()
                        ).format("DD/MM/YYYY"),
                        items: s.items,
                        total: s.total,
                        method: s.paymentMethod,
                      })
                    }
                    className="px-2 py-1 rounded bg-black/10"
                  >
                    Cetak Struk
                  </button>
                  <button
                    onClick={() => editSaleTotal(s)}
                    className="px-2 py-1 rounded bg-black/10"
                  >
                    Edit Total
                  </button>
                  <button
                    onClick={() => removeSale(s)}
                    className="px-2 py-1 rounded bg-red-500/90 text-white"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {printing && (
        <Receipt data={printing} onClose={() => setPrinting(null)} />
      )}
    </div>
  );
}
