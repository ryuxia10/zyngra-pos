import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSessionRole } from "../hooks/useSessionRole";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "../ui/toastStore";

export default function StoreProfile() {
  const { org, refresh } = useAuth();
  const { role } = useSessionRole();
  const canAdmin = role === "admin";
  const [name, setName] = useState("");
  const [addr, setAddr] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!org) return;
      const snap = await getDoc(doc(db, "orgs", org.id));
      const data = snap.data() as any;
      setName(data?.store?.name || "Zyngra POS");
      setAddr(data?.store?.address || "");
      setPhone(data?.store?.phone || "");
    };
    load();
  }, [org?.id]);

  const save = async () => {
    if (!org) return;
    if (!canAdmin) {
      toast.error("Hanya admin");
      return;
    }
    await setDoc(
      doc(db, "orgs", org.id),
      { store: { name, address: addr, phone } },
      { merge: true }
    );
    await refresh();
    toast.success("Profil toko disimpan");
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Profil Toko</h1>
      {!canAdmin ? (
        <div className="card p-4">Menu ini hanya untuk Admin.</div>
      ) : (
        <div className="card p-4 grid gap-3 max-w-xl">
          <input
            placeholder="Nama Toko"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Alamat"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
          />
          <input
            placeholder="Nomor Telepon"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            onClick={save}
            className="px-3 py-2 rounded bg-blue-600 text-white w-fit"
          >
            Simpan
          </button>
        </div>
      )}
    </div>
  );
}
