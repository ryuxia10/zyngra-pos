import { create } from "zustand";

export interface CartItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  qty: number;
}

interface CartState {
  items: CartItem[];
  add: (it: Omit<CartItem, "id"> & { id?: string }) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  setQty: (id: string, q: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  total: () => number;
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  add: (it) =>
    set((state) => {
      const id = it.id || crypto.randomUUID();
      const found = state.items.find((i) =>
        it.productId
          ? i.productId === it.productId
          : i.name === it.name && i.price === it.price
      );
      if (found)
        return {
          items: state.items.map((i) =>
            i === found ? { ...i, qty: i.qty + (it.qty || 1) } : i
          ),
        };
      return {
        items: [
          ...state.items,
          {
            id,
            productId: it.productId,
            name: it.name,
            price: it.price,
            qty: it.qty || 1,
          },
        ],
      };
    }),
  inc: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, qty: i.qty + 1 } : i
      ),
    })),
  dec: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i
      ),
    })),
  setQty: (id, q) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, q) } : i
      ),
    })),
  remove: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((a, c) => a + c.price * c.qty, 0),
}));
