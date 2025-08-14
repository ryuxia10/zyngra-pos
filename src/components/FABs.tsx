import { useState, useCallback } from "react";
import HelpCenter from "./HelpCenter";

export default function FABs() {
  const [openHelp, setOpenHelp] = useState(false);

  const triggerShortcutOverlay = useCallback(() => {
    const ev = new KeyboardEvent("keydown", {
      key: "/",
      code: "Slash",
      shiftKey: true,
      bubbles: true,
    });
    window.dispatchEvent(ev);
  }, []);

  return (
    <>
      <div className="fixed bottom-4 left-4 z-[9997] flex items-center gap-2">
        <button
          onClick={triggerShortcutOverlay}
          className="w-12 h-12 rounded-full bg-black text-white text-xl flex items-center justify-center shadow-lg hover:opacity-90"
          aria-label="Shortcut Navigasi"
          title="Shortcut Navigasi (Shift+/)"
        >
          ⌨
        </button>

        <button
          onClick={() => setOpenHelp(true)}
          className="w-12 h-12 rounded-full bg-black text-white text-xl flex items-center justify-center shadow-lg hover:opacity-90"
          aria-label="Help"
          title="Help"
        >
          ?
        </button>
      </div>

      <HelpCenter open={openHelp} onClose={() => setOpenHelp(false)} />
    </>
  );
}
