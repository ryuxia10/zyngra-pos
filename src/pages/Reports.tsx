import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthContext";
import { toast } from "../ui/toastStore";
import { auditLog } from "../lib/audit";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AnyDoc = { id: string; [k: string]: any };

function toCSV(rows: Array<Record<string, any>>): string {
  if (!rows.length) return "";
  const keysSet = rows.reduce<Set<string>>((s, r) => {
    Object.keys(r).forEach((k) => s.add(k));
    return s;
  }, new Set<string>());
  const keys = Array.from(keysSet);
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [keys.join(",")];
  for (const r of rows) lines.push(keys.map((k) => esc(r[k])).join(","));
  return lines.join("\n");
}

function download(filename: string, data: string, mime: string) {
  const blob = new Blob([data], { type: mime + ";charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function idr(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

export default function Reports() {
  const { org, user } = useAuth();
  const [from, setFrom] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [to, setTo] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    const start = dayjs(from).startOf("day").toDate();
    const end = dayjs(to).endOf("day").toDate();
    return { start, end };
  }, [from, to]);

  const ensureOrg = () => {
    if (!org) {
      toast.error("Organisasi belum siap");
      return false;
    }
    return true;
  };

  const fetchColl = async (name: string): Promise<AnyDoc[]> => {
    if (!org) return [];
    const qy = query(collection(db, name), where("orgId", "==", org.id));
    const snap = await getDocs(qy);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  };

  const exportSalesCSV = async () => {
    if (!ensureOrg()) return;
    setLoading(true);
    try {
      const all = await fetchColl("sales");
      const rows = all
        .filter((s) => {
          const ts = s.date?.toDate?.() || s.createdAt?.toDate?.() || null;
          return ts && ts >= range.start && ts <= range.end;
        })
        .map((s) => {
          const d = s.date?.toDate?.() || s.createdAt?.toDate?.();
          const items = Array.isArray(s.items)
            ? s.items
                .map(
                  (it: any) =>
                    `${it.name} x${Number(it.qty || 0)}@${Number(it.price || 0)}`
                )
                .join(" | ")
            : "";
          return {
            id: s.id,
            date: d ? dayjs(d).format("YYYY-MM-DD HH:mm") : "",
            method: String(s.paymentMethod || "").toUpperCase(),
            source: s.source || "",
            total: Number(s.total || 0),
            items,
          };
        })
        .sort((a, b) => (a.date > b.date ? 1 : -1));
      const csv = toCSV(rows);
      download(
        `laporan-penjualan_${dayjs(range.start).format("YYYYMMDD")}-${dayjs(
          range.end
        ).format("YYYYMMDD")}.csv`,
        csv,
        "text/csv"
      );
      await auditLog({
        orgId: org!.id,
        user,
        entity: "report",
        action: "export",
        meta: { kind: "sales_csv", from, to },
      });
      toast.success("Export penjualan (CSV) selesai");
    } catch (e: any) {
      toast.error(e?.message || "Gagal export penjualan");
    } finally {
      setLoading(false);
    }
  };

  const exportPurchasesCSV = async () => {
    if (!ensureOrg()) return;
    setLoading(true);
    try {
      const all = await fetchColl("purchases");
      const rows = all
        .filter((p) => {
          const ts = p.date?.toDate?.() || p.createdAt?.toDate?.() || null;
          return ts && ts >= range.start && ts <= range.end;
        })
        .map((p) => {
          const d = p.date?.toDate?.() || p.createdAt?.toDate?.();
          const kind =
            p.kind ||
            (Array.isArray(p.items) && p.items.length ? "inventory" : "other");
          const itemsInv = Array.isArray(p.items)
            ? p.items
                .map(
                  (it: any) =>
                    `${it.name} x${Number(it.qty || 0)}@${Number(
                      it.unitCost || 0
                    )}`
                )
                .join(" | ")
            : "";
          const itemsOther = Array.isArray(p.itemsOther)
            ? p.itemsOther
                .map((it: any) => `${it.name}=${Number(it.amount || 0)}`)
                .join(" | ")
            : "";
          return {
            id: p.id,
            date: d ? dayjs(d).format("YYYY-MM-DD HH:mm") : "",
            supplier: p.supplier || "",
            method: String(p.method || "").toUpperCase(),
            kind,
            total: Number(p.total || 0),
            items: kind === "inventory" ? itemsInv : itemsOther,
          };
        })
        .sort((a, b) => (a.date > b.date ? 1 : -1));
      const csv = toCSV(rows);
      download(
        `laporan-pembelian_${dayjs(range.start).format(
          "YYYYMMDD"
        )}-${dayjs(range.end).format("YYYYMMDD")}.csv`,
        csv,
        "text/csv"
      );
      await auditLog({
        orgId: org!.id,
        user,
        entity: "report",
        action: "export",
        meta: { kind: "purchases_csv", from, to },
      });
      toast.success("Export pembelian (CSV) selesai");
    } catch (e: any) {
      toast.error(e?.message || "Gagal export pembelian");
    } finally {
      setLoading(false);
    }
  };

  const exportSalesPDF = async () => {
    if (!ensureOrg()) return;
    setLoading(true);
    try {
      const all = await fetchColl("sales");
      const rows = all
        .filter((s) => {
          const ts = s.date?.toDate?.() || s.createdAt?.toDate?.() || null;
          return ts && ts >= range.start && ts <= range.end;
        })
        .map((s, idx) => {
          const d = s.date?.toDate?.() || s.createdAt?.toDate?.();
          const itemsStr = Array.isArray(s.items)
            ? s.items
                .map(
                  (it: any) =>
                    `${it.name} x${Number(it.qty || 0)}@${Number(it.price || 0)}`
                )
                .join(" | ")
            : "";
          const items =
            itemsStr.length > 120 ? itemsStr.slice(0, 117) + "..." : itemsStr;
          return {
            no: idx + 1,
            date: d ? dayjs(d).format("YYYY-MM-DD HH:mm") : "",
            method: String(s.paymentMethod || "").toUpperCase(),
            source: s.source || "",
            total: idr(Number(s.total || 0)),
            items,
          };
        })
        .sort((a, b) => (a.date > b.date ? 1 : -1));
      const sum = all
        .filter((s) => {
          const ts = s.date?.toDate?.() || s.createdAt?.toDate?.() || null;
          return ts && ts >= range.start && ts <= range.end;
        })
        .reduce((acc, s) => acc + Number(s.total || 0), 0);

      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text("Laporan Penjualan", 14, 16);
      doc.setFontSize(10);
      doc.text(
        `${dayjs(range.start).format("DD MMM YYYY")} - ${dayjs(range.end).format("DD MMM YYYY")}`,
        14,
        22
      );

      autoTable(doc, {
        head: [["No", "Tanggal", "Metode", "Sumber", "Total", "Items"]],
        body: rows.map((r) => [
          r.no,
          r.date,
          r.method,
          r.source,
          r.total,
          r.items,
        ]),
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 0, 0] },
      });

      const endY = (doc as any).lastAutoTable.finalY || 28;
      doc.setFontSize(10);
      doc.text(`Total Transaksi: ${rows.length}`, 14, endY + 8);
      doc.text(`Total Penjualan: ${idr(sum)}`, 14, endY + 14);

      const fn = `laporan-penjualan_${dayjs(range.start).format("YYYYMMDD")}-${dayjs(
        range.end
      ).format("YYYYMMDD")}.pdf`;
      doc.save(fn);

      await auditLog({
        orgId: org!.id,
        user,
        entity: "report",
        action: "export",
        meta: { kind: "sales_pdf", from, to },
      });
      toast.success("Export penjualan (PDF) selesai");
    } catch (e: any) {
      toast.error(e?.message || "Gagal export penjualan PDF");
    } finally {
      setLoading(false);
    }
  };

  const exportPurchasesPDF = async () => {
    if (!ensureOrg()) return;
    setLoading(true);
    try {
      const all = await fetchColl("purchases");
      const rowsRaw = all.filter((p) => {
        const ts = p.date?.toDate?.() || p.createdAt?.toDate?.() || null;
        return ts && ts >= range.start && ts <= range.end;
      });
      const rows = rowsRaw
        .map((p, idx) => {
          const d = p.date?.toDate?.() || p.createdAt?.toDate?.();
          const kind =
            p.kind ||
            (Array.isArray(p.items) && p.items.length ? "inventory" : "other");
          const itemsInv = Array.isArray(p.items)
            ? p.items
                .map(
                  (it: any) =>
                    `${it.name} x${Number(it.qty || 0)}@${Number(
                      it.unitCost || 0
                    )}`
                )
                .join(" | ")
            : "";
          const itemsOther = Array.isArray(p.itemsOther)
            ? p.itemsOther
                .map((it: any) => `${it.name}=${Number(it.amount || 0)}`)
                .join(" | ")
            : "";
          const itemsStr = kind === "inventory" ? itemsInv : itemsOther;
          const items =
            itemsStr.length > 120 ? itemsStr.slice(0, 117) + "..." : itemsStr;

          return {
            no: idx + 1,
            date: d ? dayjs(d).format("YYYY-MM-DD HH:mm") : "",
            supplier: p.supplier || "",
            method: String(p.method || "").toUpperCase(),
            kind: kind === "inventory" ? "BAHAN BAKU" : "LAINNYA",
            total: idr(Number(p.total || 0)),
            items,
          };
        })
        .sort((a, b) => (a.date > b.date ? 1 : -1));
      const sum = rowsRaw.reduce((acc, p) => acc + Number(p.total || 0), 0);

      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text("Laporan Pembelian", 14, 16);
      doc.setFontSize(10);
      doc.text(
        `${dayjs(range.start).format("DD MMM YYYY")} - ${dayjs(range.end).format("DD MMM YYYY")}`,
        14,
        22
      );

      autoTable(doc, {
        head: [
          ["No", "Tanggal", "Pemasok", "Metode", "Jenis", "Total", "Items"],
        ],
        body: rows.map((r) => [
          r.no,
          r.date,
          r.supplier,
          r.method,
          r.kind,
          r.total,
          r.items,
        ]),
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 0, 0] },
      });

      const endY = (doc as any).lastAutoTable.finalY || 28;
      doc.setFontSize(10);
      doc.text(`Total Dokumen: ${rows.length}`, 14, endY + 8);
      doc.text(`Total Pembelian: ${idr(sum)}`, 14, endY + 14);

      const fn = `laporan-pembelian_${dayjs(range.start).format("YYYYMMDD")}-${dayjs(
        range.end
      ).format("YYYYMMDD")}.pdf`;
      doc.save(fn);

      await auditLog({
        orgId: org!.id,
        user,
        entity: "report",
        action: "export",
        meta: { kind: "purchases_pdf", from, to },
      });
      toast.success("Export pembelian (PDF) selesai");
    } catch (e: any) {
      toast.error(e?.message || "Gagal export pembelian PDF");
    } finally {
      setLoading(false);
    }
  };

  const backupJSON = async () => {
    if (!ensureOrg()) return;
    setLoading(true);
    try {
      const names = [
        "products",
        "categories",
        "sales",
        "purchases",
        "stockMoves",
        "shifts",
        "cashMovements",
        "logs",
      ];
      const out: Record<string, AnyDoc[]> = {};
      for (const n of names) {
        out[n] = await fetchColl(n);
      }
      const json = JSON.stringify(
        {
          orgId: org!.id,
          exportedAt: new Date().toISOString(),
          data: out,
        },
        null,
        2
      );
      download(
        `backup_${dayjs().format("YYYYMMDD_HHmm")}.json`,
        json,
        "application/json"
      );
      await auditLog({
        orgId: org!.id,
        user,
        entity: "backup",
        action: "export",
        meta: {
          size: Object.values(out).reduce((s, a) => s + a.length, 0),
        },
      });
      toast.success("Backup JSON diunduh");
    } catch (e: any) {
      toast.error(e?.message || "Gagal backup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Laporan & Backup</h1>

      <div className="card p-4 grid gap-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70">Dari</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-70">Sampai</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="md:col-span-3 flex flex-wrap items-center gap-2">
            <button
              onClick={exportSalesCSV}
              disabled={loading}
              className="px-3 py-2 rounded bg-neutral-900 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              Export CSV Penjualan
            </button>
            <button
              onClick={exportSalesPDF}
              disabled={loading}
              className="px-3 py-2 rounded bg-neutral-900 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              Export PDF Penjualan
            </button>
            <button
              onClick={exportPurchasesCSV}
              disabled={loading}
              className="px-3 py-2 rounded bg-neutral-900 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              Export CSV Pembelian
            </button>
            <button
              onClick={exportPurchasesPDF}
              disabled={loading}
              className="px-3 py-2 rounded bg-neutral-900 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              Export PDF Pembelian
            </button>
            <button
              onClick={backupJSON}
              disabled={loading}
              className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
            >
              Backup JSON (Semua)
            </button>
          </div>
        </div>
        <div className="text-xs opacity-70">
          Rentang tanggal diterapkan pada kolom <b>date</b> atau{" "}
          <b>createdAt</b> jika ada.
        </div>
      </div>

      <div className="card p-4 grid gap-2">
        <div className="font-semibold">Catatan</div>
        <ul className="list-disc pl-5 text-sm opacity-80 space-y-1">
          <li>CSV untuk olah data di Excel/Spreadsheet.</li>
          <li>
            PDF untuk cetak/arsip cepat. Untuk laporan harian, set tanggal
            awal=akhir lalu export PDF.
          </li>
          <li>Backup JSON berisi snapshot semua koleksi utama.</li>
        </ul>
      </div>
    </div>
  );
}
