import { useToastStore } from "./toastStore";
import { useEffect, useState } from "react";
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiInformationCircle,
} from "react-icons/hi";

export default function ToastContainer() {
  const items = useToastStore((s) => s.items);
  const remove = useToastStore((s) => s.remove);
  const [leaving, setLeaving] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") items.forEach((i) => remove(i.id));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, remove]);

  return (
    <div className="fixed top-3 right-3 z-[9999] grid gap-2">
      {items.map((i) => (
        <div
          key={i.id}
          className={`toast-enter ${leaving === i.id ? "toast-leave" : ""} flex items-start gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 shadow-2xl`}
          onAnimationEnd={() => {
            if (leaving === i.id) remove(i.id);
          }}
        >
          <div className="text-2xl">
            {i.type === "success" && (
              <HiCheckCircle className="text-green-500" />
            )}
            {i.type === "info" && (
              <HiInformationCircle className="text-blue-500" />
            )}
            {i.type === "error" && (
              <HiExclamationCircle className="text-red-500" />
            )}
          </div>
          <div className="min-w-[220px] max-w-[320px]">
            {i.title && <div className="font-semibold mb-0.5">{i.title}</div>}
            <div className="text-sm opacity-90">{i.message}</div>
          </div>
          <button
            onClick={() => setLeaving(i.id)}
            className="ml-2 text-xs px-2 py-1 rounded bg-black/10 dark:bg-white/20"
          >
            Tutup
          </button>
        </div>
      ))}
    </div>
  );
}
