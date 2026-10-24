// Berjalan otomatis tiap 5 menit (Netlify Scheduled Function).
// Membatalkan pembayaran yang lewat batas waktu dan belum mengirim bukti.
import { db, batalkanPembayaran, bacaUntukBatal } from './_firebase.mjs';

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
  return new Response(`Dibatalkan: ${lewat.length}`);
};

export const config = { schedule: '*/5 * * * *' };
