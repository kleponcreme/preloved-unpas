// Koneksi Firebase Admin SDK. Hanya dipakai di server (Netlify Functions dan skrip admin).
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

export const db = getFirestore();
export const auth = getAuth();
export { FieldValue };

// Aturan bisnis. Samakan dengan src/config.js
export const ATURAN = {
  biayaLayanan: 0, // QRIS sudah memakai kode unik 3 digit, jadi tanpa biaya layanan
  ongkirAntar: 5000,
  promoPembeliPertama: 1000,
  komisi: 0.05,
  batasBayarMenit: 15,
  batasUtangKomisi: 15000, // utang komisi COD maksimal sebelum penjual ditangguhkan
  batasHariUtang: 7, // komisi COD harus disetor paling lambat 7 hari
  tandaBatalCod: 3, // penjual ditandai kalau membatalkan pesanan COD sebanyak ini
  tandaHapusDiminati: 2, // atau menghapus barang yang sedang diminati sebanyak ini
  jamMinat: 72, // barang dianggap sedang diminati kalau masuk keranjang dalam 72 jam terakhir
};

export const json = (data, status = 200) => Response.json(data, { status });

// Membaca token login dari header Authorization: Bearer <token>
export async function pengguna(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) throw new Error('Kamu perlu masuk dulu.');
  try {
    return await auth.verifyIdToken(token);
  } catch {
    throw new Error('Sesi login habis. Silakan masuk lagi.');
  }
}

// Membatalkan pembayaran beserta pesanannya: stok dan promo dikembalikan.
// Dipakai di dalam transaksi. Semua pembacaan harus sudah dilakukan oleh pemanggil.
export function batalkanPembayaran(tx, payRef, pay, orders, products, status) {
  tx.update(payRef, { status, diubah: FieldValue.serverTimestamp() });
  orders.forEach((o) => tx.update(o.ref, { status: 'batal' }));
  products.forEach((p) => {
    if (p.exists) tx.update(p.ref, { stok: FieldValue.increment(1), status: 'tayang' });
  });
  if (pay.promo > 0) tx.update(db.doc(`users/${pay.pembeliId}`), { promoDipakai: false });
}

// Menghitung utang komisi COD seorang penjual. Kalau melewati batas (nominal atau hari),
// penjual ditangguhkan: barangnya disembunyikan dari katalog dan tidak bisa memasang barang baru.
// Kalau utangnya sudah di bawah batas, semuanya dipulihkan otomatis.
export async function evaluasiTangguh(penjualId) {
  const q = await db.collection('orders').where('penjualId', '==', penjualId).where('metodeBayar', '==', 'cod')
    .where('status', '==', 'selesai').where('komisiLunas', '==', false).get();
  let total = 0;
  let tertua = null;
  q.docs.forEach((d) => {
    const o = d.data();
    total += o.komisi || 0;
    const t = o.selesai?.toMillis ? o.selesai.toMillis() : Date.now();
    if (tertua === null || t < tertua) tertua = t;
  });
  const lewatHari = tertua !== null && Date.now() - tertua > ATURAN.batasHariUtang * 86400000;
  const tangguh = total >= ATURAN.batasUtangKomisi || lewatHari;
  const userRef = db.doc(`users/${penjualId}`);
  const u = (await userRef.get()).data() || {};
  await userRef.set({ utangKomisi: total, utangSejak: tertua }, { merge: true });
  if (Boolean(u.ditangguhkan) === tangguh) return tangguh;
  await userRef.set({ ditangguhkan: tangguh }, { merge: true });
  const dari = tangguh ? 'tayang' : 'disembunyikan';
  const ke = tangguh ? 'disembunyikan' : 'tayang';
  const produk = await db.collection('products').where('penjualId', '==', penjualId).where('status', '==', dari).get();
  const batch = db.batch();
  produk.docs.forEach((d) => batch.update(d.ref, { status: ke }));
  await batch.commit();
  return tangguh;
}

export async function bacaUntukBatal(tx, pay) {
  const orders = await Promise.all(pay.orderIds.map((id) => tx.get(db.doc(`orders/${id}`))));
  const productIds = orders.flatMap((o) => (o.exists ? o.data().items.map((i) => i.productId) : []));
  const products = await Promise.all(productIds.map((id) => tx.get(db.doc(`products/${id}`))));
  return { orders: orders.filter((o) => o.exists), products };
}
