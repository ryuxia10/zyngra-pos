import dayjs from "dayjs";
import { useAuth } from "../auth/AuthContext";

export default function Receipt({
  data,
  onClose,
}: {
  data: { date: string; items: any[]; total: number; method: string };
  onClose: () => void;
}) {
  const { org } = useAuth();
  const storeName = org?.store?.name || "Zyngra POS";
  const storePhone = org?.store?.phone || "";
  const storeAddr = org?.store?.address || "";

  const lines = data.items.map((i) => {
    const qtyPrice = `${i.qty} x ${Number(i.price || 0).toLocaleString("id-ID")}`;
    const sub = (Number(i.qty || 0) * Number(i.price || 0)).toLocaleString(
      "id-ID"
    );
    return { name: String(i.name || "-"), rightA: qtyPrice, rightB: sub };
  });

  const printNow = () => setTimeout(() => window.print(), 50);

  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="no-print absolute top-0 left-0 right-0 grid place-items-center pointer-events-none">
        <div className="pointer-events-auto mt-3 px-4 py-3 rounded-2xl border border-black/10 bg-white/95 shadow-2xl max-w-md w-[92%]">
          <div className="font-semibold">Struk Siap Cetak</div>
          <div className="text-sm opacity-70 mb-3">
            Pastikan printer thermal 80mm sudah dipilih.
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-black/10"
            >
              Tutup
            </button>
            <button
              onClick={printNow}
              className="px-3 py-1.5 rounded bg-green-600 text-white"
            >
              Print
            </button>
          </div>
        </div>
      </div>

      <div id="receipt-print" className="print-only">
        <div className="receipt-paper bg-white text-black rounded">
          <div className="text-center">
            <div className="font-bold text-lg">{storeName}</div>
            {storePhone ? <div className="text-xs">{storePhone}</div> : null}
            {storeAddr ? <div className="text-xs">{storeAddr}</div> : null}
            <div className="text-xs">
              Tanggal {dayjs().format("DD/MM/YYYY HH:mm")}
            </div>
          </div>
          <div className="my-2 border-t border-dashed border-black/40" />
          <div className="text-[13px] font-mono">
            {lines.map((l, idx) => (
              <div key={idx} className="py-0.5">
                <div className="flex justify-between">
                  <span className="truncate max-w-[60%]">{l.name}</span>
                  <span className="tabular-nums">{l.rightA}</span>
                </div>
                <div className="flex justify-between text-xs opacity-70">
                  <span>Subtotal</span>
                  <span className="tabular-nums">Rp {l.rightB}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="my-2 border-t border-dashed border-black/40" />
          <div className="text-[13px] font-mono">
            <div className="flex justify-between">
              <span>Metode</span>
              <span className="uppercase">
                {String(data.method || "tunai")}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="tabular-nums">
                Rp {Number(data.total || 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
          <div className="my-2 border-t border-dashed border-black/40" />
          <div className="text-center text-[12px]">
            Terima kasih telah berbelanja!
          </div>
          <div className="mt-2 text-center text-[11px] opacity-70">
            Struk ini bukan bukti pajak
          </div>
        </div>
      </div>
    </div>
  );
}
