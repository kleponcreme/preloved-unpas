// Memutar bunyi dan menampilkan pesan singkat saat ada kejadian baru,
// selama website sedang terbuka. Data awal saat halaman dibuka tidak dibunyikan.
import { useEffect, useRef } from 'react';
import { useAuth } from '../services/auth';
import {
  useTawaranMasuk, useTawaranSaya, usePesananSaya, usePenjualanSaya,
  usePembayaranMenunggu, useAkunMenunggu, useIklanModerasi, usePencairanDiminta,
} from '../services/hooks';
import { bunyi, siapkanBunyi } from '../lib/bunyi';
import { rp } from '../lib/format';
import { useToast } from './Toast';

function useAmati(state, kunci, tanda, cek) {
  const lama = useRef(null);
  const kunciLama = useRef(kunci);
  useEffect(() => {
    if (kunciLama.current !== kunci) {
      kunciLama.current = kunci;
      lama.current = null; // ganti akun: mulai dari awal tanpa bunyi
    }
    if (state.loading) return;
    const sekarang = new Map(state.data.map((d) => [d.id, d]));
    if (lama.current) {
      for (const [id, d] of sekarang) {
        const sebelum = lama.current.get(id);
        if (!sebelum || tanda(sebelum) !== tanda(d)) cek(d, sebelum);
      }
    }
    lama.current = sekarang;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data, state.loading, kunci]);
}

export default function Notifier() {
  const { user, admin } = useAuth();
  const toast = useToast();
  const kunci = `${user?.uid ?? '-'}|${admin}`;
  const kabari = (pesan, jenis) => { bunyi(jenis); toast(pesan); };

  useEffect(() => { siapkanBunyi(); }, []);

  // Penjual
  useAmati(useTawaranMasuk(), kunci, (d) => d.status, (d, s) => {
    if (!s && d.status === 'menunggu') kabari(`Tawaran baru ${rp(d.hargaTawar)} untuk ${d.judul}`);
  });
  useAmati(usePenjualanSaya(), kunci, (d) => `${d.status}|${d.jadwalDikonfirmasi}`, (d, s) => {
    if (d.status === 'dana_ditahan' && s?.status !== 'dana_ditahan') kabari(`Pesanan baru sudah dibayar: ${d.items[0].judul}`, 'uang');
    else if (!s && d.status === 'cod') kabari(`Pesanan COD baru: ${d.items[0].judul}`, 'uang');
    else if (d.status === 'selesai' && s && s.status !== 'selesai') kabari(`Barang diterima pembeli: ${d.items[0].judul}`, 'uang');
  });

  // Pembeli
  useAmati(useTawaranSaya(), kunci, (d) => d.status, (d, s) => {
    if (!s || s.status === d.status) return;
    if (d.status === 'diterima') kabari(`Nego disetujui: ${d.judul} jadi ${rp(d.hargaBalik ?? d.hargaTawar)}`);
    else if (d.status === 'harga_balik') kabari(`Penjual memberi harga balik ${rp(d.hargaBalik)} untuk ${d.judul}`);
    else if (d.status === 'ditolak') kabari(`Tawaran untuk ${d.judul} ditolak`);
  });
  useAmati(usePesananSaya(), kunci, (d) => `${d.status}|${d.jadwalDikonfirmasi}`, (d, s) => {
    if (!s) return;
    if (s.status === 'menunggu_bayar' && d.status === 'dana_ditahan') kabari('Pembayaran diterima admin', 'uang');
    else if (d.jadwalDikonfirmasi && !s.jadwalDikonfirmasi) kabari(`Penjual mengonfirmasi jadwal: ${d.jadwal.hari}, ${d.jadwal.jam}`);
    else if (d.status === 'batal' && s.status !== 'batal') kabari(`Pesanan ${d.items[0].judul} dibatalkan`);
  });

  // Admin
  useAmati(usePembayaranMenunggu(), kunci, () => 1, (d, s) => { if (!s) kabari(`Bukti bayar baru ${rp(d.total)} dari ${d.pembeliNama}`, 'uang'); });
  useAmati(useAkunMenunggu(), kunci, () => 1, (d, s) => { if (!s) kabari(`Pendaftar baru: ${d.nama}`); });
  useAmati(useIklanModerasi(), kunci, () => 1, (d, s) => { if (!s) kabari(`Iklan baru menunggu moderasi: ${d.judul}`); });
  useAmati(usePencairanDiminta(), kunci, () => 1, (d, s) => { if (!s) kabari(`Permintaan pencairan dari ${d.penjualNama}`, 'uang'); });

  return null;
}
