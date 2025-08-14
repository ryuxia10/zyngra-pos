import { useEffect, useState } from "react";
import dayjs from "dayjs";

export default function ClockWidget() {
  const [now, setNow] = useState(dayjs());
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="fixed bottom-3 right-3 z-[70] px-3 py-2 rounded-xl border border-black/10 bg-white/90 backdrop-blur shadow">
      <div className="text-xs opacity-70">{now.format("dddd")}</div>
      <div className="font-semibold">{now.format("HH:mm:ss")}</div>
      <div className="text-xs opacity-70">{now.format("DD/MM/YYYY")}</div>
    </div>
  );
}
