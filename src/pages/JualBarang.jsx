import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { APP } from '../config';
import { useAuth } from '../services/auth';
import { usePengaturan, useProduk } from '../services/hooks';
import { pasangBarang, ubahBarang } from '../services/api';
import { netPenjual } from '../lib/harga';
import { rp, angka, formatRibuan } from '../lib/format';
import { kecilkanFoto } from '../lib/image';
import { pesanError } from '../lib/errors';
import AppBar from '../components/AppBar';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import Loading from '../components/Loading';
import NotFound from './NotFound';

// Dipakai untuk memasang barang baru (/lapak/jual) dan mengedit barang (/lapak/edit/:id)
export default function JualBarang() {
  const { id } = useParams();
  const edit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { akun, user } = useAuth();
  const lokasi = usePengaturan().data?.lokasiTitikTemu || APP.lokasiTitikTemu;
  const { data: lama, loading } = useProduk(id);
  // Foto: { jenis: 'lama', url, key } dari iklan yang sudah ada, atau { jenis: 'baru', blob, url } yang baru dipilih
  const [foto, setFoto] = useState([]);
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('Barang Kos');
  const [kondisi, setKondisi] = useState('Baik');
  const [harga, setHarga] = useState('');
  const [bisaNego, setBisaNego] = useState(true);
  const [stok, setStok] = useState(1);
  const [usiaPakai, setUsiaPakai] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [error, setError] = useState('');
  const [proses, setProses] = useState(false);

  // Isi formulir dengan data barang saat mode edit
  const terisi = useRef(false);
  useEffect(() => {
    if (!edit || !lama || terisi.current) return;
    terisi.current = true;
    setFoto((lama.foto ?? []).map((url, i) => ({ jenis: 'lama', url, key: lama.fotoPath?.[i] })));
    setJudul(lama.judul ?? '');
    setKategori(lama.kategori ?? 'Barang Kos');
    setKondisi(lama.kondisi ?? 'Baik');
    setHarga(formatRibuan(lama.harga ?? ''));
    setBisaNego(Boolean(lama.bisaNego));
    setStok(lama.stok ?? 1);
    setUsiaPakai(lama.usiaPakai ?? '');
    setDeskripsi(lama.deskripsi ?? '');
  }, [edit, lama]);

  // Bersihkan pratinjau foto baru saat halaman ditutup
  const fotoRef = useRef(foto);
  fotoRef.current = foto;
  useEffect(() => () => fotoRef.current.forEach((f) => f.jenis === 'baru' && URL.revokeObjectURL(f.url)), []);

  if (edit && loading) return <><AppBar title="Edit barang" fallback="/lapak" /><main className="scroll"><Loading /></main></>;
  if (edit && (!lama || lama.penjualId !== user?.uid)) return <NotFound judul="Barang tidak ditemukan" teks="Barang ini tidak ada atau bukan milikmu." />;

  async function tambahFoto(e) {
    const dipilih = [...e.target.files].slice(0, APP.maksFoto - foto.length);
    e.target.value = '';
    try {
      const kecil = await Promise.all(dipilih.map((f) => kecilkanFoto(f)));
      setFoto((f) => [...f, ...kecil.map((blob) => ({ jenis: 'baru', blob, url: URL.createObjectURL(blob) }))]);
    } catch {
      setError('Ada foto yang gagal dibaca. Coba foto lain.');
    }
  }

  function hapusFotoDiForm(i) {
    const f = foto[i];
    if (f.jenis === 'baru') URL.revokeObjectURL(f.url);
    setFoto(foto.filter((_, j) => j !== i));
  }

  async function kirim() {
    setError('');
    setProses(true);
    const data = { judul, kategori, kondisi, harga: angka(harga), bisaNego, stok, usiaPakai, deskripsi };
    try {
      if (edit) {
        const { perluModerasi } = await ubahBarang(lama, data, foto);
        toast(perluModerasi ? 'Perubahan disimpan, barang dicek ulang admin' : 'Perubahan disimpan');
      } else {
        await pasangBarang(data, foto.map((f) => f.blob), akun);
        toast('Iklan dikirim, menunggu moderasi admin');
      }
      navigate('/lapak?tab=iklan', { replace: true });
    } catch (e) {
      setError(pesanError(e));
      setProses(false);
    }
  }

  return (
    <>
      <AppBar title={edit ? 'Edit barang' : 'Jual barang'} fallback="/lapak" />
      <main className="scroll">
        <div className="wrap">
          <div className="card card-b stack">
            <div><span className="flabel">Foto barang</span><div className="meta">Maksimal {APP.maksFoto} foto. Foto pertama jadi sampul. Sertakan foto bagian yang minus.</div></div>
            <div className="photos">
              {foto.map((f, i) => (
                <div className="ph" key={f.url}>
                  <img src={f.url} alt={`Foto ${i + 1}`} />
                  {i === 0 && <span className="cover">Sampul</span>}
                  <button className="x" onClick={() => hapusFotoDiForm(i)} aria-label={`Hapus foto ${i + 1}`}>×</button>
                </div>
              ))}
              {foto.length < APP.maksFoto && (
                <label className="addph"><Icon.Camera />Tambah foto<input type="file" accept="image/*" multiple className="sr" onChange={tambahFoto} /></label>
              )}
            </div>
          </div>

          <div className="card card-b stack lg">
            <label className="field"><span className="flabel">Nama barang</span><input className="input" value={judul} onChange={(e) => setJudul(e.target.value)} maxLength={80} placeholder="Contoh: Dispenser galon bawah" /></label>
            <label className="field"><span className="flabel">Kategori</span>
              <select className="input" value={kategori} onChange={(e) => setKategori(e.target.value)}>{APP.kategori.map((k) => <option key={k}>{k}</option>)}</select>
            </label>
            <div className="field"><span className="flabel">Kondisi</span>
              <div className="seg" role="group" aria-label="Kondisi">{APP.kondisi.map((k) => <button key={k} aria-pressed={kondisi === k} onClick={() => setKondisi(k)}>{k}</button>)}</div>
            </div>
            <div className="field"><label htmlFor="harga" className="flabel">Harga</label>
              <div className="money small"><span>Rp</span><input id="harga" inputMode="numeric" value={harga} onChange={(e) => setHarga(formatRibuan(e.target.value))} placeholder="0" /></div>
            </div>
            <label className="switch">Pembeli boleh nego harga<input type="checkbox" checked={bisaNego} onChange={(e) => setBisaNego(e.target.checked)} /></label>
            <div className="two">
              <label className="field"><span className="flabel">Stok</span><input className="input" type="number" min="1" max="99" value={stok} onChange={(e) => setStok(e.target.value)} disabled={edit} /></label>
              <label className="field"><span className="flabel">Usia pakai</span><input className="input" value={usiaPakai} onChange={(e) => setUsiaPakai(e.target.value)} placeholder="Contoh: 1 tahun" /></label>
            </div>
            <label className="field"><span className="flabel">Deskripsi</span><textarea rows={4} maxLength={1000} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Ceritakan kondisi, ukuran, dan minusnya" /></label>
            <div className="note b"><Icon.Pin /><span>Serah terima di <b>{APP.titikTemu}</b>, {lokasi}.</span></div>
          </div>

          <div className="note b"><span>Gratis pasang iklan. Komisi {APP.komisi * 100}% dipotong hanya saat laku, jadi kamu terima <b>{rp(netPenjual(angka(harga)))}</b>.</span></div>
          {edit && (
            <div className="note b"><span>Mengubah harga atau opsi nego langsung berlaku. Mengubah foto, nama, kategori, kondisi, usia pakai, atau deskripsi membuat barang <b>dicek ulang admin</b> sebelum tayang lagi. Stok tidak bisa diubah karena berkurang otomatis saat ada pesanan.</span></div>
          )}
          {!edit && <div className="note y"><span><b>Sibuk?</b> Pakai titip jual: titipkan barangnya, tim kami yang memotret dan menjualkan, dengan bagi hasil 20%.</span></div>}
          {error && <p className="err">{error}</p>}
        </div>
      </main>
      <div className="actionbar">
        <button className="btn primary grow" onClick={kirim} disabled={proses}>{proses ? 'Menyimpan…' : edit ? 'Simpan perubahan' : 'Kirim untuk moderasi'}</button>
      </div>
    </>
  );
}
