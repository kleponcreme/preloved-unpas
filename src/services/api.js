// Aksi yang mengubah data. Halaman memanggil fungsi di sini, bukan Firebase langsung.
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { fotoUrl, fotoPrivat, hapusFoto, keBase64 } from '../lib/foto';
import { kecilkanFoto } from '../lib/image';
import { rp } from '../lib/format';

const uid = () => {
  if (!auth.currentUser) throw new Error('Kamu perlu masuk dulu.');
  return auth.currentUser.uid;
};

/* ---------- Akun ---------- */

export async function daftar({ email, password, nama, npm, prodi, angkatan, whatsapp }, fotoKtm) {
  if (!fotoKtm) throw new Error('Unggah foto KTM untuk verifikasi.');
  const ktm = await kecilkanFoto(fotoKtm);
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const data = { nama: nama.trim(), prodi, angkatan: Number(angkatan) };
  // Nomor WhatsApp disimpan di data privat; baru dibagikan ke lawan transaksi lewat pesanan
  await setDoc(doc(db, 'users', user.uid), { ...data, npm: npm.trim(), whatsapp: whatsapp.trim(), statusVerifikasi: 'menunggu', dibuat: serverTimestamp() });
  await setDoc(doc(db, 'profiles', user.uid), data);
  const { key } = await unggahFoto('ktm', ktm);
  await setDoc(doc(db, 'verifications', user.uid), { path: key, status: 'menunggu', dibuat: serverTimestamp() });
  await cekAdmin();
}

// Mengunggah foto (Blob JPEG) ke server, hasilnya kunci penyimpanan
export async function unggahFoto(jenis, blob, extra = {}) {
  return panggilFungsi('unggah', { jenis, data: await keBase64(blob), ...extra });
}

// Menjadikan akun admin jika emailnya terdaftar di ADMIN_EMAIL. Token disegarkan supaya status admin langsung aktif.
export async function cekAdmin() {
  try {
    const r = await panggilFungsi('cek-admin', {});
    if (r.baru) await auth.currentUser.getIdToken(true);
    return Boolean(r.admin);
  } catch {
    return false;
  }
}

export const masuk = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password);
export const keluar = () => signOut(auth);
export const lupaPassword = (email) => sendPasswordResetEmail(auth, email.trim());

/* ---------- Keranjang ---------- */

export async function tambahKeKeranjang(productId) {
  await setDoc(doc(db, 'carts', uid(), 'items', productId), { productId, dipilih: true, ditambahkan: serverTimestamp() });
  // Tandai barang sedang diminati (dipakai untuk mencatat penjual yang menghapus barang yang sedang diminati)
  await updateDoc(doc(db, 'products', productId), { terakhirDiminati: serverTimestamp() }).catch(() => {});
}

// Akun lama menyimpan WhatsApp di profil publik; pindahkan ke data privat
export async function pindahkanWhatsapp(u) {
  const p = await getDoc(doc(db, 'profiles', u));
  const wa = p.exists() ? p.data().whatsapp : undefined;
  if (!wa) return;
  await updateDoc(doc(db, 'users', u), { whatsapp: wa });
  await updateDoc(doc(db, 'profiles', u), { whatsapp: deleteField() });
}

export const hapusDariKeranjang = (productId) => deleteDoc(doc(db, 'carts', uid(), 'items', productId));

export const pilihItem = (productId, dipilih) => updateDoc(doc(db, 'carts', uid(), 'items', productId), { dipilih });

/* ---------- Nego ---------- */

export async function kirimTawaran(produk, hargaTawar, pesan, namaPembeli) {
  if (!hargaTawar) throw new Error('Isi nominal tawaran dulu.');
  if (hargaTawar >= produk.harga) throw new Error(`Tawaran harus di bawah harga penjual (${rp(produk.harga)}).`);
  await addDoc(collection(db, 'offers'), {
    productId: produk.id,
    judul: produk.judul,
    hargaAwal: produk.harga,
    foto: produk.foto?.[0] ?? null,
    penjualId: produk.penjualId,
    pembeliId: uid(),
    pembeliNama: namaPembeli,
    hargaTawar,
    hargaBalik: null,
    pesan: pesan.trim(),
    status: 'menunggu',
    dibuat: serverTimestamp(),
  });
}

