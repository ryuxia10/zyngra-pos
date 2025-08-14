import { useEffect, useState, useCallback } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  increment,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthContext";
import { auditLog } from "../lib/audit";

export function useShift() {
  const { org, user, userDoc } = useAuth();
  const [loading, setLoading] = useState(false);
  const [shift, setShift] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    const q = query(
      collection(db, "shifts"),
      where("orgId", "==", org.id),
      where("closedAt", "==", null),
      limit(1)
    );
    const snap = await getDocs(q);
    setShift(
      snap.docs.length
        ? { id: snap.docs[0].id, ...(snap.docs[0].data() as any) }
        : null
    );
    setLoading(false);
  }, [org?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (openingCash: number) => {
    if (!org || !userDoc) return;
    if (shift) throw new Error("Shift masih terbuka");
    const ref = await addDoc(collection(db, "shifts"), {
      orgId: org.id,
      openedByUid: userDoc.uid,
      openingCash: Number(openingCash) || 0,
      closingCash: null,
      cashSales: 0,
      cashIn: 0,
      cashOut: 0,
      notes: "",
      createdAt: serverTimestamp(),
      openedAt: serverTimestamp(),
      closedAt: null,
    });
    await auditLog({
      orgId: org.id,
      user,
      entity: "shift",
      action: "open",
      entityId: ref.id,
      after: { openingCash: Number(openingCash) || 0 },
    });
    await load();
  };

  const addCashIn = async (amount: number, reason: string) => {
    if (!org || !userDoc || !shift) return;
    const amt = Number(amount) || 0;
    await addDoc(collection(db, "cashMovements"), {
      orgId: org.id,
      shiftId: shift.id,
      type: "cash_in",
      amount: amt,
      reason,
      createdAt: serverTimestamp(),
      byUid: userDoc.uid,
    });
    await updateDoc(doc(db, "shifts", shift.id), { cashIn: increment(amt) });
    await auditLog({
      orgId: org.id,
      user,
      entity: "cash",
      action: "in",
      entityId: shift.id,
      after: { amount: amt, reason },
    });
    await load();
  };

  const addCashOut = async (amount: number, reason: string) => {
    if (!org || !userDoc || !shift) return;
    const amt = Number(amount) || 0;
    await addDoc(collection(db, "cashMovements"), {
      orgId: org.id,
      shiftId: shift.id,
      type: "cash_out",
      amount: amt,
      reason,
      createdAt: serverTimestamp(),
      byUid: userDoc.uid,
    });
    await updateDoc(doc(db, "shifts", shift.id), { cashOut: increment(amt) });
    await auditLog({
      orgId: org.id,
      user,
      entity: "cash",
      action: "out",
      entityId: shift.id,
      after: { amount: amt, reason },
    });
    await load();
  };

  const addCashSale = async (amount: number, saleId?: string) => {
    if (!org || !userDoc || !shift) return;
    const amt = Number(amount) || 0;
    await addDoc(collection(db, "cashMovements"), {
      orgId: org.id,
      shiftId: shift.id,
      type: "cash_sale",
      amount: amt,
      reason: "Penjualan tunai",
      saleId: saleId || null,
      createdAt: serverTimestamp(),
      byUid: userDoc.uid,
    });
    await updateDoc(doc(db, "shifts", shift.id), { cashSales: increment(amt) });
    await auditLog({
      orgId: org.id,
      user,
      entity: "cash",
      action: "sale",
      entityId: shift.id,
      after: { amount: amt, saleId: saleId || null },
    });
    await load();
  };

  const close = async (closingCash: number) => {
    if (!org || !shift) return;
    await setDoc(
      doc(db, "shifts", shift.id),
      { closingCash: Number(closingCash) || 0, closedAt: serverTimestamp() },
      { merge: true }
    );
    await auditLog({
      orgId: org.id,
      user,
      entity: "shift",
      action: "close",
      entityId: shift.id,
      after: { closingCash: Number(closingCash) || 0 },
    });
    await load();
  };

  return {
    loading,
    shift,
    open,
    close,
    addCashIn,
    addCashOut,
    addCashSale,
    refresh: load,
  };
}
