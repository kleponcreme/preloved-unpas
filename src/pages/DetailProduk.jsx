import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { APP } from '../config';
import { useAuth } from '../services/auth';
import { useProduk, useProfil, useTawaranSaya, useIsiKeranjang } from '../services/hooks';
import { tambahKeKeranjang, kirimTawaran, jawabHargaBalik } from '../services/api';
import { hargaEfektif, tawaranTerakhir } from '../lib/harga';
import { rp, angka, formatRibuan } from '../lib/format';
import { pesanError } from '../lib/errors';
import AppBar from '../components/AppBar';
import CartButton from '../components/CartButton';
import ProductMedia from '../components/ProductMedia';
import Avatar from '../components/Avatar';
import Sheet from '../components/Sheet';
import Loading from '../components/Loading';
import WhatsAppSheet from '../components/WhatsAppSheet';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import NotFound from './NotFound';

export default function DetailProduk() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user, akun, terverifikasi } = useAuth();
  const { data: p, loading } = useProduk(id);
  const tawaranSaya = useTawaranSaya().data;
  const keranjang = useIsiKeranjang().data;
  const profilPenjual = useProfil(p?.penjualId).data;
  const [sheet, setSheet] = useState(null);
  const [foto, setFoto] = useState(0);

  if (loading) return <><AppBar title="Detail barang" /><main className="scroll"><Loading /></main></>;
  if (!p) return <NotFound />;

  const milikSaya = p.penjualId === user?.uid;
  const harga = hargaEfektif(p, tawaranSaya);
  const tawaran = tawaranTerakhir(tawaranSaya, id);
  const diKeranjang = keranjang.some((i) => i.productId === id);
  const habis = p.stok < 1 || p.status !== 'tayang';
  const negoAktif = tawaran && ['menunggu', 'diterima', 'harga_balik'].includes(tawaran.status);

  // Aksi jual-beli hanya untuk akun terverifikasi
  function perluAkun(aksi) {
    if (!user) return navigate('/masuk', { state: { from: location } });
    if (!terverifikasi) return toast('Akunmu masih menunggu verifikasi admin');
    return aksi();
  }

  async function tambah() {
    if (diKeranjang) return navigate('/keranjang');
    try {
      await tambahKeKeranjang(id);
      toast('Masuk keranjang');
    } catch (e) {
      toast(pesanError(e));
    }
  }

  return (
    <>
      <AppBar title="Detail barang" right={user && <CartButton />} />
      <main className="scroll">
        <div className="gallery">
          <ProductMedia produk={p} foto={p.foto?.[foto]} />
          {habis && <span className="tag r sold">{p.status === 'moderasi' ? 'Menunggu moderasi' : 'Tidak tersedia'}</span>}
        </div>
        {p.foto?.length > 1 && (
          <div className="thumbs" role="group" aria-label="Foto lain">
            {p.foto.map((f, i) => (
              <button key={f} className={`thumb sm${i === foto ? ' on' : ''}`} onClick={() => setFoto(i)} aria-label={`Foto ${i + 1}`}>
                <img src={f} alt="" />
              </button>
            ))}
          </div>
        )}

        <section className="block" style={{ marginTop: 0 }}>
          <div className="pricerow">
            <span className="bigprice">{rp(harga)}</span>
            {harga !== p.harga && <span className="strike">{rp(p.harga)}</span>}
            {p.bisaNego && <span className="nego">Bisa nego</span>}
          </div>
          <h1 className="ptitle">{p.judul}</h1>
          <div className="pills">
            <span className="pill k">Kondisi: {p.kondisi}</span>
            {p.usiaPakai && <span className="pill">{p.usiaPakai}</span>}
            <span className="pill">Stok {p.stok}</span>
            <span className="pill">{p.kategori}</span>
          </div>
          {tawaran && <TawaranBox tawaran={tawaran} />}
        </section>

        {p.deskripsi && (
          <section className="block">
            <h2>Deskripsi</h2>
            <p className="desc">{p.deskripsi}</p>
          </section>
        )}

        <section className="block">
          <div className="seller">
            <Avatar nama={p.penjualNama || '?'} />
            <div className="grow">
              <b>{p.penjualNama}</b>
              <div className="meta">{p.penjualProdi}{profilPenjual?.angkatan ? ` · ${profilPenjual.angkatan}` : ''}</div>
              <div className="verified"><Icon.Shield />Terverifikasi FISIP Unpas</div>
            </div>
            {profilPenjual && (
              <div style={{ textAlign: 'right' }}>
                <b>{profilPenjual.ratingJumlah ? (profilPenjual.ratingTotal / profilPenjual.ratingJumlah).toFixed(1).replace('.', ',') : 'Baru'}</b>
                <div className="meta">{profilPenjual.terjual ?? 0} terjual</div>
              </div>
            )}
          </div>
          <div className="note b" style={{ marginTop: 14 }}>
            <Icon.Pin /><span>COD di <b>{APP.titikTemu}</b>, atau antar ke kos {rp(APP.ongkirAntar)}.</span>
          </div>
        </section>
        <div style={{ height: 12 }} />
      </main>

      {milikSaya ? (
        <div className="actionbar"><Link className="btn dark grow" to="/lapak">Kelola di Lapak saya</Link></div>
      ) : (
        <div className="actionbar">
          <button className="btn sq waout" onClick={() => perluAkun(() => setSheet('wa'))} aria-label="Chat penjual di WhatsApp"><Icon.Wa /></button>
          {p.bisaNego && (
            <button className="btn ghost grow" onClick={() => perluAkun(() => setSheet('nego'))} disabled={habis || negoAktif}>Nego</button>
          )}
          <button className="btn primary grow" onClick={() => perluAkun(tambah)} disabled={habis}>
            {habis ? 'Tidak tersedia' : diKeranjang ? 'Lihat keranjang' : '+ Keranjang'}
          </button>
        </div>
      )}

      {sheet === 'nego' && <NegoSheet produk={p} namaPembeli={akun?.nama ?? ''} onClose={() => setSheet(null)} />}
      {sheet === 'wa' && (
        <WhatsAppSheet
          nama={p.penjualNama}
          nomor={profilPenjual?.whatsapp}
          pesanAwal={`Halo Kak ${(p.penjualNama || '').split(' ')[0]}, saya ${akun?.nama ?? ''} (${akun?.prodi ?? 'FISIP'}) dari Preloved Unpas. Saya tertarik dengan ${p.judul} (${rp(harga)}). Apakah masih tersedia? Bisa COD di ${APP.titikTemu}?`}
          catatan="Tetap aman: selesaikan pembayaran lewat checkout Preloved agar dilindungi rekber. Jangan transfer langsung ke rekening penjual."
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

function TawaranBox({ tawaran: o }) {
  if (o.status === 'menunggu')
    return <div className="offerbox wait" role="status">Tawaranmu <b>{rp(o.hargaTawar)}</b> sudah dikirim. Menunggu jawaban penjual.</div>;
  if (o.status === 'diterima')
    return <div className="offerbox ok" role="status"><b>Nego disetujui: {rp(o.hargaBalik ?? o.hargaTawar)}.</b> Harga ini otomatis dipakai di keranjang.</div>;
  if (o.status === 'harga_balik')
    return (
      <div className="offerbox counter" role="status">
        Penjual memberi harga balik <b>{rp(o.hargaBalik)}</b> untuk tawaranmu {rp(o.hargaTawar)}.
        <div className="btnrow" style={{ marginTop: 10 }}>
          <button className="btn sm dark" onClick={() => jawabHargaBalik(o.id, true)}>Terima {rp(o.hargaBalik)}</button>
          <button className="btn sm ghost" onClick={() => jawabHargaBalik(o.id, false)}>Tolak</button>
        </div>
      </div>
    );
  return <div className="offerbox no" role="status">Tawaran {rp(o.hargaTawar)} ditolak. Kamu bisa menawar lagi atau beli dengan harga normal.</div>;
}

function NegoSheet({ produk: p, namaPembeli, onClose }) {
  const toast = useToast();
  const saran = [0.82, 0.88, 0.94].map((f) => Math.round((p.harga * f) / 5000) * 5000).filter((v) => v > 0 && v < p.harga);
  const [nilai, setNilai] = useState(formatRibuan(saran[1] ?? ''));
  const [pesan, setPesan] = useState(`Boleh segini ya kak, aku ambil di ${APP.titikTemu}.`);
  const [error, setError] = useState('');
  const [proses, setProses] = useState(false);

  async function kirim() {
    setError('');
    setProses(true);
    try {
      await kirimTawaran(p, angka(nilai), pesan, namaPembeli);
      toast('Tawaran terkirim ke penjual');
      onClose();
    } catch (e) {
      setError(pesanError(e));
      setProses(false);
    }
  }

  return (
    <Sheet title="Ajukan tawaran" onClose={onClose}>
      <div className="item boxed">
        <div className="thumb" style={{ width: 52, height: 52 }}><ProductMedia produk={p} /></div>
        <div>
          <div className="iname">{p.judul}</div>
          <div className="meta">Harga penjual <b className="navy">{rp(p.harga)}</b></div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="tawar" className="flabel">Tawaranmu</label>
        <div className="money"><span>Rp</span><input id="tawar" inputMode="numeric" value={nilai} onChange={(e) => setNilai(formatRibuan(e.target.value))} /></div>
        {saran.length > 0 && <div className="quick">{saran.map((v) => <button key={v} onClick={() => setNilai(formatRibuan(v))}>{rp(v)}</button>)}</div>}
        {error && <p className="err">{error}</p>}
      </div>
      <label className="field">
        <span className="flabel">Pesan untuk penjual <span className="muted">(opsional)</span></span>
        <textarea rows={2} value={pesan} onChange={(e) => setPesan(e.target.value)} />
      </label>
      <div className="note b"><span>Penjual bisa menerima, menolak, atau memberi harga balik. Kalau disetujui, harga nego otomatis dipakai saat checkout.</span></div>
      <button className="btn primary" onClick={kirim} disabled={proses}>{proses ? 'Mengirim…' : 'Kirim tawaran'}</button>
    </Sheet>
  );
}
