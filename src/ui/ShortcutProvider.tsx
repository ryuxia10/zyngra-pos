import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import ShortcutOverlay from "./ShortcutOverlay";

type Ctx = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};
const C = createContext<Ctx>(null as any);

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((t as any).isContentEditable) return true;
  return false;
}

export function ShortcutProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((v) => !v);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const k = e.key;
      if ((e.ctrlKey || e.metaKey) && k === "/") {
        e.preventDefault();
        open();
        return;
      }
      if (k === "?" || (k === "/" && e.shiftKey)) {
        e.preventDefault();
        open();
        return;
      }
      if (k === "Escape" && isOpen) {
        e.preventDefault();
        close();
        return;
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true } as any);
  }, [isOpen]);

  const v = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen]);

  return (
    <C.Provider value={v}>
      {children}
      <ShortcutOverlay />
      <button
        onClick={toggle}
        className="fixed bottom-4 right-4 z-[900] md:hidden rounded-full shadow-lg ring-1 ring-black/10 bg-white px-4 h-10 text-sm"
        aria-label="Buka Shortcut"
      >
        ?
      </button>
    </C.Provider>
  );
}

export const useShortcutOverlay = () => useContext(C);
