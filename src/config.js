// Pengaturan utama aplikasi. Ubah di sini, bukan di tiap halaman.
export const APP = {
  nama: 'RE:LOOP',
  cakupan: 'FISIP Kampus Lengkong',
  titikTemu: 'Titik Temu FISIP Lengkong',
  lokasiTitikTemu: '[lokasi pasti di area FISIP]',
  // QRIS statis milik admin. Ganti file public/qris-admin.png dengan QRIS asli.
  qrisGambar: '/qris-admin.png',
  qrisPenerima: 'RE:LOOP (Rekber)',
  kategori: ['Pakaian', 'Barang Kos', 'Elektronik', 'Buku', 'Lainnya'],
  kondisi: ['Seperti baru', 'Baik', 'Ada minus'],
  prodi: [
    'Administrasi Publik',
    'Administrasi Bisnis',
    'Ilmu Kesejahteraan Sosial',
    'Hubungan Internasional',
    'Ilmu Komunikasi',
  ],
  jamTemu: ['10.00', '12.00', '15.00'],
  // Samakan dengan ATURAN di netlify/functions/_firebase.mjs
  biayaLayanan: 0, // QRIS memakai kode unik 3 digit, tanpa biaya layanan
  ongkirAntar: 5000,
  promoPembeliPertama: 1000,
  komisi: 0.05,
  batasBayarMenit: 15,
  maksFoto: 4,
  batasUtangKomisi: 15000,
  batasHariUtang: 7,
};

// Tiga hari ke depan untuk pilihan jadwal ketemu
export function pilihanHari(jumlah = 3) {
  const hasil = [];
  const d = new Date();
  for (let i = 1; i <= jumlah; i++) {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    hasil.push({
      hari: t.toLocaleDateString('id-ID', { weekday: 'long' }),
      tanggal: t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    });
  }
  return hasil;
}
