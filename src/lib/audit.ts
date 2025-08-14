import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "cash_in"
  | "cash_out"
  | "sale"
  | "adjustment"
  | "stock_opname"
  | "purchase"
  | "purchase_void"
  | "stock_move"
  | "report_export"
  | "report_pdf_export"
  | "report_csv_export"
  | "shift_open"
  | "shift_close";

export type LegacyAction =
  | "in"
  | "out"
  | "adjust"
  | "opname"
  | "export"
  | "pdf_export"
  | "csv_export"
  | "open"
  | "close";

export interface AuditInput {
  orgId: string;
  user?: { uid: string; email?: string } | null;
  entity: string;
  action: AuditAction | LegacyAction;
  entityId?: string;
  before?: any;
  after?: any;
  meta?: any;
}

export function normalizeAction(a: AuditAction | LegacyAction): AuditAction {
  switch (a) {
    case "in":
      return "cash_in";
    case "out":
      return "cash_out";
    case "adjust":
      return "adjustment";
    case "opname":
      return "stock_opname";
    case "export":
      return "report_export";
    case "pdf_export":
      return "report_pdf_export";
    case "csv_export":
      return "report_csv_export";
    case "open":
      return "shift_open";
    case "close":
      return "shift_close";
    default:
      return a;
  }
}

export async function auditLog(input: AuditInput): Promise<void> {
  const a = normalizeAction(input.action);
  await addDoc(collection(db, "logs"), {
    orgId: input.orgId,
    entity: input.entity,
    action: a,
    entityId: input.entityId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    meta: input.meta ?? null,
    byUid: input.user?.uid ?? null,
    byEmail: input.user?.email ?? null,
    createdAt: serverTimestamp(),
  });
}

export default auditLog;
