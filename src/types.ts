export type Role = "admin" | "kasir";
export type PaymentMethod = "qris" | "tunai" | "kartu" | "grab";

export interface StoreProfile {
  name?: string;
  address?: string;
  phone?: string;
}

export interface Org {
  id: string;
  ownerUid: string;
  trialExpiresAt?: any;
  settings?: {
    permissions?: {
      cashierCanEditSales?: boolean;
      cashierCanDeleteSales?: boolean;
      cashierCanApplyDiscount?: boolean;
    };
  };
  store?: StoreProfile;
  adminPinHash?: string;
}

export interface SaleItem {
  productId?: string | null;
  name: string;
  qty: number;
  price: number;
}

export interface Sale {
  id: string;
  orgId: string;
  date: any;
  items: SaleItem[];
  paymentMethod: PaymentMethod;
  total: number;
  cogs?: number;
  grossProfit?: number;
  margin?: number;
  source?: string;
  createdAt?: any;
}

export type Product = {
  id: string;
  orgId: string;
  name: string;
  category?: string | null;
  price?: number;
  stock?: number;
  barcode?: string | null;
  minStock?: number;
  avgCost?: number;
  createdAt?: any;

  hasMeasure?: boolean;
  measureUnit?: string | null;
  contentPerItem?: number;
  stockContent?: number;
  minContent?: number;
};
