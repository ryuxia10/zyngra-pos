export type ShortcutItem = { keys: string; label: string };
export type ShortcutSection = { title: string; items: ShortcutItem[] };

const globalShortcuts: ShortcutSection = {
  title: "Global",
  items: [
    { keys: "? / Ctrl+/", label: "Buka Shortcut" },
    { keys: "Esc", label: "Tutup" },
  ],
};

const salesShortcuts: ShortcutSection = {
  title: "Penjualan",
  items: [
    { keys: "F2", label: "Fokus Pencarian Produk" },
    { keys: "Alt+K", label: "Checkout" },
  ],
};

const authShortcuts: ShortcutSection = {
  title: "Login & Peran",
  items: [{ keys: "Enter", label: "Kirim Form" }],
};

const purchasesShortcuts: ShortcutSection = {
  title: "Pembelian",
  items: [],
};

export function shortcutDefs(pathname: string): ShortcutSection[] {
  const list: ShortcutSection[] = [globalShortcuts];
  if (pathname.startsWith("/sales")) list.push(salesShortcuts);
  if (pathname.startsWith("/login") || pathname.startsWith("/role"))
    list.push(authShortcuts);
  if (pathname.startsWith("/purchases")) list.push(purchasesShortcuts);
  return list;
}
