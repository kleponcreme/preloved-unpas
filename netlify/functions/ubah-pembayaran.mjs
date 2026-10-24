// Pembayaran QRIS ke admin.
//   kirim_bukti (pembeli)  menunggu_bayar/ditolak → menunggu_verifikasi
//   batal       (pembeli)  sebelum diverifikasi → batal, stok kembali
//   terima      (admin)    menunggu_verifikasi → lunas, pesanan jadi dana_ditahan
//   tolak       (admin)    menunggu_verifikasi → ditolak (pembeli bisa unggah ulang)
//   batalkan    (admin)    menunggu_verifikasi/ditolak → batal, stok kembali
import { db, json, pengguna, FieldValue, batalkanPembayaran, bacaUntukBatal } from './_firebase.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const token = await pengguna(req);
    const { paymentId, aksi, catatan = '' } = await req.json();
    const admin = token.admin === true;
    const payRef = db.doc(`payments/${paymentId}`);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(payRef);
      const pay = snap.data();
      if (!pay) throw new Error('Pembayaran tidak ditemukan.');
      const pemilik = pay.pembeliId === token.uid;

      if (aksi === 'kirim_bukti') {
        if (!pemilik || !['menunggu_bayar', 'ditolak'].includes(pay.status)) throw new Error('Bukti tidak bisa dikirim untuk pembayaran ini.');
        if (pay.status === 'menunggu_bayar' && Date.now() > pay.batasBayar) throw new Error('Waktu bayar sudah habis.');
        tx.update(payRef, { status: 'menunggu_verifikasi', buktiPath: `bukti/${token.uid}/${paymentId}.jpg`, dikirim: FieldValue.serverTimestamp() });
      } else if (aksi === 'batal') {
        if (!pemilik || !['menunggu_bayar', 'ditolak'].includes(pay.status)) throw new Error('Pembayaran ini sudah tidak bisa dibatalkan.');
        const { orders, products } = await bacaUntukBatal(tx, pay);
        batalkanPembayaran(tx, payRef, pay, orders, products, 'batal');
      } else if (aksi === 'terima') {
        if (!admin || pay.status !== 'menunggu_verifikasi') throw new Error('Tidak bisa diverifikasi.');
        tx.update(payRef, { status: 'lunas', diverifikasi: FieldValue.serverTimestamp() });
        pay.orderIds.forEach((id) => tx.update(db.doc(`orders/${id}`), { status: 'dana_ditahan' }));
      } else if (aksi === 'tolak') {
        if (!admin || pay.status !== 'menunggu_verifikasi') throw new Error('Tidak bisa ditolak.');
        tx.update(payRef, { status: 'ditolak', catatanAdmin: String(catatan).slice(0, 200) || 'Bukti tidak sesuai.' });
      } else if (aksi === 'batalkan') {
        if (!admin || !['menunggu_verifikasi', 'ditolak', 'menunggu_bayar'].includes(pay.status)) throw new Error('Tidak bisa dibatalkan.');
        const { orders, products } = await bacaUntukBatal(tx, pay);
        batalkanPembayaran(tx, payRef, pay, orders, products, 'batal');
      } else {
        throw new Error('Aksi tidak dikenal.');
      }
    });
    return json({ ok: true });
  } catch (err) {
    return json({ error: err.message }, 400);
  }
};
