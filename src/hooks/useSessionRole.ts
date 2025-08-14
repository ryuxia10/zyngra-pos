import { useEffect, useState } from "react";
export type SessionRole = "admin" | "kasir" | null;
export function useSessionRole() {
  const [role, setRole] = useState<SessionRole>(
    () => (localStorage.getItem("sessionRole") as SessionRole) || null
  );
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sessionRole")
        setRole((localStorage.getItem("sessionRole") as SessionRole) || null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const set = (r: SessionRole) => {
    if (r) localStorage.setItem("sessionRole", r);
    else localStorage.removeItem("sessionRole");
    setRole(r);
  };
  return { role, set };
}
