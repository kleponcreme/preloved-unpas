import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { APP } from '../config';
import { useAuth } from '../services/auth';
import { usePesanan, useProfil } from '../services/hooks';
import { ubahPesanan } from '../services/api';
import { netPenjual } from '../lib/harga';
import { rp } from '../lib/format';
import { tanggalWaktu } from '../lib/waktu';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import Loading from '../components/Loading';
import ProductMedia from '../components/ProductMedia';
import WhatsAppSheet from '../components/WhatsAppSheet';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import NotFound from './NotFound';

const LANGKAH = [
  { k: 'dibuat', t: 'Pesanan dibuat' },
  { k: 'bayar', t: 'Menunggu pembayaran' },
  { k: 'ditahan', t: 'Dana ditahan rekber' },
  { k: 'serah', t: 'Serah terima di Titik Temu' },
  { k: 'selesai', t: 'Selesai & beri ulasan' },
];
const LANGKAH_COD = [
  { k: 'dibuat', t: 'Pesanan dibuat' },
  { k: 'jadwal', t: 'Penjual mengonfirmasi jadwal' },
  { k: 'serah', t: 'Serah terima & bayar tunai' },
  { k: 'selesai', t: 'Selesai & beri ulasan' },
];
const posisi = (o) =>
  o.metodeBayar === 'cod'
    ? ({ cod: o.jadwalDikonfirmasi ? 2 : 1, selesai: 4 })[o.status] ?? 0
    : ({ menunggu_bayar: 1, dana_ditahan: o.jadwalDikonfirmasi ? 3 : 2, selesai: 5 })[o.status] ?? 0;

