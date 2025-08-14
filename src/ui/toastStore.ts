import { create } from "zustand";

type ToastType = "success" | "info" | "error";
export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastStore {
  items: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  items: [],
  push: (t) => {
    const id = crypto.randomUUID();
    const item = { id, ...t };
    set((s) => ({ items: [item, ...s.items].slice(0, 5) }));
    setTimeout(() => {
      const exists = get().items.find((i) => i.id === id);
      if (exists) get().remove(id);
    }, 3500);
  },
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export const toast = {
  success: (m: string, title?: string) =>
    useToastStore.getState().push({ type: "success", message: m, title }),
  info: (m: string, title?: string) =>
    useToastStore.getState().push({ type: "info", message: m, title }),
  error: (m: string, title?: string) =>
    useToastStore.getState().push({ type: "error", message: m, title }),
};
