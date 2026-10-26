import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAkunMenunggu, useIklanModerasi, usePembayaranMenunggu, usePencairanDiminta, useKomisiCod, usePengaturan, useAkunBermasalah } from '../services/hooks';
import { ambilFotoKtm, verifikasiAkun, moderasiIklan, ubahPembayaran, ambilBuktiBayar, ubahPesanan, tandaiKomisiLunas, simpanPengaturan, unggahQris, hapusTanda } from '../services/api';
import { APP } from '../config';
import { netPenjual } from '../lib/harga';
import { rp } from '../lib/format';
import { tanggalWaktu } from '../lib/waktu';
import { pesanError } from '../lib/errors';
import AppBar from '../components/AppBar';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import ProductMedia from '../components/ProductMedia';
import { useToast } from '../components/Toast';

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'bayar';
  const bayar = usePembayaranMenunggu();
  const akun = useAkunMenunggu();
  const iklan = useIklanModerasi();
  const cair = usePencairanDiminta();
  const komisi = useKomisiCod();
  const tanda = useAkunBermasalah();
  const kosong = { data: [], loading: false };
  const tabs = [['bayar', 'Pembayaran', bayar], ['akun', 'Akun', akun], ['iklan', 'Iklan', iklan], ['cair', 'Pencairan', cair], ['komisi', 'Komisi COD', komisi], ['tanda', 'Ditandai', tanda], ['atur', 'Pengaturan', kosong]];
  const isi = { bayar, akun, iklan, cair, komisi, tanda, atur: kosong }[tab];

  return (
    <>
      <AppBar title="Admin" fallback="/lapak" />
      <main className="scroll">
        <div className="chips" role="group" aria-label="Bagian admin">
          {tabs.map(([k, l, d]) => <button key={k} className="chip" aria-pressed={tab === k} onClick={() => setParams({ tab: k }, { replace: true })}>{l}{d.data.length ? ` (${d.data.length})` : ''}</button>)}
        </div>
        <div className="wrap">
          {tab === 'atur' ? <Pengaturan /> : isi.loading ? <Loading /> : isi.data.length === 0 ? <EmptyState judul="Tidak ada yang perlu dicek" /> : isi.data.map((d) =>
            tab === 'bayar' ? <KartuBayar key={d.id} p={d} /> :
            tab === 'akun' ? <KartuAkun key={d.id} u={d} /> :
            tab === 'iklan' ? <KartuIklan key={d.id} p={d} /> :
            tab === 'komisi' ? <KartuKomisi key={d.id} o={d} /> :
            tab === 'tanda' ? <KartuTanda key={d.id} u={d} /> : <KartuCair key={d.id} o={d} />)}
        </div>
      </main>
    </>
  );
}

function useAksi() {
  const toast = useToast();
  const [proses, setProses] = useState(false);
  async function jalankan(fn, pesan) {
    setProses(true);
    try {
      await fn();
      toast(pesan);
    } catch (e) {
      toast(pesanError(e));
    } finally {
      setProses(false);
    }
  }
  return [proses, jalankan];
}

function KartuBayar({ p }) {
  const [bukti, setBukti] = useState(null);
  const [proses, jalankan] = useAksi();
  return (
    <div className="card card-b stack">
      <div className="item center"><b className="grow">{p.kode}</b><span className="status wait">Cek bukti</span></div>
      <div className="bigprice" style={{ fontSize: 26 }}>{rp(p.total)}</div>
      <span className="meta">Pembeli {p.pembeliNama} · kode unik {p.kodeUnik} · {p.orderIds.length} pesanan · dikirim {tanggalWaktu(p.dikirim)}</span>
      {!bukti ? <button className="btn sm ghost" onClick={async () => setBukti(await ambilBuktiBayar(p.buktiPath))}>Lihat bukti bayar</button> : <img className="ktm-preview" src={bukti} alt={`Bukti bayar ${p.kode}`} />}
      <div className="note b"><span>Cocokkan nominal <b>{rp(p.total)}</b> dengan mutasi QRIS admin sebelum menerima.</span></div>
      <div className="btnrow">
        <button className="btn sm dark" disabled={proses} onClick={() => jalankan(() => ubahPembayaran(p.id, 'terima'), 'Pembayaran diterima, dana ditahan')}>Terima</button>
        <button className="btn sm ghost" disabled={proses} onClick={() => { const c = window.prompt('Alasan penolakan (dikirim ke pembeli):', 'Nominal tidak sesuai'); if (c !== null) jalankan(() => ubahPembayaran(p.id, 'tolak', { catatan: c }), 'Bukti ditolak'); }}>Tolak</button>
        <button className="btn sm ghost danger" disabled={proses} onClick={() => window.confirm('Batalkan pesanan dan kembalikan stok?') && jalankan(() => ubahPembayaran(p.id, 'batalkan'), 'Pesanan dibatalkan')}>Batalkan</button>
      </div>
    </div>
  );
}