export const jawabHargaBalik = (offerId, terima) => updateDoc(doc(db, 'offers', offerId), { status: terima ? 'diterima' : 'ditolak' });
export const jawabTawaran = (offerId, status) => updateDoc(doc(db, 'offers', offerId), { status });

export async function beriHargaBalik(tawaran, harga) {
  if (!harga || harga <= tawaran.hargaTawar || harga >= tawaran.hargaAwal) {
    throw new Error(`Harga balik harus di antara ${rp(tawaran.hargaTawar)} dan ${rp(tawaran.hargaAwal)}.`);
  }
  await updateDoc(doc(db, 'offers', tawaran.id), { status: 'harga_balik', hargaBalik: harga });
}

/* ---------- Pesanan (lewat Netlify Functions) ---------- */

export async function panggilFungsi(nama, body) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`/.netlify/functions/${nama}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Server tidak merespons. Coba lagi.');
  return data;
}

export const buatPesanan = (opsi) => panggilFungsi('buat-pesanan', opsi);
export const ubahPesanan = (orderId, aksi, extra = {}) => panggilFungsi('ubah-pesanan', { orderId, aksi, ...extra });
export const ubahPembayaran = (paymentId, aksi, extra = {}) => panggilFungsi('ubah-pembayaran', { paymentId, aksi, ...extra });
export const mintaPencairan = () => panggilFungsi('ubah-pesanan', { aksi: 'cairkan' });

// Pembeli mengunggah bukti bayar QRIS, lalu admin memeriksanya
export async function kirimBuktiBayar(paymentId, file) {
  const foto = await kecilkanFoto(file, 1400, 0.85);
  await unggahFoto('bukti', foto, { paymentId });
  await ubahPembayaran(paymentId, 'kirim_bukti');
}

export const ambilBuktiBayar = (path) => fotoPrivat(path);

// Rekening atau e-wallet untuk pencairan dana penjual (disimpan di data privat akun)
export const simpanRekening = (rekening) => updateDoc(doc(db, 'users', uid()), { rekening });

/* ---------- Lapak ---------- */

export async function pasangBarang(data, files, akun) {
  if (!files.length) throw new Error('Tambahkan minimal 1 foto barang.');
  if (!data.judul.trim()) throw new Error('Isi nama barang.');
  if (!data.harga) throw new Error('Isi harga barang.');
  const id = doc(collection(db, 'products')).id;
  const foto = [];
  const fotoPath = [];
  for (const file of files) {
    const { key } = await unggahFoto('produk', file);
    foto.push(fotoUrl(key));
    fotoPath.push(key);
  }
  await setDoc(doc(db, 'products', id), {
    judul: data.judul.trim(),
    kategori: data.kategori,
    kondisi: data.kondisi,
    harga: data.harga,
    bisaNego: data.bisaNego,
    bolehCod: data.bolehCod !== false,
    ajukanPaket: Boolean(data.ajukanPaket),
    stok: Math.max(1, Math.floor(Number(data.stok) || 1)),
    usiaPakai: data.usiaPakai.trim(),
    deskripsi: data.deskripsi.trim(),
    foto,
    fotoPath,
    penjualId: uid(),
    penjualNama: akun.nama,
    penjualProdi: akun.prodi,
    status: 'moderasi',
    dibuat: serverTimestamp(),
  });
  return id;
}

// Penjual mengedit barangnya. Kalau yang berubah hanya harga atau opsi nego, barang tetap tayang.
// Kalau foto, nama, deskripsi, kategori, kondisi, atau usia pakai berubah, barang dicek ulang admin.
export async function ubahBarang(produk, data, foto) {
  if (!foto.length) throw new Error('Sisakan minimal 1 foto barang.');
  if (!data.judul.trim()) throw new Error('Isi nama barang.');
  if (!data.harga) throw new Error('Isi harga barang.');
  if (produk.status === 'terjual') throw new Error('Barang yang sudah terjual tidak bisa diedit.');
  const urls = [];
  const keys = [];
  for (const f of foto) {
    if (f.jenis === 'lama') {
      urls.push(f.url);
      keys.push(f.key);
    } else {
      const { key } = await unggahFoto('produk', f.blob);
      urls.push(fotoUrl(key));
      keys.push(key);
    }
  }
  const isi = {
    judul: data.judul.trim(),
    kategori: data.kategori,
    kondisi: data.kondisi,
    harga: data.harga,
    bisaNego: data.bisaNego,
    bolehCod: data.bolehCod !== false,
    ajukanPaket: Boolean(data.ajukanPaket),
    usiaPakai: data.usiaPakai.trim(),
    deskripsi: data.deskripsi.trim(),
    foto: urls,
    fotoPath: keys,
  };
  const sama = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');
  const isiBerubah = ['judul', 'kategori', 'kondisi', 'usiaPakai', 'deskripsi', 'fotoPath', 'bolehCod', 'ajukanPaket'].some((k) => !sama(isi[k], produk[k]));
  const patch = { ...isi, diubah: serverTimestamp() };
  if (isiBerubah && produk.status !== 'moderasi') patch.status = 'moderasi';
  await updateDoc(doc(db, 'products', produk.id), patch);
  const dibuang = (produk.fotoPath ?? []).filter((k) => !keys.includes(k));
  await Promise.all(dibuang.map((k) => hapusFoto(k)));
  return { perluModerasi: patch.status === 'moderasi' };
}

// Lewat server supaya penghapusan barang yang sedang diminati bisa dicatat
export const hapusIklan = (produk) => panggilFungsi('hapus-barang', { productId: produk.id });

/* ---------- Admin ---------- */

export async function ambilFotoKtm(userId) {
  const v = await getDoc(doc(db, 'verifications', userId));
  return fotoPrivat(v.exists() ? v.data().path : null);
}

export async function verifikasiAkun(userId, setuju) {
  await updateDoc(doc(db, 'users', userId), { statusVerifikasi: setuju ? 'terverifikasi' : 'ditolak' });
  const v = await getDoc(doc(db, 'verifications', userId));
  if (v.exists() && v.data().path) {
    await hapusFoto(v.data().path);
    await updateDoc(doc(db, 'verifications', userId), { status: setuju ? 'disetujui' : 'ditolak', path: null });
  }
}

// Admin menayangkan/menolak iklan sekaligus menyetujui metode bayar (COD) dan Paket Maba
export const moderasiIklan = (productId, setuju, opsi = {}) =>
  updateDoc(doc(db, 'products', productId), { status: setuju ? 'tayang' : 'ditolak', ...(setuju ? opsi : {}) });
export const aturPaket = (productId, paket) => updateDoc(doc(db, 'products', productId), { paket });
export const hapusTanda = (userId) => updateDoc(doc(db, 'users', userId), { ditandai: false, risiko: { batalCod: 0, hapusSetelahMinat: 0 } });

/* ---------- Pengaturan (admin) ---------- */

export async function simpanPengaturan(data) {
  await setDoc(doc(db, 'settings', 'app'), data, { merge: true });
}

export async function unggahQris(file) {
  const foto = await kecilkanFoto(file, 1000, 0.92);
  const { key } = await unggahFoto('qris', foto);
  await simpanPengaturan({ qrisUrl: fotoUrl(key) });
}

export const tandaiKomisiLunas = (orderId) => ubahPesanan(orderId, 'komisi_lunas');
