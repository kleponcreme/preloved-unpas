// Mengunggah foto ke Netlify Blobs (gratis, tanpa kartu kredit).
// Jenis: produk (publik), qris (publik, khusus admin), ktm dan bukti (privat).
import { getStore } from '@netlify/blobs';
import { db, json, pengguna } from './_firebase.mjs';

const MAKS = 2.5 * 1024 * 1024;
const acak = () => Math.random().toString(36).slice(2, 10);

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const token = await pengguna(req);
    const uid = token.uid;
    const { jenis, data, paymentId } = await req.json();
    const buf = Buffer.from(String(data || ''), 'base64');
    if (!buf.length || buf.length > MAKS) throw new Error('Foto harus berupa gambar di bawah 2,5 MB.');

    let key;
    if (jenis === 'produk') {
      const u = (await db.doc(`users/${uid}`).get()).data();
      if (u?.statusVerifikasi !== 'terverifikasi' && token.admin !== true) throw new Error('Akun belum terverifikasi.');
      key = `produk/${uid}/${Date.now()}-${acak()}.jpg`;
    } else if (jenis === 'ktm') {
      key = `ktm/${uid}.jpg`;
    } else if (jenis === 'bukti') {
      const p = (await db.doc(`payments/${paymentId}`).get()).data();
      if (!p || p.pembeliId !== uid) throw new Error('Pembayaran tidak ditemukan.');
      key = `bukti/${uid}/${paymentId}.jpg`;
    } else if (jenis === 'qris') {
      if (token.admin !== true) throw new Error('Khusus admin.');
      key = `qris/${Date.now()}.jpg`;
    } else {
      throw new Error('Jenis foto tidak dikenal.');
    }
    await getStore('foto').set(key, buf, { metadata: { pemilik: uid, tipe: 'image/jpeg' } });
    return json({ key });
  } catch (err) {
    return json({ error: err.message }, 400);
  }
};
