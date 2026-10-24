// Menjadikan akun admin secara otomatis jika emailnya tercantum di ADMIN_EMAIL.
// Dipanggil sekali setiap kali pengguna masuk. Tidak perlu terminal.
import { auth, db, json, pengguna } from './_firebase.mjs';

export default async (req) => {
  try {
    const t = await pengguna(req);
    const daftar = (process.env.ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const email = (t.email || '').toLowerCase();
    if (!email || !daftar.includes(email)) return json({ admin: t.admin === true });
    if (t.admin !== true) await auth.setCustomUserClaims(t.uid, { admin: true });
    const ref = db.doc(`users/${t.uid}`);
    const snap = await ref.get();
    if (snap.exists && snap.data().statusVerifikasi !== 'terverifikasi') await ref.update({ statusVerifikasi: 'terverifikasi' });
    return json({ admin: true, baru: t.admin !== true });
  } catch (err) {
    return json({ error: err.message }, 400);
  }
};
