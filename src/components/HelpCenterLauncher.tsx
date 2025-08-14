import { useState } from "react";
import HelpCenter from "./HelpCenter";

export default function HelpCenterLauncher({
  floating = false,
}: {
  floating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (floating) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[9998] w-12 h-12 rounded-full bg-black text-white text-xl flex items-center justify-center shadow-lg hover:opacity-90"
          aria-label="Help"
          title="Help"
        >
          ?
        </button>
        <HelpCenter open={open} onClose={() => setOpen(false)} />
      </>
    );
  }
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded bg-black/10 hover:bg-black/20 flex items-center gap-2"
      >
        <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-sm">
          ?
        </span>
        <span>Help</span>
      </button>
      <HelpCenter open={open} onClose={() => setOpen(false)} />
    </>
  );
}
