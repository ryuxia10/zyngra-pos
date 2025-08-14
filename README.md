
# Zyngra POS

POS web app minimalis, cepat, dan kaya fitur. Dibuat dengan **React + Vite + TypeScript** dan **Firebase** (Auth + Firestore + Storage).

## Fitur Utama
- Login/Signup (Firebase Auth) + pemilihan peran **Admin** atau **Kasir**.
- **PIN Admin**: ditentukan sekali saat pertama kali memilih Admin, disimpan hash. Tidak ada menu ganti.
- **Trial 3 hari** per organisasi (org). Jika lewat, aplikasi terkunci dan menampilkan tombol WhatsApp ke admin.
- **Penjualan**: keranjang, metode pembayaran (QRIS, Tunai, Kartu, Grab), riwayat, cetak struk (80mm).
- **Pembelian**: input item, total, riwayat.
- **Dashboard**: grafik tren 30 hari & top 5 barang.
- **Laporan Harian (PDF)** via jsPDF + autoTable, lengkap ringkasan.
- **Setting (Admin)**: atur hak kasir. (Tema gamifikasi dikunci; akan terbuka via misi—to be continued)
- **Keyboard Shortcuts**: `Alt+D` Dashboard, `Alt+1` Penjualan, `Alt+2` Pembelian, `Alt+R` Laporan, `Alt+S` Setting. Di Penjualan: `F2` fokus pencarian, `Enter` tambah item, `Alt+K` checkout.
- **Dark Mode** toggle.

## Nama Produk
**Zyngra POS** — gabungan bunyi dari *Reza Dwiky Anggara* dalam format yang ringkas dan modern.

## Getting Started

1. **Unzip & Install**
   ```bash
   npm install
   npm run dev
   ```

2. **Setup Firebase**
   - Buat project di Firebase Console.
   - Aktifkan **Authentication (Email/Password)**.
   - Aktifkan **Firestore** (mode production).
   - Buat **Web App** dan salin config ke `.env` (lihat `.env.sample`).
   - (Opsional) Aktifkan **Storage** jika ingin upload gambar produk ke depannya.

   File `.env` contoh:
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_WHATSAPP_NUMBER=6281345614663
   ```

3. **Jalankan**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:5173`

4. **Login / Signup**
   - Saat signup pertama kali, org tertaut otomatis dengan trial 3 hari.
   - Setelah login, Anda akan diminta **memilih peran** (Admin / Kasir).
   - Jika memilih Admin dan **PIN belum ada**, buat PIN (sekali saja).

## Struktur Koleksi (Firestore)
- `orgs/{orgId}`: `name`, `ownerUid`, `trialExpiresAt (Timestamp)`, `adminPinHash`, `settings.permissions`, `themeUnlocks`, `missions`
- `users/{uid}`: `uid`, `email`, `orgId`, `role`, `createdAt`
- `sales/{saleId}`: `orgId`, `date (Timestamp)`, `items[] (name,qty,price)`, `paymentMethod`, `total`, `createdAt`
- `purchases/{purchaseId}`: `orgId`, `date`, `items[] (name,qty,cost)`, `total`, `createdAt`
- (ke depan) `products`, `themes`, dll.

## Saran Security Rules (awal minimal)
> Perketat sesuai kebutuhan produksi.
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orgs/{orgId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && resource.data.ownerUid == request.auth.uid;
    }
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /sales/{id} {
      allow read, create: if request.auth != null;
      allow update, delete: if request.auth != null; // batasi dengan claim/role via Cloud Functions jika perlu
    }
    match /purchases/{id} {
      allow read, create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
  }
}
```

## Cetak Struk (80mm)
- Komponen `src/shared/Receipt.tsx` menyiapkan tampilan siap cetak.
- CSS `@media print` sudah diatur untuk kertas 80mm.

## Lighthouse & SEO
- Aplikasi sangat ringan (Vite, Tailwind).
- Meta tag di `index.html` sudah diisi.
- Hindari gambar berat; gunakan import dinamis bila menambah halaman besar.

## Roadmap (Fitur Tambahan)
- **Misi & Gamifikasi**: update progress otomatis (penjualan 5x, Grab 5x, QRIS 5x) -> unlock tema dan fitur lanjutan.
- **Produk & Stok**: master data produk + impor CSV.
- **Role Enforcement** via Security Rules / Custom Claims.
- **Cetak Struk ke Printer Thermal** via WebUSB/WebBluetooth (opsional).
- **PWA** untuk mode offline.
- **Integrasi Pembayaran** (QRIS dinamis) — opsional.

--
Dibuat dengan ❤️ untuk Reza Dwiky Anggara.
