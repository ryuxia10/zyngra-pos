import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";

type Log = {
  id: string;
  entity: string;
  action: string;
  entityId?: string | null;
  byUid?: string | null;
  byEmail?: string | null;
  createdAt?: any;
  before?: any;
  after?: any;
  meta?: any;
};

const ENTITIES = [
  "all",
  "product",
  "category",
  "sale",
  "cash",
  "shift",
  "stock",
  "purchase",
];

export default function Audit() {
  const { org } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterText, setFilterText] = useState("");
  const [filterUser, setFilterUser] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!org) {
        setLogs([]);
        return;
      }
      const qy = query(collection(db, "logs"), where("orgId", "==", org.id));
      const snap = await getDocs(qy);
      const arr: Log[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      arr.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
      );
      setLogs(arr.slice(0, 200));
    };
    load();
  }, [org?.id]);

  const view = useMemo(() => {
    const t = filterText.trim().toLowerCase();
    const u = filterUser.trim().toLowerCase();
    return logs.filter((l) => {
      const okE = filterEntity === "all" ? true : l.entity === filterEntity;
      const okT = t
        ? JSON.stringify([l.before, l.after, l.meta])
            .toLowerCase()
            .includes(t) ||
          String(l.entityId || "")
            .toLowerCase()
            .includes(t)
        : true;
      const okU = u
        ? String(l.byEmail || "")
            .toLowerCase()
            .includes(u) ||
          String(l.byUid || "")
            .toLowerCase()
            .includes(u)
        : true;
      return okE && okT && okU;
    });
  }, [logs, filterEntity, filterText, filterUser]);

  const exportCSV = () => {
    const header = [
      "time",
      "entity",
      "action",
      "entityId",
      "byEmail",
      "byUid",
      "before",
      "after",
      "meta",
    ];
    const lines = [header.join(",")];
    for (const l of view) {
      const time = l.createdAt?.toDate
        ? dayjs(l.createdAt.toDate()).format("YYYY-MM-DD HH:mm:ss")
        : "";
      const row = [
        time,
        l.entity,
        l.action,
        l.entityId || "",
        l.byEmail || "",
        l.byUid || "",
        JSON.stringify(l.before || {}),
        JSON.stringify(l.after || {}),
        JSON.stringify(l.meta || {}),
      ];
      const esc = (s: string) =>
        /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      lines.push(row.map((x) => esc(String(x))).join(","));
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-logs.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Audit Trail</h1>

      <div className="card p-4 grid md:grid-cols-4 gap-3">
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
        >
          {ENTITIES.map((x) => (
            <option key={x} value={x}>
              {x.toUpperCase()}
            </option>
          ))}
        </select>
        <input
          placeholder="Cari teks (before/after/meta)"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <input
          placeholder="Filter user (email/uid)"
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
        />
        <button onClick={exportCSV} className="px-3 py-2 rounded bg-black/10">
          Export CSV
        </button>
      </div>

      <div className="card p-4">
        <div className="grid gap-2 max-h-[560px] overflow-auto">
          {view.map((l) => (
            <div key={l.id} className="p-2 rounded bg-black/5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm">
                  <b>{l.entity.toUpperCase()}</b> • {l.action.toUpperCase()} •{" "}
                  {l.entityId || "-"}
                </div>
                <div className="text-xs opacity-70">
                  {l.createdAt?.toDate
                    ? dayjs(l.createdAt.toDate()).format("DD/MM HH:mm:ss")
                    : ""}{" "}
                  • {l.byEmail || l.byUid || "-"}
                </div>
              </div>
              <div className="mt-1 grid md:grid-cols-3 gap-2 text-xs">
                <pre className="p-2 rounded bg-white/70 border border-black/10 overflow-auto">
                  {JSON.stringify(l.before || {}, null, 2)}
                </pre>
                <pre className="p-2 rounded bg-white/70 border border-black/10 overflow-auto">
                  {JSON.stringify(l.after || {}, null, 2)}
                </pre>
                <pre className="p-2 rounded bg-white/70 border border-black/10 overflow-auto">
                  {JSON.stringify(l.meta || {}, null, 2)}
                </pre>
              </div>
            </div>
          ))}
          {view.length === 0 && (
            <div className="opacity-70 text-sm">Tidak ada log</div>
          )}
        </div>
      </div>
    </div>
  );
}
