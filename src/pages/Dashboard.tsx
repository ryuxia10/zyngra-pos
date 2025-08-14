import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "chart.js/auto";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthContext";

type AnyDoc = { id: string; [k: string]: any };

function idr(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function lastNDates(n: number) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--)
    out.push(dayjs().subtract(i, "day").format("YYYY-MM-DD"));
  return out;
}

export default function Dashboard() {
  const { org } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<AnyDoc[]>([]);
  const [purchases, setPurchases] = useState<AnyDoc[]>([]);
  const [top, setTop] = useState<
    { name: string; qty: number; amount: number }[]
  >([]);
  const [days, setDays] = useState(14);

  const labels = useMemo(() => lastNDates(days), [days]);

  useEffect(() => {
    const load = async () => {
      if (!org) return;
      setLoading(true);
      const sQ = query(collection(db, "sales"), where("orgId", "==", org.id));
      const pQ = query(
        collection(db, "purchases"),
        where("orgId", "==", org.id)
      );
      const [sSnap, pSnap] = await Promise.all([getDocs(sQ), getDocs(pQ)]);
      const sArr = sSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const pArr = pSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      sArr.sort(
        (a, b) =>
          (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
      );
      pArr.sort(
        (a, b) =>
          (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
      );
      setSales(sArr);
      setPurchases(pArr);

      const mapQty = new Map<string, { qty: number; amount: number }>();
      sArr.forEach((s) => {
        const items = Array.isArray(s.items) ? s.items : [];
        items.forEach((it: any) => {
          const key = String(it.name || "Unknown");
          const o = mapQty.get(key) || { qty: 0, amount: 0 };
          o.qty += Number(it.qty || 0);
          o.amount += Number(it.qty || 0) * Number(it.price || 0);
          mapQty.set(key, o);
        });
      });
      const topArr = Array.from(mapQty.entries())
        .map(([name, v]) => ({ name, qty: v.qty, amount: v.amount }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 8);
      setTop(topArr);

      setLoading(false);
    };
    load();
  }, [org?.id, days]);

  const series = useMemo(() => {
    const revByDay: Record<string, number> = {};
    const cogsByDay: Record<string, number> = {};
    const purByDay: Record<string, number> = {};
    labels.forEach(
      (d) => ((revByDay[d] = 0), (cogsByDay[d] = 0), (purByDay[d] = 0))
    );
    sales.forEach((s) => {
      const d = dayjs(
        s.date?.toDate?.() || s.createdAt?.toDate?.() || new Date()
      ).format("YYYY-MM-DD");
      if (revByDay[d] != null) {
        revByDay[d] += Number(s.total || 0);
        cogsByDay[d] += Number(s.cogs || 0);
      }
    });
    purchases.forEach((p) => {
      const d = dayjs(
        p.date?.toDate?.() || p.createdAt?.toDate?.() || new Date()
      ).format("YYYY-MM-DD");
      if (purByDay[d] != null) purByDay[d] += Number(p.total || 0);
    });
    const rev = labels.map((d) => revByDay[d] || 0);
    const cogs = labels.map((d) => cogsByDay[d] || 0);
    const pur = labels.map((d) => purByDay[d] || 0);
    return { rev, cogs, pur };
  }, [labels, sales, purchases]);

  const totals = useMemo(() => {
    const revenue = sales.reduce((a, s) => a + Number(s.total || 0), 0);
    const cogs = sales.reduce((a, s) => a + Number(s.cogs || 0), 0);
    const profit = revenue - cogs;
    const margin = revenue > 0 ? +((profit / revenue) * 100).toFixed(2) : 0;
    const purchaseTotal = purchases.reduce(
      (a, p) => a + Number(p.total || 0),
      0
    );
    return { revenue, cogs, profit, margin, purchaseTotal };
  }, [sales, purchases]);

  const payDist = useMemo(() => {
    const m = { QRIS: 0, Tunai: 0, Kartu: 0, Grab: 0 } as Record<
      string,
      number
    >;
    sales.forEach((s) => {
      const key = String(s.paymentMethod || "").toLowerCase();
      if (key === "qris") m.QRIS += Number(s.total || 0);
      else if (key === "tunai") m.Tunai += Number(s.total || 0);
      else if (key === "kartu") m.Kartu += Number(s.total || 0);
      else if (key === "grab") m.Grab += Number(s.total || 0);
    });
    return m;
  }, [sales]);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70">Rentang</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7 hari</option>
            <option value={14}>14 hari</option>
            <option value={30}>30 hari</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <div className="text-sm opacity-70">Revenue</div>
          <div className="text-xl font-bold">{idr(totals.revenue)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <div className="text-sm opacity-70">COGS</div>
          <div className="text-xl font-bold">{idr(totals.cogs)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <div className="text-sm opacity-70">Gross Profit</div>
          <div className="text-xl font-bold">{idr(totals.profit)}</div>
        </div>
        <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <div className="text-sm opacity-70">Margin</div>
          <div className="text-xl font-bold">{totals.margin}%</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-4 rounded-2xl bg-white dark:bg-neutral-900 ring-1 ring-black/5">
          <div className="text-sm font-semibold mb-2">Revenue vs COGS</div>
          <Line
            data={{
              labels,
              datasets: [
                { label: "Revenue", data: series.rev },
                { label: "COGS", data: series.cogs },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { position: "top" },
                tooltip: {
                  callbacks: {
                    label: (ctx) =>
                      `${ctx.dataset.label}: ${idr(Number(ctx.parsed.y || 0))}`,
                  },
                },
              },
              scales: {
                y: {
                  ticks: {
                    callback: (v) => idr(Number(v)).replace("Rp ", ""),
                  },
                },
              },
            }}
          />
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 ring-1 ring-black/5">
          <div className="text-sm font-semibold mb-2">
            Distribusi Metode Bayar
          </div>
          <Doughnut
            data={{
              labels: Object.keys(payDist),
              datasets: [{ data: Object.values(payDist) }],
            }}
            options={{
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (ctx) =>
                      `${ctx.label}: ${idr(Number(ctx.parsed || 0))}`,
                  },
                },
              },
            }}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 ring-1 ring-black/5">
          <div className="text-sm font-semibold mb-2">Pembelian per Hari</div>
          <Bar
            data={{
              labels,
              datasets: [{ label: "Pembelian", data: series.pur }],
            }}
            options={{
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (ctx) =>
                      `${ctx.dataset.label}: ${idr(Number(ctx.parsed.y || 0))}`,
                  },
                },
              },
              scales: {
                y: {
                  ticks: { callback: (v) => idr(Number(v)).replace("Rp ", "") },
                },
              },
            }}
          />
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 ring-1 ring-black/5">
          <div className="text-sm font-semibold mb-3">Produk Terlaris</div>
          <div className="grid gap-2 max-h-[360px] overflow-auto">
            {top.map((t) => (
              <div
                key={t.name}
                className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-between"
              >
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm opacity-80">
                  x{t.qty} • {idr(t.amount)}
                </div>
              </div>
            ))}
            {top.length === 0 && (
              <div className="opacity-70 text-sm">Belum ada data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
