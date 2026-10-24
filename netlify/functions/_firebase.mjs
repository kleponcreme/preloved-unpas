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
  biayaLayanan: 1000,
  ongkirAntar: 5000,
  promoPembeliPertama: 5000,
  komisi: 0.05,
  batasBayarMenit: 15,
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

export async function bacaUntukBatal(tx, pay) {
  const orders = await Promise.all(pay.orderIds.map((id) => tx.get(db.doc(`orders/${id}`))));
  const productIds = orders.flatMap((o) => (o.exists ? o.data().items.map((i) => i.productId) : []));
  const products = await Promise.all(productIds.map((id) => tx.get(db.doc(`products/${id}`))));
  return { orders: orders.filter((o) => o.exists), products };
}
