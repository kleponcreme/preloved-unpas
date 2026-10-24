# Preloved Unpas · FISIP Lengkong

Marketplace barang bekas open source khusus mahasiswa FISIP Universitas Pasundan, Kampus Lengkong. Mahasiswa bisa menjadi pembeli sekaligus penjual: katalog, nego harga, chat WhatsApp, keranjang, checkout dengan **QRIS ke admin (rekber)** atau **COD tunai**, status pesanan, ulasan, Lapak penjual, dan halaman admin.

**Panduan lengkap menayangkan dan memakai website ada di dokumen "Panduan Preloved Unpas".** Ringkasannya di bawah.

## Yang dibutuhkan

- Akun Google (untuk Firebase), GitHub, dan Netlify. Semuanya gratis, **tanpa kartu kredit**.
- Tidak perlu terminal atau coding. Semua dilakukan lewat browser.

## Menayangkan (ringkas)

1. Unggah isi folder ini ke repository GitHub baru.
2. Buat proyek Firebase, aktifkan **Authentication → Email/Password** dan **Firestore Database**.
3. Di Firestore → **Rules**, tempel isi file `firestore.rules`, lalu **Publish**.
4. Ambil 4 nilai konfigurasi web app dan 3 nilai dari **Service accounts → Generate new private key**.
5. Di Netlify, impor repository GitHub dan isi 8 environment variables (daftarnya di `.env.example`), termasuk `ADMIN_EMAIL`.
6. Tambahkan domain Netlify di Firebase → Authentication → Settings → **Authorized domains**.
7. Daftar di website memakai email `ADMIN_EMAIL`: akun otomatis menjadi admin.
8. Halaman admin → **Pengaturan**: unggah gambar QRIS admin dan isi lokasi Titik Temu.

## Alur pembayaran

| | QRIS ke admin (rekber) | COD tunai |
| --- | --- | --- |
| Bayar | Scan QRIS admin, nominal dengan kode unik, unggah bukti | Tunai ke penjual saat bertemu |
| Dicek | Admin menerima atau menolak bukti | Tidak ada |
| Dana | Ditahan admin, dicairkan ke penjual setelah barang diterima | Langsung ke penjual |
| Biaya | Layanan Rp1.000, promo pembeli pertama Rp5.000 | Tanpa biaya layanan dan promo |
| Komisi 5% | Dipotong saat pencairan | Disetor penjual ke QRIS admin |

Pembayaran QRIS yang tidak dibayar dalam 15 menit dibatalkan otomatis (fungsi terjadwal `kedaluwarsa`), dan stok dikembalikan.

## Teknologi

- **React + Vite** untuk tampilan (gaya sama dengan prototipe)
- **Firebase Authentication + Firestore** (paket gratis Spark) untuk akun dan data
- **Netlify Functions** untuk checkout, pembayaran, pesanan, dan admin
- **Netlify Blobs** untuk foto barang, KTM, bukti bayar, dan QRIS

```text
netlify/functions/
├─ buat-pesanan.mjs     # Checkout QRIS/COD: harga nego, stok, pesanan per penjual
├─ ubah-pembayaran.mjs  # Kirim bukti, batal, terima/tolak oleh admin
├─ ubah-pesanan.mjs     # Konfirmasi jadwal, terima, ulasan, batal COD, pencairan, komisi COD
├─ kedaluwarsa.mjs      # Terjadwal tiap 5 menit
├─ unggah.mjs, foto.mjs # Simpan dan tampilkan foto (Netlify Blobs)
└─ cek-admin.mjs        # Admin otomatis dari ADMIN_EMAIL
src/                    # Halaman, komponen, gaya
firestore.rules         # Aturan keamanan, tempel di Firebase Console
```

## Mengembangkan di laptop (opsional, untuk programmer)

```bash
npm install
npm install -g netlify-cli
netlify link      # sambungkan ke situs Netlify yang sudah dibuat
netlify dev       # http://localhost:8888, memakai environment variables dari Netlify
```

## Batasan

- Fitur "Sundul" belum ada.
- Uang QRIS masuk ke rekening admin dan dicairkan manual. Untuk skala besar, pertimbangkan payment gateway resmi dan konsultasikan aturan sistem pembayaran.
- Komisi COD bergantung pada kejujuran penjual menyetor; admin mencatatnya di tab Komisi COD.

## Lisensi

MIT. Lihat file `LICENSE`.
