import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { toast } from "../ui/toastStore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [org, setOrg] = useState("");

  const goIn = async () => {
    try {
      await signIn(email, pass);
      toast.success("Berhasil masuk");
      nav("/role");
    } catch {
      toast.error("Email atau password salah");
    }
  };

  const goUp = async () => {
    try {
      await signUp(email, pass, org);
      toast.success("Akun dibuat, silakan pilih peran");
      nav("/role");
    } catch {
      toast.error("Gagal membuat akun");
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "in") goIn();
    else goUp();
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md card p-6">
        <div className="text-center text-xl font-bold mb-4">Zyngra POS</div>
        <div className="flex gap-2 mb-4">
          <button
            className={`flex-1 px-3 py-2 ${tab === "in" ? "bg-black/10" : ""}`}
            onClick={() => setTab("in")}
          >
            Masuk
          </button>
          <button
            className={`flex-1 px-3 py-2 ${tab === "up" ? "bg-black/10" : ""}`}
            onClick={() => setTab("up")}
          >
            Daftar
          </button>
        </div>
        <form className="grid gap-2" onSubmit={onSubmit}>
          {tab === "in" ? (
            <>
              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                placeholder="Password"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
              <button
                type="submit"
                className="px-3 py-2 rounded bg-blue-600 text-white"
              >
                Masuk
              </button>
            </>
          ) : (
            <>
              <input
                placeholder="Nama Organisasi"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
              />
              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                placeholder="Password"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
              <button
                type="submit"
                className="px-3 py-2 rounded bg-green-600 text-white"
              >
                Daftar
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
