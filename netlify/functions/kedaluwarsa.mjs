// Berjalan otomatis tiap 5 menit (Netlify Scheduled Function).
// Membatalkan pembayaran yang lewat batas waktu dan belum mengirim bukti.
import { db, batalkanPembayaran, bacaUntukBatal, evaluasiTangguh } from './_firebase.mjs';

export default async () => {
  const q = await db.collection('payments').where('status', '==', 'menunggu_bayar').get();
  const lewat = q.docs.filter((d) => d.data().batasBayar < Date.now());
  for (const d of lewat) {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(d.ref);
      const pay = snap.data();
      if (!pay || pay.status !== 'menunggu_bayar') return;
      const { orders, products } = await bacaUntukBatal(tx, pay);
      batalkanPembayaran(tx, d.ref, pay, orders, products, 'kedaluwarsa');
    });
  }
  // Periksa penjual yang punya utang komisi COD (batas nominal dan 7 hari)
  const utang = await db.collection('orders').where('metodeBayar', '==', 'cod').where('status', '==', 'selesai').where('komisiLunas', '==', false).get();
  const penjual = new Set(utang.docs.map((d) => d.data().penjualId));
  const ditangguhkan = await db.collection('users').where('ditangguhkan', '==', true).get();
  ditangguhkan.docs.forEach((d) => penjual.add(d.id));
  for (const id of penjual) await evaluasiTangguh(id);
  return new Response(`Dibatalkan: ${lewat.length}, penjual dicek: ${penjual.size}`);
};

export const config = { schedule: '*/5 * * * *' };