function KartuCair({ o }) {
  const [proses, jalankan] = useAksi();
  const jumlah = netPenjual(o.subtotal) + o.ongkir;
  return (
    <div className="card card-b stack">
      <div className="item center"><b className="grow">{o.kode}</b><span className="status hold">Minta cair</span></div>
      <div className="bigprice" style={{ fontSize: 26 }}>{rp(jumlah)}</div>
      <span className="meta">Penjual {o.penjualNama} · harga {rp(o.subtotal)} − komisi {rp(o.komisi)}{o.ongkir ? ` + ongkir ${rp(o.ongkir)}` : ''}</span>
      <div className="note b"><span>Transfer ke <b>{o.rekening?.bank} {o.rekening?.nomor}</b> a.n. {o.rekening?.nama}</span></div>
      <button className="btn sm dark" disabled={proses} onClick={() => jalankan(() => ubahPesanan(o.id, 'dibayar'), 'Ditandai sudah ditransfer')}>Tandai sudah ditransfer</button>
    </div>
  );
}

function KartuAkun({ u }) {
  const [ktm, setKtm] = useState(null);
  const [proses, jalankan] = useAksi();
  return (
    <div className="card card-b stack">
      <div><b>{u.nama}</b><div className="meta">NPM {u.npm} · {u.prodi} · {u.angkatan}</div><div className="meta">Daftar {tanggalWaktu(u.dibuat)}</div></div>
      {ktm === null && <button className="btn sm ghost" onClick={async () => setKtm((await ambilFotoKtm(u.id)) ?? 'kosong')}>Lihat foto KTM</button>}
      {ktm === 'kosong' && <p className="err">Foto KTM tidak ditemukan.</p>}
      {ktm && ktm !== 'kosong' && <img className="ktm-preview" src={ktm} alt={`KTM ${u.nama}`} />}
      <div className="note b"><span>Pastikan nama dan NPM sama, dan tertulis Fakultas Ilmu Sosial dan Ilmu Politik.</span></div>
      <div className="btnrow">
        <button className="btn sm dark" disabled={proses} onClick={() => jalankan(() => verifikasiAkun(u.id, true), `${u.nama} terverifikasi`)}>Setujui</button>
        <button className="btn sm ghost danger" disabled={proses} onClick={() => jalankan(() => verifikasiAkun(u.id, false), `${u.nama} ditolak`)}>Tolak</button>
      </div>
    </div>
  );
}

function KartuIklan({ p }) {
  const [proses, jalankan] = useAksi();
  const [cod, setCod] = useState(p.bolehCod !== false);
  const [paket, setPaket] = useState(Boolean(p.ajukanPaket || p.paket));
  return (
    <div className="card">
      {p.foto?.length > 0 && <div className="admin-photos">{p.foto.map((f) => <img key={f} src={f} alt="" />)}</div>}
      <div className="card-b stack">
        <div className="item">
          {!p.foto?.length && <div className="thumb"><ProductMedia produk={p} /></div>}
          <div className="istack">
            <span className="iname">{p.judul}</span>
            <b className="navy">{rp(p.harga)}</b>
            <span className="meta">{p.kategori} · {p.kondisi} · stok {p.stok}{p.bisaNego ? ' · bisa nego' : ''}</span>
            <span className="meta">oleh {p.penjualNama} ({p.penjualProdi})</span>
          </div>
        </div>
        {p.deskripsi && <p className="desc small">{p.deskripsi}</p>}
        <div className="note b stackish">
          <span>Penjual mengajukan: <b>{p.bolehCod === false ? 'QRIS saja' : 'QRIS dan COD'}</b>{p.ajukanPaket ? ', masuk Paket Maba' : ''}.</span>
          <label className="switch">Setujui pembayaran COD<input type="checkbox" checked={cod} onChange={(e) => setCod(e.target.checked)} /></label>
          <label className="switch">Masukkan ke Paket Maba FISIP<input type="checkbox" checked={paket} onChange={(e) => setPaket(e.target.checked)} /></label>
        </div>
        <div className="btnrow">
          <button className="btn sm dark" disabled={proses} onClick={() => jalankan(() => moderasiIklan(p.id, true, { bolehCod: cod, paket }), 'Iklan ditayangkan')}>Tayangkan</button>
          <button className="btn sm ghost danger" disabled={proses} onClick={() => jalankan(() => moderasiIklan(p.id, false), 'Iklan ditolak')}>Tolak</button>
        </div>
      </div>
    </div>
  );
}

function KartuKomisi({ o }) {
  const [proses, jalankan] = useAksi();
  return (
    <div className="card card-b stack">
      <div className="item center"><b className="grow">{o.kode}</b><span className="status wait">Komisi COD</span></div>
      <div className="bigprice" style={{ fontSize: 26 }}>{rp(o.komisi)}</div>
      <span className="meta">Penjual {o.penjualNama} · harga barang {rp(o.subtotal)} · pembeli {o.pembeliNama}</span>
      <div className="note b"><span>Tandai lunas setelah komisi ini masuk ke QRIS admin.</span></div>
      <button className="btn sm dark" disabled={proses} onClick={() => jalankan(() => tandaiKomisiLunas(o.id), 'Komisi ditandai lunas')}>Tandai komisi lunas</button>
    </div>
  );
}