export default function DetailPesanan() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: o, loading } = usePesanan(id);
  const sayaPenjual = o?.penjualId === user?.uid;
  const lawan = useProfil(o ? (sayaPenjual ? o.pembeliId : o.penjualId) : null).data;
  const [chat, setChat] = useState(false);
  const [proses, setProses] = useState('');

  if (loading) return <><AppBar title="Status pesanan" fallback="/pesanan" /><main className="scroll"><Loading /></main></>;
  if (!o) return <NotFound judul="Pesanan tidak ditemukan" teks="Pesanan ini tidak ada atau bukan milikmu." />;

  const idx = posisi(o);
  const cod = o.metodeBayar === 'cod';
  const langkah = cod ? LANGKAH_COD : LANGKAH;
  const totalBarang = o.subtotal + o.ongkir;
  const waktu = `${o.jadwal.hari}, ${o.jadwal.tanggal} · ${o.jadwal.jam}`;
  const tempat = o.caraTerima === 'cod' ? APP.titikTemu : 'Antar ke kos';
  const namaLawan = sayaPenjual ? o.pembeliNama : o.penjualNama;

  async function aksi(nama, pesan, extra) {
    setProses(nama);
    try {
      await ubahPesanan(o.id, nama, extra);
      toast(pesan);
    } catch (e) {
      toast(e.message);
    } finally {
      setProses('');
    }
  }

  return (
    <>
      <AppBar title="Status pesanan" fallback={sayaPenjual ? '/lapak?tab=pesanan' : '/pesanan'} />
      <main className="scroll">
        <div className="wrap">
          {o.status === 'menunggu_bayar' && !sayaPenjual && (
            <div className="note y"><span>Pesanan ini belum dibayar. <Link to={`/bayar/${o.paymentId}`}>Buka halaman pembayaran</Link></span></div>
          )}
          {o.status === 'menunggu_bayar' && sayaPenjual && <div className="note y"><span>Menunggu pembeli membayar ke QRIS admin.</span></div>}
          {o.status === 'dana_ditahan' && !sayaPenjual && (
            <div className="note g"><Icon.Shield /><span>Pembayaran diterima dan ditahan admin. Dana baru diteruskan ke penjual setelah kamu menekan <b>Barang sudah diterima</b>.</span></div>
          )}
          {o.status === 'dana_ditahan' && sayaPenjual && (
            <div className="note g"><Icon.Shield /><span>Pembeli sudah membayar {rp(o.subtotal + o.ongkir)}. Dana ditahan admin sampai barang diterima.</span></div>
          )}
          {o.status === 'cod' && !sayaPenjual && (
            <div className="note y"><span>Bayar <b>{rp(totalBarang)}</b> tunai langsung ke penjual saat serah terima. Cek kondisi barang sebelum membayar.</span></div>
          )}
          {o.status === 'cod' && sayaPenjual && (
            <div className="note y"><span>Pembeli akan membayar <b>{rp(totalBarang)}</b> tunai saat bertemu. {o.jadwalDikonfirmasi ? 'Bawa barang sesuai jadwal.' : 'Konfirmasi jadwal dulu.'}</span></div>
          )}
          {o.status === 'selesai' && <div className="note g"><Icon.Check /><span><b>Transaksi selesai.</b> {sayaPenjual ? (cod ? 'Pembayaran tunai sudah kamu terima.' : 'Dana bisa dicairkan dari Lapak saya.') : 'Terima kasih sudah belanja sesama warga Unpas!'}</span></div>}
          {o.status === 'batal' && <div className="note no"><span>Pesanan dibatalkan. Barang kembali tersedia di katalog.</span></div>}

          {o.status !== 'batal' && (
            <div className="card card-b">
              <span className="ctitle" style={{ display: 'block', marginBottom: 14 }}>Status pesanan</span>
              <ol className="steps">
                {langkah.map((l, i) => {
                  const cls = i < idx ? 'done' : i === idx ? 'now' : '';
                  const sub = l.k === 'dibuat' ? tanggalWaktu(o.dibuat) : l.k === 'serah' || l.k === 'jadwal' ? `${tempat} · ${waktu}` : l.k === 'ditahan' && o.status === 'dana_ditahan' && !o.jadwalDikonfirmasi ? 'Menunggu penjual mengonfirmasi jadwal' : '';
                  return (
                    <li key={l.k} className={cls}>
                      <div className="dotcol"><span className="dot">{i < idx && <Icon.Check />}</span>{i < langkah.length - 1 && <span className="bar" />}</div>
                      <div className="txt"><b>{l.t}</b><span>{sub}</span></div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="card card-b stack">
            <span className="ctitle">Barang</span>
            {o.items.map((it) => (
              <div className="item center" key={it.productId}>
                <div className="thumb" style={{ width: 48, height: 48 }}><ProductMedia foto={it.foto} /></div>
                <div className="istack"><span className="iname">{it.judul}</span><span className="meta">{o.penjualNama}{it.nego ? ' · harga nego' : ''}</span></div>
                <b>{rp(it.harga)}</b>
              </div>
            ))}
            <div className="note b"><Icon.Pin /><span>{tempat}, {waktu}</span></div>
            {o.catatan && <p className="quote">“{o.catatan}”</p>}
            <button className="btn sm waout" onClick={() => setChat(true)}><Icon.Wa />Chat {namaLawan}</button>
            {sayaPenjual && o.status === 'selesai' && (
              <div>
                <div className="sum"><span>Harga barang</span><span>{rp(o.subtotal)}</span></div>
                {o.ongkir > 0 && <div className="sum"><span>Ongkir antar</span><span>{rp(o.ongkir)}</span></div>}
                <div className="sum"><span>Komisi Preloved {APP.komisi * 100}%</span><span>−{rp(o.komisi)}</span></div>
                <div className="sum total"><span>Kamu terima</span><span className="navy">{rp(netPenjual(o.subtotal) + o.ongkir)}</span></div>
                {cod && !o.komisiLunas && <div className="note y" style={{ marginTop: 8 }}><span>Pembayaran COD diterima tunai, jadi setor komisi <b>{rp(o.komisi)}</b> ke QRIS admin. Admin akan menandainya lunas.</span></div>}
              </div>
            )}
          </div>

          {!sayaPenjual && o.status === 'selesai' && (
            <div className="card card-b center-text">
              <span className="ctitle">Beri ulasan</span>
              <div className="stars" role="group" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className={(o.rating || 0) >= n ? 'on' : ''} disabled={Boolean(o.rating)} onClick={() => aksi('ulas', 'Terima kasih atas ulasanmu', { rating: n })} aria-label={`${n} bintang`}>★</button>
                ))}
              </div>
              {o.rating && <span className="meta">Terima kasih atas ulasanmu.</span>}
            </div>
          )}
        </div>
      </main>

      {o.status === 'cod' && (
        <div style={{ textAlign: 'center', paddingBottom: 6 }}>
          <button className="link red" onClick={() => window.confirm('Batalkan pesanan COD ini? Barang kembali tersedia.') && aksi('batal', 'Pesanan dibatalkan')}>Batalkan pesanan</button>
        </div>
      )}
      {!sayaPenjual && ['dana_ditahan', 'cod'].includes(o.status) ? (
        <div className="actionbar"><button className="btn primary grow" onClick={() => aksi('terima', 'Pesanan selesai')} disabled={Boolean(proses)}>{proses === 'terima' ? 'Menyimpan…' : 'Barang sudah diterima'}</button></div>
      ) : sayaPenjual && ['dana_ditahan', 'cod'].includes(o.status) && !o.jadwalDikonfirmasi ? (
        <div className="actionbar"><button className="btn primary grow" onClick={() => aksi('konfirmasi', 'Jadwal dikonfirmasi, pembeli sudah diberi tahu')} disabled={Boolean(proses)}>Konfirmasi jadwal</button></div>
      ) : (
        <TabBar />
      )}

      {chat && (
        <WhatsAppSheet
          nama={namaLawan}
          nomor={lawan?.whatsapp}
          pesanAwal={sayaPenjual
            ? `Halo ${o.pembeliNama.split(' ')[0]}, saya penjual dari Preloved Unpas (pesanan ${o.kode}). Kita ketemu di ${tempat}, ${waktu} ya.`
            : `Halo Kak ${o.penjualNama.split(' ')[0]}, saya pembeli ${o.items[0].judul} (pesanan ${o.kode}). Kita ketemu di ${tempat}, ${waktu} ya.`}
          onClose={() => setChat(false)}
        />
      )}
    </>
  );
}
