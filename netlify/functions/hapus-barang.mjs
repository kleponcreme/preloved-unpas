// Menghapus iklan. Kalau barang sedang diminati (ada tawaran yang disetujui atau baru masuk
// keranjang orang dalam 72 jam), penghapusan oleh penjual dicatat dan penjual bisa ditandai.
import { getStore } from '@netlify/blobs';
import { db, json, pengguna, FieldValue, ATURAN } from './_firebase.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const token = await pengguna(req);
    const { productId } = await req.json();
    const ref = db.doc(`products/${productId}`);
    const p = (await ref.get()).data();
    if (!p) throw new Error('Barang tidak ditemukan.');
    const admin = token.admin === true;
    if (!admin && p.penjualId !== token.uid) throw new Error('Ini bukan barangmu.');
    if (p.status === 'terjual') throw new Error('Barang yang sudah terjual tidak bisa dihapus.');

    let diminati = false;
    if (!admin) {
      const tawaran = await db.collection('offers').where('productId', '==', productId).get();
      const disetujui = tawaran.docs.filter((d) => ['diterima', 'harga_balik'].includes(d.data().status));
      const t = p.terakhirDiminati?.toMillis ? p.terakhirDiminati.toMillis() : 0;
      diminati = disetujui.length > 0 || Date.now() - t < ATURAN.jamMinat * 3600000;
      const batch = db.batch();
      disetujui.forEach((d) => batch.update(d.ref, { status: 'ditolak', alasan: 'Barang dihapus penjual' }));
      if (diminati) {
        const uRef = db.doc(`users/${p.penjualId}`);
        const u = (await uRef.get()).data() || {};
        const n = (u.risiko?.hapusSetelahMinat || 0) + 1;
        batch.set(uRef, { risiko: { hapusSetelahMinat: n, terakhir: FieldValue.serverTimestamp() }, ...(n >= ATURAN.tandaHapusDiminati ? { ditandai: true } : {}) }, { merge: true });
      }
      await batch.commit();
    }

    await ref.delete();
    const store = getStore('foto');
    await Promise.all((p.fotoPath ?? []).map((k) => store.delete(k).catch(() => {})));
    return json({ ok: true, diminati });
  } catch (err) {
    return json({ error: err.message }, 400);
  }
};
