import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { APP } from '../config';
import { usePembayaran, useDocuments, usePengaturan } from '../services/hooks';
import { kirimBuktiBayar, ubahPembayaran } from '../services/api';
import { rp } from '../lib/format';
import { tanggalWaktu } from '../lib/waktu';
import { pesanError } from '../lib/errors';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import Loading from '../components/Loading';
import ProductMedia from '../components/ProductMedia';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import NotFound from './NotFound';
import { STATUS_PESANAN } from './Pesanan';

const LANGKAH = [
  { k: 'dibuat', t: 'Pesanan dibuat' },
  { k: 'bayar', t: 'Menunggu pembayaran' },
  { k: 'cek', t: 'Bukti dicek admin' },
  { k: 'ditahan', t: 'Dana ditahan rekber' },
];
const posisi = { menunggu_bayar: 1, ditolak: 1, menunggu_verifikasi: 2, lunas: 4 };

export default function Pembayaran() {
  const { id } = useParams();
  const toast = useToast();
  const { data: pay, loading } = usePembayaran(id);
  const orders = useDocuments('orders', pay?.orderIds ?? []);
  const [sisa, setSisa] = useState(0);
  const [proses, setProses] = useState(false);
  const fileRef = useRef(null);
  const atur = usePengaturan().data;
  const qrisGambar = atur?.qrisUrl || APP.qrisGambar;
  const qrisPenerima = atur?.qrisPenerima || APP.qrisPenerima;

  useEffect(() => {
    if (!pay || pay.status !== 'menunggu_bayar') return undefined;
    const tick = () => setSisa(Math.max(0, Math.round((pay.batasBayar - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [pay?.status, pay?.batasBayar]);

  if (loading) return <><AppBar title="Pembayaran" fallback="/pesanan" /><main className="scroll"><Loading /></main></>;
  if (!pay) return <NotFound judul="Pembayaran tidak ditemukan" teks="Pembayaran ini tidak ada atau bukan milikmu." />;

  const habis = pay.status === 'menunggu_bayar' && sisa === 0;
  const bisaUnggah = (pay.status === 'menunggu_bayar' && !habis) || pay.status === 'ditolak';
  const idx = posisi[pay.status] ?? 0;
  const daftar = pay.orderIds.map((oid) => orders[oid]).filter(Boolean);

  async function unggah(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setProses(true);
    try {
      await kirimBuktiBayar(pay.id, file);
      toast('Bukti terkirim, admin sedang mengecek');
    } catch (err) {
      toast(pesanError(err));
    } finally {
      setProses(false);
    }
  }

  async function batal() {
    if (!window.confirm('Batalkan pesanan ini? Barang akan kembali tersedia untuk pembeli lain.')) return;
    try {
      await ubahPembayaran(pay.id, 'batal');
      toast('Pesanan dibatalkan');
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <>
      <AppBar title={pay.status === 'lunas' ? 'Status pembayaran' : 'Pembayaran'} fallback="/pesanan" />
      <main className="scroll">
        <div className="wrap">
          {bisaUnggah && (
            <div className="qrcard">
              {pay.status === 'menunggu_bayar' && (
                <span className="timer">Bayar dalam {String(Math.floor(sisa / 60)).padStart(2, '0')}:{String(sisa % 60).padStart(2, '0')}</span>
              )}
              {pay.status === 'ditolak' && <div className="note no left"><span><b>Bukti ditolak admin:</b> {pay.catatanAdmin}. Unggah ulang bukti yang benar.</span></div>}
              <div>
                <div className="meta">Total bayar</div>
                <div className="bigprice" style={{ fontSize: 30 }}>{rp(pay.total)}</div>
                <div className="meta">No. pesanan {pay.kode}</div>
              </div>
              <div className="qr"><img src={qrisGambar} alt="QRIS admin RE:LOOP" width="220" style={{ height: 'auto', display: 'block' }} /></div>
              <span className="desc small">Scan dengan e-wallet atau m-banking apa pun. Penerima: <b>{qrisPenerima}</b></span>
              <div className="note y left">
                <span>Masukkan nominal <b>tepat {rp(pay.total)}</b>. Tiga digit terakhir ({pay.kodeUnik}) adalah kode unik supaya pembayaranmu mudah dikenali.</span>
              </div>
              <label className={`btn dark full${proses ? ' disabled' : ''}`}>
                {proses ? 'Mengunggah…' : 'Unggah bukti pembayaran'}
                <input ref={fileRef} type="file" accept="image/*" className="sr" onChange={unggah} disabled={proses} />
              </label>
              <button className="link red center-self" onClick={batal}>Batalkan pesanan</button>
            </div>
          )}
          {habis && <div className="note no"><span>Waktu bayar habis. Pesanan akan dibatalkan otomatis dan barang kembali tersedia.</span></div>}
          {pay.status === 'menunggu_verifikasi' && (
            <div className="note y"><Icon.Shield /><span><b>Bukti terkirim.</b> Admin sedang mengecek pembayaran {rp(pay.total)}, biasanya kurang dari 1 jam.</span></div>
          )}
          {pay.status === 'lunas' && (
            <div className="note g"><Icon.Shield /><span>Pembayaran diterima dan ditahan admin. Dana baru diteruskan ke penjual setelah kamu menekan <b>Barang sudah diterima</b> di setiap pesanan.</span></div>
          )}
          {['batal', 'kedaluwarsa'].includes(pay.status) && (
            <div className="note no"><span>Pesanan dibatalkan{pay.status === 'kedaluwarsa' ? ' karena waktu bayar habis' : ''}. Barang kembali tersedia di katalog.</span></div>
          )}

          {!['batal', 'kedaluwarsa'].includes(pay.status) && (
            <div className="card card-b">
              <span className="ctitle" style={{ display: 'block', marginBottom: 14 }}>Status pembayaran</span>
              <ol className="steps">
                {LANGKAH.map((l, i) => {
                  const cls = i < idx ? 'done' : i === idx ? 'now' : '';
                  const sub = l.k === 'dibuat' ? tanggalWaktu(pay.dibuat) : l.k === 'bayar' ? `QRIS ke ${qrisPenerima}` : l.k === 'cek' ? 'Biasanya kurang dari 1 jam' : 'Diteruskan ke penjual setelah barang diterima';
                  return (
                    <li key={l.k} className={cls}>
                      <div className="dotcol"><span className="dot">{i < idx && <Icon.Check />}</span>{i < LANGKAH.length - 1 && <span className="bar" />}</div>
                      <div className="txt"><b>{l.t}</b><span>{sub}</span></div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="card card-b stack">
            <span className="ctitle">Pesanan ({daftar.length})</span>
            {daftar.map((o) => {
              const [label, cls] = STATUS_PESANAN[o.status] ?? [o.status, ''];
              return (
                <Link key={o.id} to={`/pesanan/${o.id}`} className="item center plainlink">
                  <div className="thumb" style={{ width: 48, height: 48 }}><ProductMedia foto={o.items[0].foto} /></div>
                  <div className="istack">
                    <span className="iname">{o.items[0].judul}{o.items.length > 1 ? ` +${o.items.length - 1}` : ''}</span>
                    <span className="meta">{o.penjualNama} · {rp(o.subtotal + o.ongkir)}</span>
                  </div>
                  <span className={`status ${cls}`}>{label}</span>
                </Link>
              );
            })}
            <div className="sum"><span>Barang dan ongkir</span><span>{rp(pay.barang)}</span></div>
            {pay.biayaLayanan > 0 && <div className="sum"><span>Biaya layanan</span><span>{rp(pay.biayaLayanan)}</span></div>}
            {pay.promo > 0 && <div className="sum"><span>Promo Pembeli Pertama</span><span className="green">−{rp(pay.promo)}</span></div>}
            <div className="sum"><span>Kode unik</span><span>{rp(pay.kodeUnik)}</span></div>
            <div className="sum total"><span>Total bayar</span><span className="navy">{rp(pay.total)}</span></div>
          </div>
          <Link to="/" className="link center-self">Kembali ke beranda</Link>
        </div>
      </main>
      <TabBar />
    </>
  );
}
