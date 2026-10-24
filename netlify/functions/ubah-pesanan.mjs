// Pesanan setelah dibayar:
//   konfirmasi (penjual)  dana_ditahan → jadwal dikonfirmasi
//   terima     (pembeli)  dana_ditahan → selesai, komisi dicatat
//   ulas       (pembeli)  rating 1–5 setelah selesai
//   cairkan    (penjual)  semua pesanan selesai → pencairan diminta (orderId tidak perlu)
//   dibayar    (admin)    pencairan diminta → dibayar
//   batal      (keduanya) pesanan COD sebelum selesai → batal, stok kembali
//   komisi_lunas (admin)  komisi pesanan COD sudah disetor penjual
import { db, json, pengguna, FieldValue, ATURAN } from './_firebase.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const token = await pengguna(req);
    const uid = token.uid;
    const { orderId, aksi, rating } = await req.json();

    if (aksi === 'cairkan') {
      const rek = (await db.doc(`users/${uid}`).get()).data()?.rekening;
      if (!rek?.nomor) throw new Error('Isi rekening atau e-wallet pencairan dulu.');
      const q = await db.collection('orders').where('penjualId', '==', uid).where('status', '==', 'selesai').where('pencairan', '==', 'belum').where('metodeBayar', '==', 'qris').get();
      if (q.empty) throw new Error('Belum ada dana yang siap dicairkan.');
      const batch = db.batch();
      q.docs.forEach((d) => batch.update(d.ref, { pencairan: 'diminta', dimintaPada: FieldValue.serverTimestamp(), rekening: rek }));
      await batch.commit();
      return json({ ok: true, jumlah: q.size });
    }

    const ref = db.doc(`orders/${orderId}`);
    await db.runTransaction(async (tx) => {
      const o = (await tx.get(ref)).data();
      if (!o) throw new Error('Pesanan tidak ditemukan.');
      const pembeli = o.pembeliId === uid;
      const penjual = o.penjualId === uid;

      if (aksi === 'dibayar') {
        if (token.admin !== true || o.pencairan !== 'diminta') throw new Error('Tidak bisa ditandai.');
        tx.update(ref, { pencairan: 'dibayar', dibayarPada: FieldValue.serverTimestamp() });
        return;
      }
      if (aksi === 'komisi_lunas') {
        if (token.admin !== true || o.metodeBayar !== 'cod' || o.status !== 'selesai') throw new Error('Tidak bisa ditandai.');
        tx.update(ref, { komisiLunas: true });
        return;
      }
      if (!pembeli && !penjual) throw new Error('Kamu tidak punya akses ke pesanan ini.');

      if (aksi === 'konfirmasi') {
        if (!penjual || !['dana_ditahan', 'cod'].includes(o.status) || o.jadwalDikonfirmasi) throw new Error('Pesanan ini tidak bisa dikonfirmasi.');
        tx.update(ref, { jadwalDikonfirmasi: true });
      } else if (aksi === 'terima') {
        if (!pembeli || !['dana_ditahan', 'cod'].includes(o.status)) throw new Error('Pesanan ini belum bisa diselesaikan.');
        const profilRef = db.doc(`profiles/${o.penjualId}`);
        tx.update(ref, { status: 'selesai', komisi: Math.round(o.subtotal * ATURAN.komisi), selesai: FieldValue.serverTimestamp() });
        tx.set(profilRef, { terjual: FieldValue.increment(o.items.length) }, { merge: true });
      } else if (aksi === 'ulas') {
        const r = Number(rating);
        if (!pembeli || o.status !== 'selesai' || o.rating || !(r >= 1 && r <= 5)) throw new Error('Ulasan tidak valid.');
        tx.update(ref, { rating: r });
        tx.set(db.doc(`profiles/${o.penjualId}`), { ratingTotal: FieldValue.increment(r), ratingJumlah: FieldValue.increment(1) }, { merge: true });
      } else if (aksi === 'batal') {
        if (o.metodeBayar !== 'cod' || o.status !== 'cod') throw new Error('Pesanan ini tidak bisa dibatalkan dari sini.');
        const produk = await Promise.all(o.items.map((i) => tx.get(db.doc(`products/${i.productId}`))));
        tx.update(ref, { status: 'batal', dibatalkanOleh: pembeli ? 'pembeli' : 'penjual' });
        produk.forEach((p) => { if (p.exists) tx.update(p.ref, { stok: FieldValue.increment(1), status: 'tayang' }); });
      } else {
        throw new Error('Aksi tidak dikenal.');
      }
    });
    return json({ ok: true });
  } catch (err) {
    return json({ error: err.message }, 400);
  }
};
