import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

function toMs(x: any): number | null {
  if (!x) return null;
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const t = Date.parse(x);
    return isNaN(t) ? null : t;
  }
  if (typeof x === "object") {
    if (typeof x.toMillis === "function") return x.toMillis();
    if (typeof x.seconds === "number") return x.seconds * 1000;
  }
  return null;
}

export default function TrialPopup() {
  const { org } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const daysLeft = useMemo(() => {
    const ms = toMs(org?.trialExpiresAt);
    if (ms == null) return null;
    return Math.ceil((ms - Date.now()) / (1000 * 60 * 60 * 24));
  }, [org?.trialExpiresAt]);

  useEffect(() => {
    if (daysLeft == null) return;
    if (daysLeft <= 7 && daysLeft > 0) setOpen(true);
    else setOpen(false);
  }, [daysLeft]);

  if (!open) return null;

  return (
    <div className="fixed z-[9999] max-w-xs" style={{ right: 12, bottom: 100 }}>
      <div className="px-4 py-3 rounded-2xl border border-black/10 bg-white/95 shadow-2xl">
        <div className="text-sm font-semibold mb-1">
          Masa Trial Hampir Habis
        </div>
        <div className="text-sm opacity-80 mb-3">
          Berakhir{" "}
          {dayjs(toMs(org?.trialExpiresAt) || Date.now()).format(
            "DD/MM/YYYY HH:mm"
          )}{" "}
          • Sisa {daysLeft} hari
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1.5 rounded bg-black/10"
            onClick={() => setOpen(false)}
          >
            Nanti
          </button>
          <button
            className="px-3 py-1.5 rounded bg-blue-600 text-white"
            onClick={() => {
              setOpen(false);
              nav("/settings");
            }}
          >
            Lihat
          </button>
        </div>
      </div>
    </div>
  );
}
