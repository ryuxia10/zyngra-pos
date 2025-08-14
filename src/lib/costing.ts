import { doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";

export async function applyPurchaseAvgCost(
  productId: string,
  qty: number,
  unitCost: number
) {
  await runTransaction(db, async (tx) => {
    const pref = doc(db, "products", productId);
    const snap = await tx.get(pref);
    if (!snap.exists()) throw new Error("Produk tidak ditemukan");
    const d = snap.data() as any;
    const oldStock = Number(d.stock || 0);
    const oldAvg = Number(d.avgCost || 0);
    const addQty = Number(qty || 0);
    const cost = Number(unitCost || 0);
    const newStock = oldStock + addQty;
    const newAvg =
      newStock > 0 ? (oldAvg * oldStock + cost * addQty) / newStock : 0;
    tx.update(pref, { stock: newStock, avgCost: newAvg });
  });
}

export type CartItemForCogs = { productId?: string | null; qty: number };

export async function computeCogsForItems(items: CartItemForCogs[]) {
  let total = 0;
  await runTransaction(db, async (tx) => {
    for (const it of items) {
      if (!it.productId) continue;
      const pref = doc(db, "products", String(it.productId));
      const snap = await tx.get(pref);
      if (!snap.exists()) continue;
      const avg = Number((snap.data() as any)?.avgCost || 0);
      total += Number(it.qty || 0) * avg;
    }
  });
  return total;
}
