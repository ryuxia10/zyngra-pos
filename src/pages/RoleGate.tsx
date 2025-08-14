import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import bcrypt from "bcryptjs";
import type { Role } from "../types";
import { useNavigate } from "react-router-dom";
import { useSessionRole } from "../hooks/useSessionRole";
import { toast } from "../ui/toastStore";

export default function RoleGate() {
  const { userDoc, org, refresh } = useAuth();
  const { set } = useSessionRole();
  const nav = useNavigate();
  const [role, setRole] = useState<Role>("kasir");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (!org) return;
    if (!org.adminPinHash) setRole("admin");
    else setRole("kasir");
  }, [org?.id, org?.adminPinHash]);

  const save = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userDoc || !org) return;

    try {
      const orgRef = doc(db, "orgs", org.id);
      const snap = await getDoc(orgRef);
      const data = snap.data() || {};

      if (role === "admin") {
        if (!data.adminPinHash) {
          if (!newPin || newPin.length < 4 || newPin !== confirm) {
            toast.error("PIN min 4 digit dan harus sama");
            return;
          }
          const hash = await bcrypt.hash(newPin, 10);
          const patch: any = { adminPinHash: hash };
          if (!data.ownerUid) patch.ownerUid = userDoc.uid;
          await setDoc(orgRef, patch, { merge: true });
        } else {
          const ok = await bcrypt.compare(pin, data.adminPinHash);
          if (!ok) {
            toast.error("PIN admin salah");
            return;
          }
        }
      }

      set(role);
      await setDoc(
        doc(db, "users", userDoc.uid),
        { role, orgId: org.id },
        { merge: true }
      );
      await refresh();
      toast.success("Peran diset");
      nav("/dashboard");
    } catch {
      toast.error("Gagal menyimpan peran");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center">
      <form className="w-full max-w-md card p-6" onSubmit={save}>
        <h2 className="text-xl font-semibold mb-4">Pilih Peran</h2>
        <div className="grid gap-3">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              checked={role === "kasir"}
              onChange={() => setRole("kasir")}
            />
            <span>Kasir</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              checked={role === "admin"}
              onChange={() => setRole("admin")}
            />
            <span>Admin</span>
          </label>

          {role === "admin" &&
            (org?.adminPinHash ? (
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN Admin"
                type="password"
                className="px-3 py-2 rounded bg-white"
              />
            ) : (
              <div className="grid gap-2">
                <input
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Buat PIN Admin (min 4 digit)"
                  type="password"
                  className="px-3 py-2 rounded bg-white"
                />
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Ulangi PIN"
                  type="password"
                  className="px-3 py-2 rounded bg-white"
                />
              </div>
            ))}

          <button
            type="submit"
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2"
          >
            Lanjut
          </button>
        </div>
      </form>
    </div>
  );
}
