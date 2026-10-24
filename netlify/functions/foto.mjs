// Menampilkan dan menghapus foto dari Netlify Blobs.
// GET  /.netlify/functions/foto?k=<key>  → foto produk dan QRIS terbuka untuk umum,
//                                          KTM dan bukti bayar hanya untuk pemiliknya dan admin.
// DELETE ...?k=<key>                     → pemilik atau admin.
import { getStore } from '@netlify/blobs';
import { auth } from './_firebase.mjs';

const PUBLIK = ['produk/', 'qris/'];

async function siapa(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  try { return await auth.verifyIdToken(token); } catch { return null; }
}
const milik = (key, uid) => key.startsWith(`ktm/${uid}.`) || key.startsWith(`bukti/${uid}/`) || key.startsWith(`produk/${uid}/`);

export default async (req) => {
  const key = new URL(req.url).searchParams.get('k') || '';
  if (!/^(produk|qris|ktm|bukti)\/[\w\-./]+$/.test(key) || key.includes('..')) return new Response('Tidak ditemukan', { status: 404 });
  const store = getStore('foto');
  const publik = PUBLIK.some((p) => key.startsWith(p));

  if (req.method === 'DELETE') {
    const t = await siapa(req);
    if (!t || !(t.admin === true || milik(key, t.uid))) return new Response('Ditolak', { status: 403 });
    await store.delete(key);
    return new Response('OK');
  }

  if (!publik) {
    const t = await siapa(req);
    if (!t || !(t.admin === true || milik(key, t.uid))) return new Response('Ditolak', { status: 403 });
  }
  const buf = await store.get(key, { type: 'arrayBuffer' });
  if (!buf) return new Response('Tidak ditemukan', { status: 404 });
  return new Response(buf, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': publik ? 'public, max-age=31536000, immutable' : 'private, no-store',
    },
  });
};
