import { useEffect, useMemo, useState } from "react";
import { useShift } from "../hooks/useShift";
import { useAuth } from "../auth/AuthContext";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";
import { toast } from "../ui/toastStore";

export default function Cash() {
  const { org } = useAuth();
  const { shift, loading, open, close, addCashIn, addCashOut, refresh } =
    useShift();

  const [openAmt, setOpenAmt] = useState<number | "">("");
  const [inAmt, setInAmt] = useState<number | "">("");
  const [inReason, setInReason] = useState("");
  const [outAmt, setOutAmt] = useState<number | "">("");
  const [outReason, setOutReason] = useState("");
  const [closeAmt, setCloseAmt] = useState<number | "">("");

  const [moves, setMoves] = useState<any[]>([]);
  const [historyShifts, setHistoryShifts] = useState<any[]>([]);
  const [selShift, setSelShift] = useState<any | null>(null);
  const [selMoves, setSelMoves] = useState<any[]>([]);

  const expected = useMemo(() => {
    if (!shift) return 0;
    return (
      Number(shift.openingCash || 0) +
      Number(shift.cashSales || 0) +
      Number(shift.cashIn || 0) -
      Number(shift.cashOut || 0)
    );
  }, [shift]);

  useEffect(() => {
    const load = async () => {
      if (!org || !shift) {
        setMoves([]);
        return;
      }
      const q = query(
        collection(db, "cashMovements"),
        where("orgId", "==", org.id),
        where("shiftId", "==", shift.id)
      );
      const snap = await getDocs(q);
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      arr.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
      );
      setMoves(arr.slice(0, 30));
    };
    load();
  }, [org?.id, shift?.id]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!org) {
        setHistoryShifts([]);
        return;
      }
      const q = query(
        collection(db, "shifts"),
        where("orgId", "==", org.id),
        limit(60)
      );
      const snap = await getDocs(q);
      const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const closed = all
        .filter((s) => s.closedAt?.toMillis)
        .sort(
          (a, b) => (b.closedAt.toMillis() || 0) - (a.closedAt.toMillis() || 0)
        );
      setHistoryShifts(closed.slice(0, 30));
    };
    loadHistory();
  }, [org?.id, shift?.id]);

  const loadSelMoves = async (s: any) => {
    if (!org) return;
    const q = query(
      collection(db, "cashMovements"),
      where("orgId", "==", org.id),
      where("shiftId", "==", s.id)
    );
    const snap = await getDocs(q);
    const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    arr.sort(
      (a, b) =>
        (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
    );
    setSelMoves(arr.slice(0, 60));
  };

  const doOpen = async () => {
    try {
      await open(Number(openAmt || 0));
      setOpenAmt("");
      toast.success("Shift dibuka");
    } catch {
      toast.error("Gagal membuka shift");
    }
  };
  const doIn = async () => {
    if (!inAmt) return toast.error("Jumlah kosong");
    await addCashIn(Number(inAmt || 0), inReason.trim());
    setInAmt("");
    setInReason("");
    toast.success("Setoran kas ditambahkan");
  };
  const doOut = async () => {
    if (!outAmt) return toast.error("Jumlah kosong");
    await addCashOut(Number(outAmt || 0), outReason.trim());
    setOutAmt("");
    setOutReason("");
    toast.success("Penarikan kas ditambahkan");
  };
  const doClose = async () => {
    await close(Number(closeAmt || 0));
    setCloseAmt("");
    toast.success("Shift ditutup");
    await refresh();
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Kas & Shift</h1>

      {loading ? (
        <div className="card p-4">Memuat...</div>
      ) : !shift ? (
        <div className="card p-4 grid gap-3 max-w-md">
          <div className="font-semibold">Buka Shift</div>
          <input
            type="number"
            placeholder="Setoran awal kas"
            value={openAmt}
            onChange={(e) =>
              setOpenAmt(e.target.value ? Number(e.target.value) : "")
            }
          />
          <button
            onClick={doOpen}
            className="px-3 py-2 rounded bg-green-600 text-white w-fit"
          >
            Buka Shift
          </button>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <Box title="Setoran Awal" value={shift.openingCash} />
            <Box title="Penjualan Tunai" value={shift.cashSales} />
            <Box
              title="Kas (IN - OUT)"
              value={Number(shift.cashIn || 0) - Number(shift.cashOut || 0)}
            />
          </div>

          <div className="card p-4 grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <div className="font-semibold">Kas Masuk</div>
              <input
                type="number"
                placeholder="Jumlah"
                value={inAmt}
                onChange={(e) =>
                  setInAmt(e.target.value ? Number(e.target.value) : "")
                }
              />
              <input
                placeholder="Keterangan (opsional)"
                value={inReason}
                onChange={(e) => setInReason(e.target.value)}
              />
              <button
                onClick={doIn}
                className="px-3 py-2 rounded bg-blue-600 text-white w-fit"
              >
                Tambah IN
              </button>
            </div>
            <div className="grid gap-2">
              <div className="font-semibold">Kas Keluar</div>
              <input
                type="number"
                placeholder="Jumlah"
                value={outAmt}
                onChange={(e) =>
                  setOutAmt(e.target.value ? Number(e.target.value) : "")
                }
              />
              <input
                placeholder="Keterangan (opsional)"
                value={outReason}
                onChange={(e) => setOutReason(e.target.value)}
              />
              <button
                onClick={doOut}
                className="px-3 py-2 rounded bg-red-600 text-white w-fit"
              >
                Tambah OUT
              </button>
            </div>
            <div className="grid gap-2">
              <div className="font-semibold">Tutup Shift</div>
              <div className="text-sm opacity-70">
                Perkiraan kas: Rp {expected.toLocaleString("id-ID")}
              </div>
              <input
                type="number"
                placeholder="Hitung kas fisik"
                value={closeAmt}
                onChange={(e) =>
                  setCloseAmt(e.target.value ? Number(e.target.value) : "")
                }
              />
              <button
                onClick={doClose}
                className="px-3 py-2 rounded bg-black text-white w-fit"
              >
                Tutup Shift
              </button>
            </div>
          </div>

          <div className="card p-4">
            <div className="font-semibold mb-2">
              Aktivitas Kas (Shift Aktif)
            </div>
            <div className="grid gap-2 max-h-[420px] overflow-auto">
              {moves.map((m) => (
                <div
                  key={m.id}
                  className="p-2 rounded bg-black/5 flex items-center justify-between"
                >
                  <div className="text-sm">
                    <span
                      className={
                        m.type === "cash_out"
                          ? "text-red-600"
                          : "text-green-600"
                      }
                    >
                      {m.type === "cash_in"
                        ? "IN"
                        : m.type === "cash_out"
                          ? "OUT"
                          : "SALE"}
                    </span>{" "}
                    • {m.reason || "-"}
                  </div>
                  <div className="text-sm">
                    Rp {Number(m.amount || 0).toLocaleString("id-ID")} •{" "}
                    {m.createdAt?.toDate
                      ? dayjs(m.createdAt.toDate()).format("DD/MM HH:mm")
                      : "-"}
                  </div>
                </div>
              ))}
              {moves.length === 0 && (
                <div className="opacity-70 text-sm">Belum ada aktivitas</div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="card p-4">
        <div className="font-semibold mb-2">Riwayat Shift (30 Terbaru)</div>
        <div className="grid gap-2">
          {historyShifts.map((s) => {
            const exp =
              Number(s.openingCash || 0) +
              Number(s.cashSales || 0) +
              Number(s.cashIn || 0) -
              Number(s.cashOut || 0);
            const diff = Number(s.closingCash || 0) - exp;
            const openAt = s.openedAt?.toDate
              ? dayjs(s.openedAt.toDate()).format("DD/MM HH:mm")
              : "-";
            const closeAt = s.closedAt?.toDate
              ? dayjs(s.closedAt.toDate()).format("DD/MM HH:mm")
              : "-";
            const openedBy = s.openedByUid
              ? `• by ${s.openedByUid.slice(0, 6)}…`
              : "";
            return (
              <div key={s.id} className="p-3 rounded-xl bg-black/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm opacity-80">
                    {openAt} → {closeAt} {openedBy}
                  </div>
                  <div className="text-sm">
                    Total Tunai:{" "}
                    <b>Rp {Number(s.cashSales || 0).toLocaleString("id-ID")}</b>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                  <Pill label="Setoran Awal" value={s.openingCash} />
                  <Pill label="IN" value={s.cashIn} />
                  <Pill label="OUT" value={s.cashOut} />
                  <Pill label="Perkiraan" value={exp} />
                  <Pill label="Closing" value={s.closingCash} />
                </div>
                <div
                  className={`mt-2 text-sm font-semibold ${diff === 0 ? "text-green-700" : diff > 0 ? "text-blue-700" : "text-red-700"}`}
                >
                  Selisih:{" "}
                  {diff === 0
                    ? "Seimbang"
                    : `Rp ${Math.abs(diff).toLocaleString("id-ID")} ${diff > 0 ? "(lebih)" : "(kurang)"}`}
                </div>
                <div className="mt-2">
                  <button
                    onClick={async () => {
                      setSelShift(s);
                      await loadSelMoves(s);
                    }}
                    className="px-3 py-1.5 rounded bg-black/10"
                  >
                    Lihat Log
                  </button>
                </div>
                {selShift?.id === s.id && (
                  <div className="mt-2 border-t border-black/10 pt-2 grid gap-1 max-h-[280px] overflow-auto">
                    {selMoves.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 rounded bg-white/70 flex items-center justify-between"
                      >
                        <div className="text-sm">
                          <span
                            className={
                              m.type === "cash_out"
                                ? "text-red-600"
                                : "text-green-600"
                            }
                          >
                            {m.type === "cash_in"
                              ? "IN"
                              : m.type === "cash_out"
                                ? "OUT"
                                : "SALE"}
                          </span>{" "}
                          • {m.reason || "-"}
                        </div>
                        <div className="text-sm">
                          Rp {Number(m.amount || 0).toLocaleString("id-ID")} •{" "}
                          {m.createdAt?.toDate
                            ? dayjs(m.createdAt.toDate()).format("DD/MM HH:mm")
                            : "-"}
                        </div>
                      </div>
                    ))}
                    {selMoves.length === 0 && (
                      <div className="opacity-70 text-sm">Tidak ada log</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {historyShifts.length === 0 && (
            <div className="opacity-70 text-sm">
              Belum ada shift yang ditutup
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Box({ title, value }: { title: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-sm opacity-70 mb-1">{title}</div>
      <div className="text-2xl font-bold">
        Rp {Number(value || 0).toLocaleString("id-ID")}
      </div>
    </div>
  );
}
function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 py-1.5 rounded-xl bg-white/70 border border-black/10">
      <div className="text-xs opacity-70">{label}</div>
      <div className="font-semibold">
        Rp {Number(value || 0).toLocaleString("id-ID")}
      </div>
    </div>
  );
}
