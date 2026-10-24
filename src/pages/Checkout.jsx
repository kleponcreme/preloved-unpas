import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { APP, pilihanHari } from '../config';
import { useAuth } from '../services/auth';
import { useKeranjang, useTawaranSaya, usePengaturan } from '../services/hooks';
import { buatPesanan } from '../services/api';
import { hargaEfektif } from '../lib/harga';
import { rp } from '../lib/format';
import AppBar from '../components/AppBar';
import Loading from '../components/Loading';
import ProductMedia from '../components/ProductMedia';

const HARI = pilihanHari();

export default function Checkout() {
  const navigate = useNavigate();
  const { akun } = useAuth();
  const { items, loading } = useKeranjang();
  const tawaranSaya = useTawaranSaya().data;
  const [caraTerima, setCaraTerima] = useState('cod');
  const [hariIdx, setHariIdx] = useState(1);
  const [jam, setJam] = useState(APP.jamTemu[1]);
  const [catatan, setCatatan] = useState('');
  const [metodeBayar, setMetodeBayar] = useState('qris');
  const lokasi = usePengaturan().data?.lokasiTitikTemu || APP.lokasiTitikTemu;
  const [error, setError] = useState('');
  const [proses, setProses] = useState(false);

  const dipilih = items.filter((i) => i.dipilih && i.produk && i.produk.status === 'tayang' && i.produk.stok > 0);
  const jumlahPenjual = new Set(dipilih.map((i) => i.produk.penjualId)).size;
  const subtotal = dipilih.reduce((t, i) => t + hargaEfektif(i.produk, tawaranSaya), 0);
  const ongkir = caraTerima === 'antar' ? APP.ongkirAntar * jumlahPenjual : 0;
  const qris = metodeBayar === 'qris';
  const promo = !qris || akun?.promoDipakai ? 0 : Math.min(APP.promoPembeliPertama, subtotal + ongkir);
  const layanan = qris ? APP.biayaLayanan : 0;
  const total = subtotal + ongkir + layanan - promo;

  if (loading) return <><AppBar title="Checkout" fallback="/keranjang" /><main className="scroll"><Loading /></main></>;
  if (!dipilih.length && !proses) return <Navigate to="/keranjang" replace />;

  async function bayar() {
    setError('');
    setProses(true);
    try {
      const r = await buatPesanan({ productIds: dipilih.map((i) => i.productId), caraTerima, catatan, metodeBayar, jadwal: { ...HARI[hariIdx], jam } });
      if (r.paymentId) navigate(`/bayar/${r.paymentId}`, { replace: true });
      else navigate(r.orderIds.length === 1 ? `/pesanan/${r.orderIds[0]}` : '/pesanan', { replace: true });
    } catch (e) {
      setError(e.message);
      setProses(false);
    }
  }

  return (
    <>
      <AppBar title="Checkout" fallback="/keranjang" />
      <main className="scroll">
        <div className="wrap">
          <fieldset className="card card-b">
            <legend>Cara terima barang</legend>
            <Opsi name="terima" value="cod" pilih={caraTerima} set={setCaraTerima} judul={`COD di ${APP.titikTemu}`} sub={`${lokasi}. Cek barang langsung sebelum diterima`} kanan={<span className="green">Gratis</span>} />
            <Opsi name="terima" value="antar" pilih={caraTerima} set={setCaraTerima} judul="Antar ke kos" sub="Kos di sekitar Kampus Lengkong" kanan={`+${rp(APP.ongkirAntar)}`} />
          </fieldset>

          <div className="card card-b stack">
            <span className="ctitle">Jadwal ketemu</span>
            <div className="seg" role="group" aria-label="Hari">
              {HARI.map((h, i) => <button key={h.tanggal} aria-pressed={hariIdx === i} onClick={() => setHariIdx(i)}><small>{h.hari}</small>{h.tanggal}</button>)}
            </div>
            <div className="seg" role="group" aria-label="Jam">
              {APP.jamTemu.map((j) => <button key={j} aria-pressed={jam === j} onClick={() => setJam(j)}>{j}</button>)}
            </div>
            <span className="meta">Jadwal dikirim ke penjual untuk dikonfirmasi.</span>
          </div>

          <div className="card card-b stack">
            <span className="ctitle">Pesanan</span>
            {dipilih.map(({ produk: p }) => (
              <div className="item center" key={p.id}>
                <div className="thumb" style={{ width: 52, height: 52 }}><ProductMedia produk={p} /></div>
                <div className="istack"><span className="iname">{p.judul}</span><span className="meta">{p.penjualNama}{hargaEfektif(p, tawaranSaya) !== p.harga ? ' · harga nego' : ''}</span></div>
                <b>{rp(hargaEfektif(p, tawaranSaya))}</b>
              </div>
            ))}
            <label className="field">
              <span className="flabel small">Catatan untuk penjual</span>
              <textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: saya pakai jaket kuning, tunggu di depan" />
            </label>
          </div>

          <fieldset className="card card-b">
            <legend>Metode pembayaran</legend>
            <label className="opt">
              <input type="radio" name="bayar" value="qris" checked={qris} onChange={() => setMetodeBayar('qris')} />
              <span className="t">
                <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>QRIS <span className="rekber">REKBER</span></b>
                <span>Bayar ke QRIS admin Preloved Unpas. Dana ditahan sampai barang diterima.</span>
              </span>
            </label>
            <label className="opt">
              <input type="radio" name="bayar" value="cod" checked={!qris} onChange={() => setMetodeBayar('cod')} />
              <span className="t">
                <b>Tunai saat COD</b>
                <span>Bayar langsung ke penjual di Titik Temu, tanpa perlindungan rekber. Promo tidak berlaku.</span>
              </span>
            </label>
          </fieldset>

          <div className="card card-b">
            <span className="ctitle" style={{ display: 'block', marginBottom: 6 }}>Ringkasan</span>
            <div className="sum"><span>Subtotal ({dipilih.length} barang)</span><span>{rp(subtotal)}</span></div>
            <div className="sum"><span>Biaya antar</span><span>{ongkir ? rp(ongkir) : <span className="green">Gratis</span>}</span></div>
            <div className="sum"><span>Biaya layanan</span><span>{layanan ? rp(layanan) : <span className="green">Gratis</span>}</span></div>
            {promo > 0 && <div className="sum"><span>Promo Pembeli Pertama</span><span className="green">−{rp(promo)}</span></div>}
            <div className="sum total"><span>Total bayar</span><span className="navy">{rp(total)}</span></div>
            {qris
              ? <span className="meta">Ditambah kode unik 3 digit di halaman pembayaran supaya pembayaranmu mudah dikenali admin.</span>
              : <span className="meta">Siapkan uang tunai dan cek kondisi barang sebelum membayar.</span>}
          </div>
          {error && <p className="err">{error}</p>}
        </div>
      </main>
      <div className="actionbar">
        <div className="totalbox"><small>Total bayar</small><b>{rp(total)}</b></div>
        <button className="btn primary" onClick={bayar} disabled={proses}>{proses ? 'Memproses…' : qris ? 'Bayar dengan QRIS' : 'Buat pesanan'}</button>
      </div>
    </>
  );
}

function Opsi({ name, value, pilih, set, judul, sub, kanan }) {
  return (
    <label className="opt">
      <input type="radio" name={name} value={value} checked={pilih === value} onChange={() => set(value)} />
      <span className="t"><b>{judul}</b><span>{sub}</span></span>
      {kanan && <span className="p">{kanan}</span>}
    </label>
  );
}
