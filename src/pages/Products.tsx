import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { auditLog } from "../lib/audit";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useSessionRole } from "../hooks/useSessionRole";
import { toast } from "../ui/toastStore";

type Row = {
  name: string;
  category?: string;
  price?: number;
  stock?: number;
  barcode?: string;
  minStock?: number;
  hasMeasure?: boolean;
  measureUnit?: string;
  contentPerItem?: number;
  stockContent?: number;
  minContent?: number;
};

const UNITS = ["pcs", "ml", "l", "g", "kg"];

export default function Products() {
  const { org, user, userDoc } = useAuth();
  const { role } = useSessionRole();
  const canAdmin = role === "admin";

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [stock, setStock] = useState<number | "">("");
  const [barcode, setBarcode] = useState("");
  const [minStock, setMinStock] = useState<number | "">("");

  const [hasMeasure, setHasMeasure] = useState(false);
  const [measureUnit, setMeasureUnit] = useState("ml");
  const [contentPerItem, setContentPerItem] = useState<number | "">("");
  const [stockContent, setStockContent] = useState<number | "">("");
  const [minContent, setMinContent] = useState<number | "">("");

  const [list, setList] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [newCat, setNewCat] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  const loadProducts = async () => {
    if (!org) return;
    const qy = query(collection(db, "products"), where("orgId", "==", org.id));
    const snap = await getDocs(qy);
    const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    arr.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
    setList(arr);
  };
  const loadCats = async () => {
    if (!org) return;
    const qy = query(
      collection(db, "categories"),
      where("orgId", "==", org.id)
    );
    const snap = await getDocs(qy);
    const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    arr.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
    setCats(arr);
  };

  useEffect(() => {
    loadProducts();
    loadCats();
  }, [org?.id]);

  useEffect(() => {
    if (!list.length) return;
    const lows = list.filter((p) => {
      const hm = Boolean(p.hasMeasure);
      if (hm) {
        const sc = Number(p.stockContent || 0);
        const mc = Number(p.minContent || 0);
        return mc > 0 && sc <= mc;
      } else {
        const s = Number(p.stock || 0);
        const ms = Number(p.minStock || 0);
        return ms > 0 && s <= ms;
      }
    });
    if (lows.length) toast.info(`${lows.length} produk mendekati habis`);
  }, [list]);

  const addProduct = async () => {
    if (!org || !userDoc) return;
    if (!name || !category) {
      toast.error("Nama dan kategori wajib diisi");
      return;
    }
    if (!price || price <= 0) {
      toast.error("Harga tidak valid");
      return;
    }
    if (!hasMeasure) {
      if (!stock || stock < 0) {
        toast.error("Stok item tidak valid");
        return;
      }
    } else {
      if (!contentPerItem || Number(contentPerItem) <= 0) {
        toast.error("Isi per item harus > 0");
        return;
      }
      if (stockContent === "" || Number(stockContent) < 0) {
        toast.error("Stok isi tidak valid");
        return;
      }
    }

    const payload: any = {
      orgId: org.id,
      createdByUid: userDoc.uid,
      name,
      category,
      price: Number(price),
      barcode: barcode.trim() || null,
      minStock: Number(minStock || 0),
      hasMeasure,
      measureUnit: hasMeasure ? measureUnit : null,
      contentPerItem: hasMeasure ? Number(contentPerItem || 0) : 0,
      stock: hasMeasure ? Number(0) : Number(stock || 0),
      stockContent: hasMeasure ? Number(stockContent || 0) : 0,
      minContent: hasMeasure ? Number(minContent || 0) : 0,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "products"), payload);
    await auditLog({
      orgId: org.id,
      user,
      entity: "product",
      action: "create",
      entityId: docRef.id,
      after: payload,
    });

    setName("");
    setCategory("");
    setPrice("");
    setStock("");
    setBarcode("");
    setMinStock("");
    setHasMeasure(false);
    setMeasureUnit("ml");
    setContentPerItem("");
    setStockContent("");
    setMinContent("");
    await loadProducts();
    toast.success("Produk ditambahkan");
  };

  const editProduct = async (p: any) => {
    if (!canAdmin) {
      toast.error("Hanya admin");
      return;
    }
    const newName = prompt("Ubah nama", String(p.name ?? "")) ?? p.name;
    const newCategory =
      prompt("Ubah kategori", String(p.category ?? "")) ?? p.category;
    const newBarcode =
      prompt("Ubah barcode (opsional)", String(p.barcode ?? "")) ?? p.barcode;
    const nv = prompt("Ubah harga", String(p.price ?? "0"));
    if (nv === null) return;
    const val = Number(nv);
    if (!Number.isFinite(val) || val < 0) {
      toast.error("Harga tidak valid");
      return;
    }
    const before = {
      name: p.name,
      category: p.category,
      barcode: p.barcode,
      price: p.price,
    };
    await setDoc(
      doc(db, "products", p.id),
      {
        name: newName,
        category: newCategory,
        barcode: newBarcode?.trim() || null,
        price: val,
      },
      { merge: true }
    );
    await auditLog({
      orgId: org.id,
      user,
      entity: "product",
      action: "update",
      entityId: p.id,
      before,
      after: {
        name: newName,
        category: newCategory,
        barcode: newBarcode?.trim() || null,
        price: val,
      },
    });
    await loadProducts();
    toast.success("Produk diperbarui");
  };

  const editStock = async (p: any) => {
    if (!canAdmin) {
      toast.error("Hanya admin");
      return;
    }
    if (p.hasMeasure) {
      const nv = prompt(
        `Ubah stok isi (${p.measureUnit || ""})`,
        String(p.stockContent ?? "0")
      );
      if (nv === null) return;
      const val = Number(nv);
      if (!Number.isFinite(val) || val < 0) {
        toast.error("Nilai tidak valid");
        return;
      }
      await setDoc(
        doc(db, "products", p.id),
        { stockContent: val },
        { merge: true }
      );
      await auditLog({
        orgId: org.id,
        user,
        entity: "product",
        action: "update",
        entityId: p.id,
        before: { stockContent: p.stockContent || 0 },
        after: { stockContent: val },
      });
      await loadProducts();
      toast.success("Stok isi diperbarui");
    } else {
      const nv = prompt("Ubah stok item", String(p.stock ?? "0"));
      if (nv === null) return;
      const val = Number(nv);
      if (!Number.isFinite(val) || val < 0) {
        toast.error("Nilai tidak valid");
        return;
      }
      await setDoc(doc(db, "products", p.id), { stock: val }, { merge: true });
      await auditLog({
        orgId: org.id,
        user,
        entity: "product",
        action: "update",
        entityId: p.id,
        before: { stock: p.stock || 0 },
        after: { stock: val },
      });
      await loadProducts();
      toast.success("Stok item diperbarui");
    }
  };

  const editMin = async (p: any) => {
    if (!canAdmin) {
      toast.error("Hanya admin");
      return;
    }
    if (p.hasMeasure) {
      const nv = prompt(
        `Ubah min isi (${p.measureUnit || ""})`,
        String(p.minContent ?? "0")
      );
      if (nv === null) return;
      const val = Number(nv);
      if (!Number.isFinite(val) || val < 0) {
        toast.error("Nilai tidak valid");
        return;
      }
      await setDoc(
        doc(db, "products", p.id),
        { minContent: val },
        { merge: true }
      );
      await auditLog({
        orgId: org.id,
        user,
        entity: "product",
        action: "update",
        entityId: p.id,
        before: { minContent: p.minContent || 0 },
        after: { minContent: val },
      });
      await loadProducts();
      toast.success("Min isi diperbarui");
    } else {
      const nv = prompt("Ubah min stok", String(p.minStock ?? "0"));
      if (nv === null) return;
      const val = Number(nv);
      if (!Number.isFinite(val) || val < 0) {
        toast.error("Nilai tidak valid");
        return;
      }
      await setDoc(
        doc(db, "products", p.id),
        { minStock: val },
        { merge: true }
      );
      await auditLog({
        orgId: org.id,
        user,
        entity: "product",
        action: "update",
        entityId: p.id,
        before: { minStock: p.minStock || 0 },
        after: { minStock: val },
      });
      await loadProducts();
      toast.success("Min stok diperbarui");
    }
  };

  const editMeasure = async (p: any) => {
    if (!canAdmin) {
      toast.error("Hanya admin");
      return;
    }
    const on = confirm("Aktifkan detail kemasan untuk produk ini?");
    if (!on) {
      await setDoc(
        doc(db, "products", p.id),
        {
          hasMeasure: false,
          measureUnit: null,
          contentPerItem: 0,
          stockContent: 0,
          minContent: 0,
        },
        { merge: true }
      );
      await auditLog({
        orgId: org.id,
        user,
        entity: "product",
        action: "update",
        entityId: p.id,
        after: { hasMeasure: false },
      });
      await loadProducts();
      toast.success("Detail kemasan dimatikan");
      return;
    }
    const unit =
      prompt(
        `Unit (pilihan: ${UNITS.join(", ")})`,
        String(p.measureUnit || "ml")
      ) || "ml";
    const per =
      prompt("Isi per item (angka)", String(p.contentPerItem ?? "0")) || "0";
    const min = prompt("Min isi (angka)", String(p.minContent ?? "0")) || "0";
    const valPer = Number(per);
    const valMin = Number(min);
    if (!Number.isFinite(valPer) || valPer <= 0) {
      toast.error("Isi per item tidak valid");
      return;
    }
    if (!UNITS.includes(unit)) {
      toast.error("Unit tidak valid");
      return;
    }
    await setDoc(
      doc(db, "products", p.id),
      {
        hasMeasure: true,
        measureUnit: unit,
        contentPerItem: valPer,
        minContent: Number.isFinite(valMin) ? valMin : 0,
      },
      { merge: true }
    );
    await auditLog({
      orgId: org.id,
      user,
      entity: "product",
      action: "update",
      entityId: p.id,
      after: { hasMeasure: true, measureUnit: unit, contentPerItem: valPer },
    });
    await loadProducts();
    toast.success("Detail kemasan diperbarui");
  };

  const removeProduct = async (p: any) => {
    if (!canAdmin) {
      toast.error("Hanya admin");
      return;
    }
    await deleteDoc(doc(db, "products", p.id));
    await auditLog({
      orgId: org.id,
      user,
      entity: "product",
      action: "delete",
      entityId: p.id,
      before: { name: p.name, category: p.category },
    });
    await loadProducts();
    toast.success("Produk dihapus");
  };

  const addCategory = async () => {
    if (!canAdmin) {
      toast.error("Hanya admin");
      return;
    }
    if (!org) return;
    if (!newCat.trim()) {
      toast.error("Nama kategori kosong");
      return;
    }
    const exists = cats.find(
      (c) => String(c.name).toLowerCase() === newCat.trim().toLowerCase()
    );
    if (exists) {
      toast.error("Kategori sudah ada");
      return;
    }
    await addDoc(collection(db, "categories"), {
      orgId: org.id,
      name: newCat.trim(),
      createdAt: serverTimestamp(),
    });
    setNewCat("");
    await loadCats();
    toast.success("Kategori ditambahkan");
  };

  const removeCategory = async (c: any) => {
    if (!canAdmin) {
      toast.error("Hanya admin");
      return;
    }
    await deleteDoc(doc(db, "categories", c.id));
    await loadCats();
    toast.success("Kategori dihapus");
    if (category === c.name) setCategory("");
  };

  const toCSV = (rows: Row[]) => {
    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = [
      "name",
      "category",
      "price",
      "stock",
      "barcode",
      "minStock",
      "hasMeasure",
      "measureUnit",
      "contentPerItem",
      "stockContent",
      "minContent",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          esc(r.name || ""),
          esc(r.category || ""),
          esc(r.price ?? ""),
          esc(r.stock ?? ""),
          esc(r.barcode || ""),
          esc(r.minStock ?? ""),
          esc(r.hasMeasure ? "1" : ""),
          esc(r.measureUnit || ""),
          esc(r.contentPerItem ?? ""),
          esc(r.stockContent ?? ""),
          esc(r.minContent ?? ""),
        ].join(",")
      );
    }
    return lines.join("\n");
  };

  const download = (filename: string, text: string) => {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportProducts = () => {
    const rows: Row[] = list.map((p) => ({
      name: p.name || "",
      category: p.category || "",
      price: Number(p.price || 0),
      stock: Number(p.stock || 0),
      barcode: p.barcode || "",
      minStock: Number(p.minStock || 0),
      hasMeasure: Boolean(p.hasMeasure),
      measureUnit: p.measureUnit || "",
      contentPerItem: Number(p.contentPerItem || 0),
      stockContent: Number(p.stockContent || 0),
      minContent: Number(p.minContent || 0),
    }));
    download("produk.csv", toCSV(rows));
    toast.success("Export selesai");
  };

  const exportSample = () => {
    const sample: Row[] = [
      {
        name: "Sirup Melon",
        category: "Bahan",
        price: 0,
        stock: 0,
        barcode: "",
        minStock: 0,
        hasMeasure: true,
        measureUnit: "ml",
        contentPerItem: 1000,
        stockContent: 3000,
        minContent: 500,
      },
      {
        name: "Gelas 12oz",
        category: "Kemas",
        price: 0,
        stock: 100,
        barcode: "",
        minStock: 20,
        hasMeasure: false,
      },
    ];
    download("contoh-produk.csv", toCSV(sample));
    toast.info("Contoh CSV diunduh");
  };

  const parseCSV = (text: string): Row[] => {
    const rows: string[][] = [];
    let cur: string[] = [];
    let cell = "";
    let inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            inQ = false;
          }
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ",") {
          cur.push(cell);
          cell = "";
        } else if (ch === "\n" || ch === "\r") {
          if (ch === "\r" && text[i + 1] === "\n") i++;
          cur.push(cell);
          cell = "";
          if (cur.length > 1 || (cur.length === 1 && cur[0].trim() !== ""))
            rows.push(cur);
          cur = [];
        } else {
          cell += ch;
        }
      }
    }
    cur.push(cell);
    if (cur.length > 1 || (cur.length === 1 && cur[0].trim() !== ""))
      rows.push(cur);

    if (rows.length === 0) return [];
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.findIndex((x) => x === k);
    const iName = idx("name"),
      iCat = idx("category"),
      iPrice = idx("price"),
      iStock = idx("stock"),
      iBarcode = idx("barcode"),
      iMinStock = idx("minstock"),
      iHasMeasure = idx("hasmeasure"),
      iUnit = idx("measureunit"),
      iPer = idx("contentperitem"),
      iStockContent = idx("stockcontent"),
      iMinContent = idx("mincontent");
    const out: Row[] = [];
    for (let r = 1; r < rows.length; r++) {
      const line = rows[r];
      const name = (line[iName] || "").trim();
      if (!name) continue;
      const category = (line[iCat] || "").trim();
      const price = Number((line[iPrice] || "").trim() || 0);
      const stock = Number((line[iStock] || "").trim() || 0);
      const barcode = (line[iBarcode] || "").trim();
      const minStock = Number((line[iMinStock] || "").trim() || 0);
      const hasMeasure = !!(line[iHasMeasure] || "").trim();
      const measureUnit =
        (line[iUnit] || "").trim() || (hasMeasure ? "ml" : "");
      const contentPerItem = Number((line[iPer] || "").trim() || 0);
      const stockContent = Number((line[iStockContent] || "").trim() || 0);
      const minContent = Number((line[iMinContent] || "").trim() || 0);
      out.push({
        name,
        category,
        price,
        stock,
        barcode,
        minStock,
        hasMeasure,
        measureUnit,
        contentPerItem,
        stockContent,
        minContent,
      });
    }
    return out;
  };

  const importCSV = async (file: File) => {
    if (!canAdmin) {
      toast.error("Hanya admin");
      return;
    }
    if (!org || !userDoc) return;
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) {
      toast.error("CSV kosong atau header tidak valid");
      return;
    }

    const nameKey = (r: Row) =>
      (r.name || "").toLowerCase().trim() +
      "|" +
      (r.category || "").toLowerCase().trim();
    const mapByName = new Map<string, any>();
    const mapByBarcode = new Map<string, any>();
    list.forEach((p) => {
      const key =
        String(p.name || "")
          .toLowerCase()
          .trim() +
        "|" +
        String(p.category || "")
          .toLowerCase()
          .trim();
      mapByName.set(key, p);
      if (p.barcode) mapByBarcode.set(String(p.barcode).trim(), p);
    });

    const newCats = new Set<string>();
    let added = 0,
      updated = 0;

    for (const r of rows) {
      if (
        r.category &&
        !cats.find(
          (c) => String(c.name).toLowerCase() === r.category!.toLowerCase()
        )
      )
        newCats.add(r.category);
      const byBarcode = r.barcode ? mapByBarcode.get(r.barcode) : null;
      const byName = mapByName.get(nameKey(r));
      const payload: any = {
        name: r.name,
        category: r.category || null,
        price: Number(r.price || 0),
        stock: Number(r.stock || 0),
        barcode: r.barcode || null,
        minStock: Number(r.minStock || 0),
        hasMeasure: !!r.hasMeasure,
        measureUnit: r.hasMeasure ? r.measureUnit || "ml" : null,
        contentPerItem: r.hasMeasure ? Number(r.contentPerItem || 0) : 0,
        stockContent: r.hasMeasure ? Number(r.stockContent || 0) : 0,
        minContent: r.hasMeasure ? Number(r.minContent || 0) : 0,
      };
      if (byBarcode) {
        await setDoc(doc(db, "products", byBarcode.id), payload, {
          merge: true,
        });
        updated++;
      } else if (byName) {
        await setDoc(doc(db, "products", byName.id), payload, { merge: true });
        updated++;
      } else {
        await addDoc(collection(db, "products"), {
          orgId: org.id,
          createdByUid: userDoc.uid,
          ...payload,
          createdAt: serverTimestamp(),
        });
        added++;
      }
    }

    for (const c of Array.from(newCats)) {
      await addDoc(collection(db, "categories"), {
        orgId: org.id,
        name: c,
        createdAt: serverTimestamp(),
      });
    }

    await loadProducts();
    await loadCats();
    toast.success(
      `Import selesai: ${added} tambah, ${updated} update${newCats.size ? `, kategori baru: ${newCats.size}` : ""}`
    );
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await importCSV(f);
    } finally {
      e.target.value = "";
    }
  };

  const filePicker = (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onPickFile}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="px-3 py-2 rounded bg-blue-600 text-white"
      >
        Import CSV
      </button>
    </>
  );

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Produk</h1>

      <div className="card p-4 grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportProducts}
            className="px-3 py-2 rounded bg-black/10"
          >
            Export CSV
          </button>
          <button
            onClick={exportSample}
            className="px-3 py-2 rounded bg-black/10"
          >
            Export Contoh CSV
          </button>
          {filePicker}
          <div className="text-sm opacity-70">
            Kolom: name, category, price, stock, barcode, minStock, hasMeasure,
            measureUnit, contentPerItem, stockContent, minContent
          </div>
        </div>
      </div>

      <div className="card p-4 grid gap-3">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Pilih Kategori</option>
            {cats.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={price}
            onChange={(e) =>
              setPrice(e.target.value ? Number(e.target.value) : "")
            }
            placeholder="Harga"
            type="number"
          />
          {!hasMeasure ? (
            <>
              <input
                value={stock}
                onChange={(e) =>
                  setStock(e.target.value ? Number(e.target.value) : "")
                }
                placeholder="Stok item"
                type="number"
              />
              <input
                value={minStock}
                onChange={(e) =>
                  setMinStock(e.target.value ? Number(e.target.value) : "")
                }
                placeholder="Min stok item"
                type="number"
              />
            </>
          ) : (
            <>
              <select
                value={measureUnit}
                onChange={(e) => setMeasureUnit(e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u.toUpperCase()}
                  </option>
                ))}
              </select>
              <input
                value={contentPerItem}
                onChange={(e) =>
                  setContentPerItem(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
                placeholder="Isi per item"
                type="number"
              />
              <input
                value={stockContent}
                onChange={(e) =>
                  setStockContent(e.target.value ? Number(e.target.value) : "")
                }
                placeholder="Stok isi"
                type="number"
              />
              <input
                value={minContent}
                onChange={(e) =>
                  setMinContent(e.target.value ? Number(e.target.value) : "")
                }
                placeholder="Min isi"
                type="number"
              />
            </>
          )}
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Barcode (opsional)"
          />
          <div className="flex items-center gap-2">
            <input
              id="hasMeasure"
              type="checkbox"
              checked={hasMeasure}
              onChange={(e) => setHasMeasure(e.target.checked)}
            />
            <label htmlFor="hasMeasure" className="text-sm">
              Detail kemasan
            </label>
          </div>
          <button
            onClick={addProduct}
            className="px-3 py-2 rounded bg-blue-600 text-white"
          >
            Tambah
          </button>
        </div>
      </div>

      {canAdmin && (
        <div className="card p-4 grid gap-3">
          <div className="font-semibold">Kelola Kategori</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="Nama kategori baru"
            />
            <button
              onClick={addCategory}
              className="px-3 py-2 rounded bg-green-600 text-white"
            >
              Tambah Kategori
            </button>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {cats.map((c) => (
              <div
                key={c.id}
                className="p-2 rounded bg-black/5 flex items-center justify-between"
              >
                <span>{c.name}</span>
                <button
                  onClick={() => removeCategory(c)}
                  className="px-2 py-1 rounded bg-red-500/90 text-white"
                >
                  Hapus
                </button>
              </div>
            ))}
            {cats.length === 0 && (
              <div className="opacity-70">Belum ada kategori</div>
            )}
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="font-semibold mb-2">Riwayat Barang</div>
        <div className="grid gap-2 max-h-[520px] overflow-auto">
          {list.map((p) => {
            const low = p.hasMeasure
              ? Number(p.stockContent || 0) <= Number(p.minContent || 0)
              : Number(p.stock || 0) <= Number(p.minStock || 0);
            return (
              <div
                key={p.id}
                className={`p-2 rounded grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-2 items-center ${
                  low ? "bg-red-50" : "bg-black/5"
                }`}
              >
                <div>
                  <div className="font-semibold">
                    {p.name}{" "}
                    {p.category && (
                      <span className="opacity-60">({p.category})</span>
                    )}
                  </div>
                  <div className="text-xs opacity-70">
                    Barcode: {p.barcode || "-"}
                  </div>
                </div>
                {p.hasMeasure ? (
                  <>
                    <div>
                      Isi/item: {Number(p.contentPerItem || 0)}{" "}
                      {(p.measureUnit || "").toUpperCase()}
                    </div>
                    <div>
                      Stok isi: {Number(p.stockContent || 0)}{" "}
                      {(p.measureUnit || "").toUpperCase()}
                    </div>
                    <div>
                      Min isi: {Number(p.minContent || 0)}{" "}
                      {(p.measureUnit || "").toUpperCase()}
                    </div>
                  </>
                ) : (
                  <>
                    <div>Min: {Number(p.minStock || 0)}</div>
                    <div>Stok: {Number(p.stock || 0)}</div>
                    <div />
                  </>
                )}
                <div>Rp {Number(p.price || 0).toLocaleString("id-ID")}</div>
                <button
                  onClick={() => editMin(p)}
                  className="px-2 py-1 rounded bg-black/10"
                >
                  {p.hasMeasure ? "Min Isi" : "Min Stok"}
                </button>
                <button
                  onClick={() => editProduct(p)}
                  className="px-2 py-1 rounded bg-black/10"
                >
                  Edit
                </button>
                <button
                  onClick={() => editStock(p)}
                  className="px-2 py-1 rounded bg-black/10"
                >
                  {p.hasMeasure ? "Ubah Stok Isi" : "Ubah Stok"}
                </button>
                <button
                  onClick={() => editMeasure(p)}
                  className="px-2 py-1 rounded bg-black/10"
                >
                  Detail Kemasan
                </button>
                <button
                  onClick={() => removeProduct(p)}
                  className="px-2 py-1 rounded bg-red-500/90 text-white"
                >
                  Hapus
                </button>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="opacity-70">Belum ada produk</div>
          )}
        </div>
      </div>
    </div>
  );
}
