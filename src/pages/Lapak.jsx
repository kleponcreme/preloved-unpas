import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { APP } from '../config';
import { useAuth } from '../services/auth';
import { useIklanSaya, useTawaranMasuk, usePenjualanSaya, useProfil, usePengaturan } from '../services/hooks';
import { jawabTawaran, beriHargaBalik, hapusIklan, keluar, ubahPesanan, mintaPencairan, simpanRekening } from '../services/api';
import { netPenjual } from '../lib/harga';
import { rp, angka, formatRibuan } from '../lib/format';
import { pesanError } from '../lib/errors';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import ProductMedia from '../components/ProductMedia';
import Avatar from '../components/Avatar';
import Sheet from '../components/Sheet';
import WhatsAppSheet from '../components/WhatsAppSheet';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { bunyi, bunyiAktif, aturBunyi } from '../lib/bunyi';

const STATUS_IKLAN = { tayang: ['Tayang', 'done'], moderasi: ['Menunggu moderasi', 'wait'], terjual: ['Terjual', ''], ditolak: ['Ditolak admin', ''], disembunyikan: ['Disembunyikan (utang komisi)', ''] };

export default function Lapak() {
  const { akun, admin } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'iklan';
  const [counter, setCounter] = useState(null);
  const [rekening, setRekening] = useState(false);
  const [chat, setChat] = useState(null);
  const [suara, setSuara] = useState(bunyiAktif());
  const [lihatQris, setLihatQris] = useState(false);
  const atur = usePengaturan().data;

  const iklan = useIklanSaya();
  const tawaran = useTawaranMasuk();
  const penjualan = usePenjualanSaya();

  const ditahan = penjualan.data.filter((o) => o.status === 'dana_ditahan').reduce((t, o) => t + o.subtotal + o.ongkir, 0);
  const siap = penjualan.data.filter((o) => o.status === 'selesai' && o.metodeBayar !== 'cod' && o.pencairan === 'belum').reduce((t, o) => t + netPenjual(o.subtotal) + o.ongkir, 0);
  const komisiCod = penjualan.data.filter((o) => o.status === 'selesai' && o.metodeBayar === 'cod' && !o.komisiLunas).reduce((t, o) => t + (o.komisi || 0), 0);
  const tayang = iklan.data.filter((p) => p.status === 'tayang').length;
  const nTawaran = tawaran.data.filter((o) => o.status === 'menunggu').length;
  const nPesanan = penjualan.data.filter((o) => ['dana_ditahan', 'cod'].includes(o.status) && !o.jadwalDikonfirmasi).length;
  const rek = akun?.rekening;

  async function jalankan(fn, pesan) {
    try {
      await fn();
      if (pesan) toast(pesan);
    } catch (e) {
      toast(pesanError(e));
    }
  }

  function cairkan() {
    if (!rek?.nomor) return setRekening(true);
    return jalankan(mintaPencairan, 'Pencairan diproses admin, maksimal 1x24 jam');
  }

  const pindahTab = (t) => setParams({ tab: t }, { replace: true });

  return (
    <>
      <AppBar title="Lapak saya" back={false} right={<Link to="/lapak/jual" className="btn sm primary" style={{ marginRight: 8 }}>+ Jual barang</Link>} />
      <main className="scroll">
        <div className="stats">
          <div className="stat"><small>Dana ditahan</small><b>{rp(ditahan)}</b></div>
          <div className="stat"><small>Siap dicairkan</small><b>{rp(siap)}</b></div>
          <div className="stat"><small>Iklan tayang</small><b>{tayang}</b></div>
        </div>
        {siap > 0 && (
          <div className="pad">
            <div className="note g center">
              <span className="grow">Cairkan <b>{rp(siap)}</b> ke {rek?.nomor ? `${rek.bank} · ${rek.nomor}` : 'rekening/e-wallet kamu'}</span>
              <button className="btn sm dark" onClick={cairkan}>Cairkan</button>
            </div>
          </div>
        )}

        {akun?.ditangguhkan && (
          <div className="pad">
            <div className="note no stackish">
              <span><b>Lapakmu ditangguhkan.</b> Utang komisi COD {rp(akun.utangKomisi || komisiCod)} melewati batas {rp(APP.batasUtangKomisi)} atau lebih dari {APP.batasHariUtang} hari. Semua barangmu disembunyikan dari katalog dan kamu belum bisa memasang barang baru. Setor komisi ke QRIS admin; setelah admin menandai lunas, barangmu otomatis tayang lagi.</span>
              <button className="link" onClick={() => setLihatQris(!lihatQris)}>{lihatQris ? 'Tutup QRIS admin' : 'Lihat QRIS admin'}</button>
              {lihatQris && <img src={atur?.qrisUrl || APP.qrisGambar} alt="QRIS admin RE:LOOP" width="200" style={{ height: 'auto', alignSelf: 'center', borderRadius: 8 }} />}
            </div>
          </div>
        )}
        {!akun?.ditangguhkan && komisiCod > 0 && (
          <div className="pad">
            <div className="note y"><span>Setor komisi COD <b>{rp(komisiCod)}</b> ke QRIS admin (sama dengan QRIS pembayaran). Admin akan menandainya lunas. Kalau utang mencapai {rp(APP.batasUtangKomisi)} atau lebih dari {APP.batasHariUtang} hari, lapakmu ditangguhkan.</span></div>
          </div>
        )}

        <div className="segtabs" role="group" aria-label="Bagian lapak">
          <button aria-pressed={tab === 'iklan'} onClick={() => pindahTab('iklan')}>Iklan ({iklan.data.length})</button>
          <button aria-pressed={tab === 'tawaran'} onClick={() => pindahTab('tawaran')}>Tawaran{nTawaran ? ` (${nTawaran})` : ''}</button>
          <button aria-pressed={tab === 'pesanan'} onClick={() => pindahTab('pesanan')}>Pesanan{nPesanan ? ` (${nPesanan})` : ''}</button>
        </div>

        <div className="wrap">
          {tab === 'iklan' && (iklan.loading ? <Loading /> : iklan.data.length ? iklan.data.map((p) => {
            const [label, cls] = STATUS_IKLAN[p.status] ?? [p.status, ''];
            return (
              <div className="card" key={p.id}>
                <div className="card-b item">
                  <Link to={`/produk/${p.id}`} className="thumb" aria-label={`Lihat ${p.judul}`}><ProductMedia produk={p} /></Link>
                  <div className="istack">
                    <span className="chiprow"><span className={`status ${cls}`}>{label}</span></span>
                    <span className="iname">{p.judul}</span>
                    <b className="navy">{rp(p.harga)}</b>
                    <span className="meta">{p.status === 'moderasi' ? 'Dicek admin, biasanya kurang dari 1x24 jam' : `Stok ${p.stok}`}</span>
                    {['moderasi', 'tayang', 'ditolak'].includes(p.status) && (
                      <div className="btnrow-inline" style={{ justifyContent: 'flex-start' }}>
                        <Link className="link" to={`/lapak/edit/${p.id}`}>Edit barang</Link>
                        <button className="link red" onClick={() => window.confirm(`Hapus iklan “${p.judul}”?\n\nKalau barang ini sedang ada di keranjang orang atau tawarannya sudah kamu setujui, penghapusan akan dicatat dan bisa membuat akunmu ditandai.`) && jalankan(async () => { const r = await hapusIklan(p); toast(r?.diminati ? 'Iklan dihapus. Barang ini sedang diminati, jadi penghapusan dicatat.' : 'Iklan dihapus'); })}>Hapus iklan</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : <EmptyState judul="Belum ada iklan" teks="Pasang barang pertamamu, gratis."><Link to="/lapak/jual" className="btn dark" style={{ marginTop: 12 }}>+ Jual barang</Link></EmptyState>)}

          {tab === 'tawaran' && (tawaran.loading ? <Loading /> : tawaran.data.length ? tawaran.data.map((o) => (
            <div className="card" key={o.id}>
              <div className="card-h">
                <Avatar nama={o.pembeliNama || '?'} size={34} />
                <div className="grow"><b className="small">{o.pembeliNama}</b><div className="verified"><Icon.Shield />Mahasiswa FISIP terverifikasi</div></div>
              </div>
              <div className="card-b stack">
                <div className="item center">
                  <div className="thumb" style={{ width: 52, height: 52 }}><ProductMedia foto={o.foto} /></div>
                  <div className="istack"><span className="iname">{o.judul}</span><span className="meta">Harga kamu {rp(o.hargaAwal)}</span></div>
                </div>
                <div>Menawar <b className="navy big">{rp(o.hargaTawar)}</b> <span className="meta">(−{Math.round((1 - o.hargaTawar / o.hargaAwal) * 100)}%)</span></div>
                {o.pesan && <p className="quote">“{o.pesan}”</p>}
                {o.status === 'menunggu' && (
                  <div className="btnrow">
                    <button className="btn sm dark" onClick={() => jalankan(() => jawabTawaran(o.id, 'diterima'), `Tawaran ${rp(o.hargaTawar)} diterima`)}>Terima</button>
                    <button className="btn sm ghost" onClick={() => setCounter(o)}>Harga balik</button>
                    <button className="btn sm ghost danger" onClick={() => jalankan(() => jawabTawaran(o.id, 'ditolak'), 'Tawaran ditolak')}>Tolak</button>
                  </div>
                )}
                {o.status === 'diterima' && <div className="note g"><Icon.Check /><span>Disepakati <b>{rp(o.hargaBalik ?? o.hargaTawar)}</b>. Menunggu {o.pembeliNama} checkout.</span></div>}
                {o.status === 'harga_balik' && <div className="note y"><span>Harga balik <b>{rp(o.hargaBalik)}</b> terkirim. Menunggu jawaban {o.pembeliNama}…</span></div>}
                {o.status === 'ditolak' && <div className="note grey"><span>Tawaran ditolak.</span></div>}
              </div>
            </div>
          )) : <EmptyState judul="Belum ada tawaran" teks="Tawaran dari pembeli akan muncul di sini." />)}

          {tab === 'pesanan' && (penjualan.loading ? <Loading /> : penjualan.data.length ? penjualan.data.map((o) => {
            const waktu = `${o.jadwal.hari}, ${o.jadwal.tanggal} · ${o.jadwal.jam}`;
            const tempat = o.caraTerima === 'cod' ? APP.titikTemu : 'Antar ke kos pembeli';
            const [label, cls] =
              o.status === 'menunggu_bayar' ? ['Menunggu bayar', ''] :
              ['dana_ditahan', 'cod'].includes(o.status) ? [o.jadwalDikonfirmasi ? (o.status === 'cod' ? 'COD · siap diserahkan' : 'Siap diserahkan') : 'Perlu konfirmasi', 'wait'] :
              o.status === 'selesai' && o.metodeBayar === 'cod' ? [o.komisiLunas ? 'Selesai' : 'Komisi belum disetor', o.komisiLunas ? 'done' : 'wait'] :
              o.status === 'batal' ? ['Dibatalkan', ''] :
              o.pencairan === 'dibayar' ? ['Dana dicairkan', 'done'] : o.pencairan === 'diminta' ? ['Pencairan diproses', 'hold'] : ['Siap dicairkan', 'done'];
            return (
              <div className="card" key={o.id}>
                <div className="card-h"><Link to={`/pesanan/${o.id}`} className="small grow plainlink"><b>{o.kode}</b></Link><span className={`status ${cls}`}>{label}</span></div>
                <div className="card-b stack">
                  {o.items.map((it) => (
                    <div className="item center" key={it.productId}>
                      <div className="thumb" style={{ width: 52, height: 52 }}><ProductMedia foto={it.foto} /></div>
                      <div className="istack"><span className="iname">{it.judul}</span><span className="meta">Pembeli {o.pembeliNama}</span></div>
                      <b>{rp(it.harga)}</b>
                    </div>
                  ))}
                  <div className="note b"><Icon.Pin /><span>{o.caraTerima === 'cod' ? <>COD di <b>{tempat}</b></> : <b>{tempat}</b>}, {waktu}</span></div>
                  {o.status === 'menunggu_bayar' && <span className="meta">Menunggu pembeli membayar ke QRIS admin.</span>}
                  {['dana_ditahan', 'cod'].includes(o.status) && !o.jadwalDikonfirmasi && (
                    <>
                      {o.status === 'cod'
                        ? <div className="note y"><span>COD: pembeli membayar <b>{rp(o.subtotal + o.ongkir)}</b> tunai saat bertemu.</span></div>
                        : <div className="note g"><Icon.Shield /><span>Pembeli sudah membayar {rp(o.subtotal + o.ongkir)}. Dana ditahan admin sampai barang diterima.</span></div>}
                      <div className="btnrow">
                        <button className="btn sm dark" onClick={() => jalankan(() => ubahPesanan(o.id, 'konfirmasi'), 'Jadwal dikonfirmasi, pembeli sudah diberi tahu')}>Konfirmasi jadwal</button>
                        <button className="btn sm waout" onClick={() => setChat({ o, tempat, waktu })}><Icon.Wa />Chat pembeli</button>
                      </div>
                    </>
                  )}
                  {['dana_ditahan', 'cod'].includes(o.status) && o.jadwalDikonfirmasi && <span className="meta">{o.status === 'cod' ? 'Bawa barang ke Titik Temu sesuai jadwal dan terima pembayaran tunai.' : 'Bawa barang ke Titik Temu sesuai jadwal. Dana cair setelah pembeli menekan “Barang sudah diterima”.'}</span>}
                  {o.status === 'selesai' && (
                    <div>
                      <div className="sum"><span>Harga barang</span><span>{rp(o.subtotal)}</span></div>
                      <div className="sum"><span>Komisi RE:LOOP {APP.komisi * 100}%</span><span>−{rp(o.komisi)}</span></div>
                      <div className="sum total"><span>Kamu terima</span><span className="navy">{rp(netPenjual(o.subtotal) + o.ongkir)}</span></div>
                    </div>
                  )}
                </div>
              </div>
            );
          }) : <EmptyState judul="Belum ada pesanan" teks="Pesanan muncul setelah pembeli checkout barangmu." />)}

          <div className="btnrow-inline center-self">
            <button className="link" onClick={() => setRekening(true)}>Rekening pencairan</button>
            <button className="link" onClick={() => { const n = !suara; aturBunyi(n); setSuara(n); if (n) bunyi(); toast(n ? 'Bunyi notifikasi dinyalakan' : 'Bunyi notifikasi dimatikan'); }}>Bunyi: {suara ? 'Nyala' : 'Mati'}</button>
            {admin && <Link className="link" to="/admin">Halaman admin</Link>}
            <Link className="link muted" to="/syarat">Syarat &amp; Ketentuan</Link>
            <Link className="link muted" to="/privasi">Kebijakan Privasi</Link>
            <button className="link muted" onClick={keluar}>Keluar</button>
          </div>
        </div>
      </main>
      <TabBar />

      {counter && <CounterSheet tawaran={counter} onClose={() => setCounter(null)} />}
      {rekening && <RekeningSheet awal={rek} onClose={() => setRekening(false)} />}
      {chat && <ChatPembeli {...chat} onClose={() => setChat(null)} />}
    </>
  );
}

function ChatPembeli({ o, tempat, waktu, onClose }) {
  const profil = useProfil(o.pembeliId).data;
  return (
    <WhatsAppSheet
      nama={o.pembeliNama}
      nomor={o.pembeliWa || profil?.whatsapp}
      pesanAwal={`Halo ${o.pembeliNama.split(' ')[0]}, saya penjual dari RE:LOOP (pesanan ${o.kode}). Kita ketemu di ${tempat}, ${waktu} ya.`}
      onClose={onClose}
    />
  );
}

function CounterSheet({ tawaran: o, onClose }) {
  const toast = useToast();
  const [nilai, setNilai] = useState(formatRibuan(Math.round((o.hargaTawar + o.hargaAwal) / 2 / 5000) * 5000));
  const [error, setError] = useState('');
  async function kirim() {
    try {
      await beriHargaBalik(o, angka(nilai));
      toast('Harga balik terkirim');
      onClose();
    } catch (e) {
      setError(pesanError(e));
    }
  }
  return (
    <Sheet title="Beri harga balik" onClose={onClose}>
      <p className="meta big">{o.pembeliNama} menawar <b className="navy">{rp(o.hargaTawar)}</b> untuk {o.judul} (harga kamu {rp(o.hargaAwal)}).</p>
      <div className="field">
        <label htmlFor="balik" className="flabel">Harga balikmu</label>
        <div className="money"><span>Rp</span><input id="balik" inputMode="numeric" value={nilai} onChange={(e) => setNilai(formatRibuan(e.target.value))} /></div>
        {error && <p className="err">{error}</p>}
      </div>
      <button className="btn primary" onClick={kirim}>Kirim harga balik</button>
    </Sheet>
  );
}

function RekeningSheet({ awal, onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ bank: awal?.bank ?? '', nomor: awal?.nomor ?? '', nama: awal?.nama ?? '' });
  const [error, setError] = useState('');
  async function simpan() {
    if (!f.bank.trim() || !f.nomor.trim() || !f.nama.trim()) return setError('Lengkapi semua kolom.');
    try {
      await simpanRekening({ bank: f.bank.trim(), nomor: f.nomor.trim(), nama: f.nama.trim() });
      toast('Rekening pencairan disimpan');
      onClose();
    } catch (e) {
      setError(pesanError(e));
    }
  }
  return (
    <Sheet title="Rekening pencairan" onClose={onClose}>
      <span className="meta">Dana penjualan dikirim admin ke rekening atau e-wallet ini. Hanya kamu dan admin yang bisa melihatnya.</span>
      <label className="field"><span className="flabel">Bank atau e-wallet</span><input className="input" value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })} placeholder="Contoh: BCA, DANA, GoPay" /></label>
      <label className="field"><span className="flabel">Nomor rekening / HP</span><input className="input" inputMode="numeric" value={f.nomor} onChange={(e) => setF({ ...f, nomor: e.target.value })} /></label>
      <label className="field"><span className="flabel">Atas nama</span><input className="input" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} /></label>
      {error && <p className="err">{error}</p>}
      <button className="btn primary" onClick={simpan}>Simpan</button>
    </Sheet>
  );
}
