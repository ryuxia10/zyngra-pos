import { useState } from "react";

type Props = { open: boolean; onClose: () => void };

export default function HelpCenter({ open, onClose }: Props) {
  const [tab, setTab] = useState<
    "guide" | "features" | "glossary" | "shortcuts" | "faq"
  >("guide");
  if (!open) return null;

  const Section = ({ title, children }: { title: string; children: any }) => (
    <div className="grid gap-2">
      <div className="text-lg font-semibold">{title}</div>
      <div className="grid gap-1 text-sm leading-relaxed">{children}</div>
    </div>
  );

  const Gloss = ({ k, v }: { k: string; v: string }) => (
    <div className="grid gap-1 p-2 rounded bg-black/5">
      <div className="font-medium">{k}</div>
      <div className="opacity-80">{v}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[95vw] max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-white text-black shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-base">
              ?
            </div>
            <div className="font-semibold">Panduan & Istilah</div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-black/10 hover:bg-black/20"
          >
            Tutup
          </button>
        </div>

        <div className="flex gap-2 px-3 pt-3 pb-2 border-b overflow-x-auto">
          <button
            onClick={() => setTab("guide")}
            className={`px-3 py-2 rounded ${tab === "guide" ? "bg-black text-white" : "bg-black/5"}`}
          >
            Cara Pakai
          </button>
          <button
            onClick={() => setTab("features")}
            className={`px-3 py-2 rounded ${tab === "features" ? "bg-black text-white" : "bg-black/5"}`}
          >
            Fitur Utama
          </button>
          <button
            onClick={() => setTab("glossary")}
            className={`px-3 py-2 rounded ${tab === "glossary" ? "bg-black text-white" : "bg-black/5"}`}
          >
            Istilah
          </button>
          <button
            onClick={() => setTab("shortcuts")}
            className={`px-3 py-2 rounded ${tab === "shortcuts" ? "bg-black text-white" : "bg-black/5"}`}
          >
            Shortcut
          </button>
          <button
            onClick={() => setTab("faq")}
            className={`px-3 py-2 rounded ${tab === "faq" ? "bg-black text-white" : "bg-black/5"}`}
          >
            FAQ
          </button>
        </div>

        <div className="p-4 overflow-auto max-h-[65vh] grid gap-6">
          {tab === "guide" && (
            <>
              <Section title="Langkah Cepat">
                <ul className="list-decimal pl-5 grid gap-1">
                  <li>
                    Masuk dengan email & kata sandi, pilih peran <b>Admin</b>{" "}
                    atau <b>Kasir</b>.
                  </li>
                  <li>
                    <b>Produk</b>: tambah produk dan kategori. Jika ingin detail
                    kemasan, aktifkan toggle, pilih unit (ml, l, g, kg, pcs),
                    isi per item, stok isi, dan batas minimum.
                  </li>
                  <li>
                    <b>Pembelian</b>: untuk menambah stok bahan baku atau biaya
                    lain. Stok bertambah, biaya modal dihitung otomatis.
                  </li>
                  <li>
                    <b>Penjualan</b>: cari produk, masukkan ke keranjang, pilih
                    metode bayar (QRIS/Tunai/Kartu/Grab), lalu Checkout.
                  </li>
                  <li>
                    <b>Cetak Struk</b> setelah penjualan. Lihat <b>Riwayat</b>{" "}
                    untuk cetak ulang atau koreksi.
                  </li>
                  <li>
                    <b>Laporan</b>: unduh CSV/PDF harian–bulanan, lihat grafik
                    dan ringkasan.
                  </li>
                  <li>
                    <b>Kas & Shift</b>: catat kas masuk/keluar, buka/tutup
                    shift, pantau saldo kas.
                  </li>
                  <li>
                    <b>Inventory</b>: pantau stok, peringatan stok menipis, dan
                    penyesuaian stok.
                  </li>
                  <li>
                    <b>Audit</b>: jejak semua aksi penting (buat/ubah/hapus).
                  </li>
                  <li>
                    <b>Settings</b>: profil toko, izin kasir, masa trial.
                  </li>
                </ul>
              </Section>
              <Section title="Tips">
                <ul className="list-disc pl-5 grid gap-1">
                  <li>
                    Gunakan <b>detail kemasan</b> untuk bahan cair/berat supaya
                    peringatan stok lebih akurat.
                  </li>
                  <li>
                    Masukkan <b>pembelian</b> agar HPP/COGS dan grafik margin
                    akurat.
                  </li>
                  <li>
                    <b>Admin</b> bisa ubah harga saat jual, kasir dibatasi.
                  </li>
                </ul>
              </Section>
            </>
          )}

          {tab === "features" && (
            <>
              <Section title="Modul">
                <ul className="list-disc pl-5 grid gap-1">
                  <li>
                    <b>Dashboard</b>: ringkasan Revenue, COGS, Gross Profit,
                    Margin, penjualan terlaris, grafik.
                  </li>
                  <li>
                    <b>Produk</b>: kategori, import–export CSV, stok item & stok
                    isi, ambang minimum.
                  </li>
                  <li>
                    <b>Pembelian</b>: bahan baku dan biaya lain, average cost,
                    void pembelian.
                  </li>
                  <li>
                    <b>Penjualan</b>: keranjang, metode bayar, cetak struk,
                    riwayat.
                  </li>
                  <li>
                    <b>Kas</b>: kas masuk/keluar, shift register.
                  </li>
                  <li>
                    <b>Inventory</b>: mutasi stok, penyesuaian stok.
                  </li>
                  <li>
                    <b>Audit</b>: jejak aktivitas.
                  </li>
                  <li>
                    <b>Laporan</b>: CSV dan PDF.
                  </li>
                  <li>
                    <b>Settings</b>: profil toko, izin, trial.
                  </li>
                </ul>
              </Section>
              <Section title="Hak Akses Singkat">
                <ul className="list-disc pl-5 grid gap-1">
                  <li>
                    <b>Admin</b>: semua fitur termasuk ubah harga, hapus/void,
                    impor.
                  </li>
                  <li>
                    <b>Kasir</b>: penjualan harian, terbatas sesuai pengaturan.
                  </li>
                </ul>
              </Section>
            </>
          )}

          {tab === "glossary" && (
            <>
              <Section title="Istilah Umum">
                <div className="grid gap-2">
                  <Gloss
                    k="Revenue (Pendapatan)"
                    v="Total nilai penjualan periode tertentu. Di aplikasi ini sama dengan total transaksi penjualan yang tercatat."
                  />
                  <Gloss
                    k="COGS / HPP"
                    v="Biaya modal barang yang terjual. Dihitung dari average cost × jumlah terjual."
                  />
                  <Gloss
                    k="Gross Profit (Laba Kotor)"
                    v="Revenue dikurangi COGS. Belum termasuk biaya lain seperti sewa, gaji, listrik."
                  />
                  <Gloss
                    k="Margin"
                    v="Persentase: Gross Profit ÷ Revenue × 100%. Mengukur seberapa besar keuntungan kotor dari penjualan."
                  />
                  <Gloss
                    k="Void"
                    v="Membatalkan dokumen (penjualan/pembelian). Pada pembelian bahan baku, stok akan dikembalikan seperti sebelum pembelian."
                  />
                  <Gloss
                    k="Average Cost"
                    v="Biaya modal rata-rata per item yang bergerak berdasarkan pembelian masuk."
                  />
                  <Gloss
                    k="Detail Kemasan"
                    v="Mode stok berbasis isi (ml, l, g, kg). Misal 1 botol sirup = 1000 ml, stok isi berkurang sesuai pemakaian."
                  />
                  <Gloss
                    k="Min Stok / Min Isi"
                    v="Ambang peringatan stok menipis. Jika di bawah angka ini, produk ditandai mendekati habis."
                  />
                  <Gloss
                    k="Kas Masuk / Keluar"
                    v="Pencatatan uang tunai yang masuk/keluar di kasir."
                  />
                  <Gloss
                    k="Shift Register"
                    v="Pembukaan dan penutupan aktivitas kasir per shift, termasuk saldo awal/akhir."
                  />
                  <Gloss
                    k="QRIS / Grab / Kartu"
                    v="Metode pembayaran non-tunai yang bisa dipilih saat checkout."
                  />
                </div>
              </Section>
            </>
          )}

          {tab === "shortcuts" && (
            <>
              <Section title="Shortcut Keyboard">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between p-2 rounded bg-black/5">
                    <span className="font-medium">F2</span>
                    <span className="opacity-80">
                      Fokus ke kotak pencarian produk (Penjualan)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-black/5">
                    <span className="font-medium">Alt + K</span>
                    <span className="opacity-80">Checkout (Penjualan)</span>
                  </div>
                </div>
              </Section>
            </>
          )}

          {tab === "faq" && (
            <>
              <Section title="Pertanyaan Umum">
                <ul className="list-disc pl-5 grid gap-1">
                  <li>
                    <b>Kenapa margin saya kecil?</b> Pastikan pembelian bahan
                    baku dicatat agar COGS akurat.
                  </li>
                  <li>
                    <b>Apakah kasir bisa ubah harga?</b> Tidak, kecuali
                    diizinkan admin.
                  </li>
                  <li>
                    <b>Struk tidak rapi?</b> Gunakan menu Cetak Struk dari
                    riwayat penjualan; pilih printer thermal dan ukuran kertas
                    yang sesuai.
                  </li>
                  <li>
                    <b>Data hilang saat logout?</b> Tidak. Semua transaksi
                    tersimpan di Firestore organisasi Anda.
                  </li>
                </ul>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
