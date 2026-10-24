// Foto disimpan di Netlify Blobs dan diambil lewat fungsi /.netlify/functions/foto
import { auth } from '../services/firebase';

export const fotoUrl = (key) => (key ? `/.netlify/functions/foto?k=${encodeURIComponent(key)}` : null);

// Foto privat (KTM, bukti bayar) perlu token login, jadi diambil lalu dijadikan URL sementara
export async function fotoPrivat(key) {
  if (!key) return null;
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(fotoUrl(key), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}

export async function hapusFoto(key) {
  if (!key) return;
  const token = await auth.currentUser.getIdToken();
  await fetch(fotoUrl(key), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}

export function keBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
