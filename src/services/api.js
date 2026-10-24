// Aksi yang mengubah data. Halaman memanggil fungsi di sini, bukan Firebase langsung.
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
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
  await setDoc(doc(db, 'users', user.uid), { ...data, npm: npm.trim(), statusVerifikasi: 'menunggu', dibuat: serverTimestamp() });
  await setDoc(doc(db, 'profiles', user.uid), { ...data, whatsapp: whatsapp.trim() });
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

export const tambahKeKeranjang = (productId) =>
  setDoc(doc(db, 'carts', uid(), 'items', productId), { productId, dipilih: true, ditambahkan: serverTimestamp() });

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

export async function hapusIklan(produk) {
  await deleteDoc(doc(db, 'products', produk.id));
  await Promise.all((produk.fotoPath ?? []).map((p) => hapusFoto(p)));
}

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

export const moderasiIklan = (productId, setuju) => updateDoc(doc(db, 'products', productId), { status: setuju ? 'tayang' : 'ditolak' });

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
