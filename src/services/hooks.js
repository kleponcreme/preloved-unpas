// Hook pembaca data Firestore secara real-time (onSnapshot).
// Data otomatis diperbarui di layar saat berubah di database.
import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';

const dariSnap = (d) => ({ id: d.id, ...d.data() });
// Urutkan terbaru di browser, supaya tidak perlu membuat index di Firebase
const waktu = (x) => (x?.dibuat?.toMillis ? x.dibuat.toMillis() : Date.now());
const terbaru = (a, b) => waktu(b) - waktu(a);

function useQuery(buat, deps) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    const q = buat();
    if (!q) {
      setState({ data: [], loading: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map(dariSnap).sort(terbaru), loading: false, error: null }),
      (error) => {
        console.error(error);
        setState({ data: [], loading: false, error });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function useDocument(buat, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    const ref = buat();
    if (!ref) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      ref,
      (s) => setState({ data: s.exists() ? dariSnap(s) : null, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

// Beberapa dokumen sekaligus berdasarkan daftar id
export function useDocuments(koleksi, ids) {
  const kunci = [...new Set(ids)].sort().join(',');
  const [peta, setPeta] = useState({});
  useEffect(() => {
    const daftar = kunci ? kunci.split(',') : [];
    const unsubs = daftar.map((id) =>
      onSnapshot(
        doc(db, koleksi, id),
        (s) => setPeta((m) => ({ ...m, [id]: s.exists() ? dariSnap(s) : null })),
        () => setPeta((m) => ({ ...m, [id]: null })), // tidak boleh dibaca, misalnya sudah terjual
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [koleksi, kunci]);
  return peta;
}

/* ---------- Katalog dan produk ---------- */

export const useKatalog = () =>
  useQuery(() => query(collection(db, 'products'), where('status', '==', 'tayang')), []);

export const useProduk = (id) => useDocument(() => (id ? doc(db, 'products', id) : null), [id]);

// Profil (termasuk nomor WhatsApp) hanya bisa dibaca pengguna terverifikasi
export function useProfil(uid) {
  const { terverifikasi } = useAuth();
  return useDocument(() => (uid && terverifikasi ? doc(db, 'profiles', uid) : null), [uid, terverifikasi]);
}

/* ---------- Sisi pembeli ---------- */

export function useTawaranSaya() {
  const { user } = useAuth();
  return useQuery(
    () => (user ? query(collection(db, 'offers'), where('pembeliId', '==', user.uid)) : null),
    [user?.uid],
  );
}

export function useIsiKeranjang() {
  const { user, terverifikasi } = useAuth();
  return useQuery(() => (user && terverifikasi ? collection(db, 'carts', user.uid, 'items') : null), [user?.uid, terverifikasi]);
}

export function useKeranjang() {
  const isi = useIsiKeranjang();
 const ids = isi.data.map((i) => i.productId);
const produk = useDocuments('products', ids);
const menungguProduk = ids.some((id) => produk[id] === undefined);
return {
loading: isi.loading || menungguProduk,
    items: isi.data.map((i) => ({ ...i, produk: produk[i.productId] })),
  };
}

export function usePesananSaya() {
  const { user } = useAuth();
  return useQuery(
    () => (user ? query(collection(db, 'orders'), where('pembeliId', '==', user.uid)) : null),
    [user?.uid],
  );
}

export const usePesanan = (id) => useDocument(() => (id ? doc(db, 'orders', id) : null), [id]);

/* ---------- Sisi penjual ---------- */

export function useIklanSaya() {
  const { user } = useAuth();
  return useQuery(
    () => (user ? query(collection(db, 'products'), where('penjualId', '==', user.uid)) : null),
    [user?.uid],
  );
}

export function useTawaranMasuk() {
  const { user } = useAuth();
  return useQuery(
    () => (user ? query(collection(db, 'offers'), where('penjualId', '==', user.uid)) : null),
    [user?.uid],
  );
}

export function usePenjualanSaya() {
  const { user } = useAuth();
  return useQuery(
    () => (user ? query(collection(db, 'orders'), where('penjualId', '==', user.uid)) : null),
    [user?.uid],
  );
}

/* ---------- Admin ---------- */

export function useAkunMenunggu() {
  const { admin } = useAuth();
  return useQuery(() => (admin ? query(collection(db, 'users'), where('statusVerifikasi', '==', 'menunggu')) : null), [admin]);
}

export function useIklanModerasi() {
  const { admin } = useAuth();
  return useQuery(
    () => (admin ? query(collection(db, 'products'), where('status', '==', 'moderasi')) : null),
    [admin],
  );
}

/* ---------- Pembayaran QRIS ---------- */

export const usePembayaran = (id) => useDocument(() => (id ? doc(db, 'payments', id) : null), [id]);

export function usePembayaranMenunggu() {
  const { admin } = useAuth();
  return useQuery(() => (admin ? query(collection(db, 'payments'), where('status', '==', 'menunggu_verifikasi')) : null), [admin]);
}

export function usePencairanDiminta() {
  const { admin } = useAuth();
  return useQuery(() => (admin ? query(collection(db, 'orders'), where('pencairan', '==', 'diminta')) : null), [admin]);
}

export const usePengaturan = () => useDocument(() => doc(db, 'settings', 'app'), []);

export function useKomisiCod() {
  const { admin } = useAuth();
  return useQuery(
    () => (admin ? query(collection(db, 'orders'), where('metodeBayar', '==', 'cod'), where('status', '==', 'selesai'), where('komisiLunas', '==', false)) : null),
    [admin],
  );
}