function Pengaturan() {
  const { data: atur, loading } = usePengaturan();
  const [proses, jalankan] = useAksi();
  const [f, setF] = useState(null);
  if (loading) return <Loading />;
  const nilai = f ?? { qrisPenerima: atur?.qrisPenerima || APP.qrisPenerima, lokasiTitikTemu: atur?.lokasiTitikTemu || '' };
  return (
    <>
      <div className="card card-b stack">
        <span className="ctitle">Gambar QRIS admin</span>
        <span className="meta">Unggah QRIS statis dari aplikasi bank atau e-wallet merchant milik admin. Gambar ini tampil di halaman pembayaran pembeli.</span>
        <div className="qr" style={{ alignSelf: 'center' }}><img src={atur?.qrisUrl || APP.qrisGambar} alt="QRIS saat ini" width="200" style={{ display: 'block', height: 'auto' }} /></div>
        {!atur?.qrisUrl && <p className="err">Masih memakai gambar contoh. Ganti sebelum menerima pembayaran.</p>}
        <label className={`btn ghost sm${proses ? ' disabled' : ''}`} style={{ alignSelf: 'flex-start' }}>
          Unggah QRIS baru
          <input type="file" accept="image/*" className="sr" disabled={proses} onChange={(e) => { const file = e.target.files[0]; e.target.value = ''; if (file) jalankan(() => unggahQris(file), 'QRIS diperbarui'); }} />
        </label>
      </div>
      <div className="card card-b stack lg">
        <span className="ctitle">Metode pembayaran</span>
        <label className="switch">QRIS (rekber) dibuka<input type="checkbox" checked={atur?.qrisAktif !== false} disabled={proses} onChange={(e) => jalankan(() => simpanPengaturan({ qrisAktif: e.target.checked }), e.target.checked ? 'QRIS dibuka' : 'QRIS ditutup')} /></label>
        <label className="switch">COD tunai dibuka<input type="checkbox" checked={atur?.codAktif !== false} disabled={proses} onChange={(e) => jalankan(() => simpanPengaturan({ codAktif: e.target.checked }), e.target.checked ? 'COD dibuka' : 'COD ditutup')} /></label>
        <span className="meta">Menutup metode berlaku untuk semua pesanan baru. COD per barang tetap mengikuti persetujuan saat moderasi.</span>
        <label className="field"><span className="flabel">Nama penerima QRIS</span><input className="input" value={nilai.qrisPenerima} onChange={(e) => setF({ ...nilai, qrisPenerima: e.target.value })} /></label>
        <label className="field"><span className="flabel">Lokasi pasti Titik Temu</span><input className="input" value={nilai.lokasiTitikTemu} onChange={(e) => setF({ ...nilai, lokasiTitikTemu: e.target.value })} placeholder="Contoh: Lobi gedung FISIP, dekat mading" /></label>
        <button className="btn primary" disabled={proses} onClick={() => jalankan(async () => { await simpanPengaturan({ qrisPenerima: nilai.qrisPenerima.trim(), lokasiTitikTemu: nilai.lokasiTitikTemu.trim() }); setF(null); }, 'Pengaturan disimpan')}>Simpan pengaturan</button>
      </div>
    </>
  );
}

function KartuTanda({ u }) {
  const [proses, jalankan] = useAksi();
  const r = u.risiko || {};
  const wa = (u.whatsapp || '').replace(/\D/g, '').replace(/^0/, '62');
  return (
    <div className="card card-b stack">
      <div className="item center"><b className="grow">{u.nama}</b>{u.ditangguhkan ? <span className="status">Ditangguhkan</span> : <span className="status wait">Ditandai</span>}</div>
      <span className="meta">NPM {u.npm} · {u.prodi} · {u.angkatan}</span>
      <div className="sum"><span>Utang komisi COD</span><span>{rp(u.utangKomisi || 0)}</span></div>
      <div className="sum"><span>Membatalkan pesanan COD</span><span>{r.batalCod || 0} kali</span></div>
      <div className="sum"><span>Menghapus barang yang sedang diminati</span><span>{r.hapusSetelahMinat || 0} kali</span></div>
      {u.ditangguhkan && <div className="note y"><span>Barang penjual ini disembunyikan dan ia tidak bisa memasang barang baru. Status pulih otomatis setelah komisinya ditandai lunas di tab Komisi COD.</span></div>}
      <div className="btnrow">
        {wa && <a className="btn sm waout" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">Chat penjual</a>}
        {u.ditandai && <button className="btn sm ghost" disabled={proses} onClick={() => window.confirm('Hapus tanda dan reset catatan penjual ini?') && jalankan(() => hapusTanda(u.id), 'Tanda dihapus')}>Hapus tanda</button>}
      </div>
    </div>
  );
}
