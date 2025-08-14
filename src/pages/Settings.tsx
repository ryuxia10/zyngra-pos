import { useAuth } from "../auth/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useEffect, useMemo, useState } from "react";
import { useSessionRole } from "../hooks/useSessionRole";
import { toast } from "../ui/toastStore";
import dayjs from "dayjs";

export default function Settings() {
  const { org, refresh } = useAuth();
  const { role } = useSessionRole();
  const [perm, setPerm] = useState({
    cashierCanEditSales: false,
    cashierCanDeleteSales: false,
    cashierCanApplyDiscount: false,
  });
  const [lockedThemes] = useState([
    { id: "sunset", name: "Sunset Pop", locked: true },
    { id: "forest", name: "Forest Zen", locked: true },
    { id: "neon", name: "Neon Cyber", locked: true },
  ]);

  const daysLeft = useMemo(() => {
    if (!org?.trialExpiresAt?.toMillis) return null;
    const ms = org.trialExpiresAt.toMillis() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }, [org?.trialExpiresAt]);

  useEffect(() => {
    const load = async () => {
      if (!org) return;
      const snap = await getDoc(doc(db, "orgs", org.id));
      const data = snap.data() as any;
      setPerm(data?.settings?.permissions || perm);
    };
    load();
  }, [org?.id]);

  const save = async () => {
    if (!org) return;
    if (role !== "admin") return toast.error("Hanya admin");
    await setDoc(
      doc(db, "orgs", org.id),
      { settings: { ...(org.settings || {}), permissions: perm } },
      { merge: true }
    );
    await refresh();
    toast.success("Setting tersimpan");
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Setting</h1>

      {typeof daysLeft === "number" && (
        <div className="card p-4">
          <div className="font-semibold">Masa Trial</div>
          <div className="text-sm opacity-80">
            Berakhir:{" "}
            {dayjs(org?.trialExpiresAt?.toMillis?.() || Date.now()).format(
              "DD/MM/YYYY"
            )}{" "}
            • Sisa {daysLeft} hari
          </div>
        </div>
      )}

      {role !== "admin" ? (
        <div className="card p-4">Menu ini hanya untuk Admin.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="font-semibold mb-2">Hak Kasir</div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={perm.cashierCanEditSales}
                onChange={(e) =>
                  setPerm({ ...perm, cashierCanEditSales: e.target.checked })
                }
              />
              <span>Kasir boleh mengedit penjualan</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={perm.cashierCanDeleteSales}
                onChange={(e) =>
                  setPerm({ ...perm, cashierCanDeleteSales: e.target.checked })
                }
              />
              <span>Kasir boleh menghapus penjualan</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={perm.cashierCanApplyDiscount}
                onChange={(e) =>
                  setPerm({
                    ...perm,
                    cashierCanApplyDiscount: e.target.checked,
                  })
                }
              />
              <span>Kasir boleh memberi diskon</span>
            </label>
            <button
              onClick={save}
              className="mt-3 px-3 py-2 rounded bg-blue-600 text-white"
            >
              Simpan
            </button>
          </div>

          <div className="card p-4">
            <div className="font-semibold mb-2">Tema (Terkunci)</div>
            <p className="text-sm opacity-70 mb-2">
              Nantikan update berikutnya!
            </p>
            <div className="grid sm:grid-cols-3 gap-2">
              {lockedThemes.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl border border-black/10 bg-black/5 text-center opacity-60"
                >
                  {t.name} 🔒
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
