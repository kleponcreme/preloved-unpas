// Checkout: menghitung harga (termasuk nego yang disetujui), mengurangi stok,
// membuat satu pesanan per penjual, dan (untuk QRIS) satu pembayaran ke admin.
// Metode: 'qris' (bayar ke QRIS admin, dana ditahan) atau 'cod' (bayar tunai ke penjual saat bertemu).
import { db, json, pengguna, FieldValue, ATURAN } from './_firebase.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const { uid } = await pengguna(req);
    const { productIds, caraTerima, jadwal, catatan = '', metodeBayar = 'qris' } = await req.json();
    if (!['qris', 'cod'].includes(metodeBayar)) return json({ error: 'Metode bayar tidak valid.' }, 400);
    const cod = metodeBayar === 'cod';
    if (!Array.isArray(productIds) || productIds.length === 0 || productIds.length > 20) return json({ error: 'Pilih minimal satu barang.' }, 400);
    if (!['cod', 'antar'].includes(caraTerima)) return json({ error: 'Cara terima tidak valid.' }, 400);

    const hasil = await db.runTransaction(async (tx) => {
      // 1. Pembacaan
      const userRef = db.doc(`users/${uid}`);
      const user = (await tx.get(userRef)).data();
      if (user?.statusVerifikasi !== 'terverifikasi') throw new Error('Akun belum terverifikasi.');
      const items = [];
      for (const id of [...new Set(productIds)]) {
        const p = (await tx.get(db.doc(`products/${id}`))).data();
        if (!p || p.status !== 'tayang' || p.stok < 1) throw new Error(`“${p?.judul ?? 'Barang'}” sudah tidak tersedia.`);
        if (p.penjualId === uid) throw new Error('Kamu tidak bisa membeli barangmu sendiri.');
        const nego = await tx.get(db.collection('offers').where('productId', '==', id).where('pembeliId', '==', uid).where('status', '==', 'diterima').limit(1));
        const o = nego.docs[0]?.data();
        items.push({ id, p, harga: o ? o.hargaBalik ?? o.hargaTawar : p.harga, nego: Boolean(o) });
      }

      // 2. Hitung
      const perPenjual = {};
      for (const it of items) (perPenjual[it.p.penjualId] ||= []).push(it);
      const payRef = db.collection('payments').doc();
      const now = Date.now();
      const kode = `PU-${new Date(now).toISOString().slice(8, 10)}${new Date(now).toISOString().slice(5, 7)}-${payRef.id.slice(0, 4).toUpperCase()}`;
      const orderDocs = Object.entries(perPenjual).map(([penjualId, list]) => {
        const subtotal = list.reduce((t, i) => t + i.harga, 0);
        const ongkir = caraTerima === 'antar' ? ATURAN.ongkirAntar : 0;
        return {
          ref: db.collection('orders').doc(),
          data: {
            paymentId: cod ? null : payRef.id, metodeBayar, kode, pembeliId: uid, pembeliNama: user.nama, penjualId, penjualNama: list[0].p.penjualNama ?? '',
            items: list.map((i) => ({ productId: i.id, judul: i.p.judul, harga: i.harga, foto: i.p.foto?.[0] ?? null, nego: i.nego })),
            subtotal, ongkir, caraTerima, catatan: String(catatan).slice(0, 300),
            jadwal: { hari: String(jadwal?.hari ?? ''), tanggal: String(jadwal?.tanggal ?? ''), jam: String(jadwal?.jam ?? '') },
            status: cod ? 'cod' : 'menunggu_bayar', jadwalDikonfirmasi: false, komisi: 0, komisiLunas: false, pencairan: 'belum', rating: null,
            dibuat: FieldValue.serverTimestamp(),
          },
        };
      });
      const barang = orderDocs.reduce((t, o) => t + o.data.subtotal + o.data.ongkir, 0);
      const promo = cod || user.promoDipakai ? 0 : Math.min(ATURAN.promoPembeliPertama, barang);
      const kodeUnik = 100 + Math.floor(Math.random() * 400); // membedakan pembayaran ke QRIS statis admin
      const total = barang + ATURAN.biayaLayanan - promo + kodeUnik;

      // 3. Penulisan
      for (const it of items) {
        const sisa = it.p.stok - 1;
        tx.update(db.doc(`products/${it.id}`), sisa <= 0 ? { stok: 0, status: 'terjual' } : { stok: sisa });
        tx.delete(db.doc(`carts/${uid}/items/${it.id}`));
      }
      orderDocs.forEach((o) => tx.set(o.ref, o.data));
      if (cod) return { orderIds: orderDocs.map((o) => o.ref.id) };
      if (promo > 0) tx.update(userRef, { promoDipakai: true });
      tx.set(payRef, {
        kode, pembeliId: uid, pembeliNama: user.nama, orderIds: orderDocs.map((o) => o.ref.id),
        barang, biayaLayanan: ATURAN.biayaLayanan, promo, kodeUnik, total,
        status: 'menunggu_bayar', buktiPath: null, catatanAdmin: null,
        batasBayar: now + ATURAN.batasBayarMenit * 60000, dibuat: FieldValue.serverTimestamp(),
      });
      return { paymentId: payRef.id };
    });

    return json(hasil);
  } catch (err) {
    return json({ error: err.message }, 400);
  }
};
