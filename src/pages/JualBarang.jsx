import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP } from '../config';
import { useAuth } from '../services/auth';
import { usePengaturan } from '../services/hooks';
import { pasangBarang } from '../services/api';
import { netPenjual } from '../lib/harga';
import { rp, angka, formatRibuan } from '../lib/format';
import { kecilkanFoto } from '../lib/image';
import { pesanError } from '../lib/errors';
import AppBar from '../components/AppBar';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';

export default function JualBarang() {
  const navigate = useNavigate();
  const toast = useToast();
  const { akun } = useAuth();
  const lokasi = usePengaturan().data?.lokasiTitikTemu || APP.lokasiTitikTemu;
  const [files, setFiles] = useState([]);
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

  const pratinjau = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => pratinjau.forEach((u) => URL.revokeObjectURL(u)), [pratinjau]);

  async function tambahFoto(e) {
    const dipilih = [...e.target.files].slice(0, APP.maksFoto - files.length);
    e.target.value = '';
    try {
      const kecil = await Promise.all(dipilih.map((f) => kecilkanFoto(f)));
      setFiles((f) => [...f, ...kecil]);
    } catch {
      setError('Ada foto yang gagal dibaca. Coba foto lain.');
    }
  }

  async function kirim() {
    setError('');
    setProses(true);
    try {
      await pasangBarang({ judul, kategori, kondisi, harga: angka(harga), bisaNego, stok, usiaPakai, deskripsi }, files, akun);
      toast('Iklan dikirim, menunggu moderasi admin');
      navigate('/lapak?tab=iklan', { replace: true });
    } catch (e) {
      setError(pesanError(e));
      setProses(false);
    }
  }

  return (
    <>
      <AppBar title="Jual barang" fallback="/lapak" />
      <main className="scroll">
        <div className="wrap">
          <div className="card card-b stack">
            <div><span className="flabel">Foto barang</span><div className="meta">Maksimal {APP.maksFoto} foto. Foto pertama jadi sampul. Sertakan foto bagian yang minus.</div></div>
            <div className="photos">
              {pratinjau.map((src, i) => (
                <div className="ph" key={src}>
                  <img src={src} alt={`Foto ${i + 1}`} />
                  {i === 0 && <span className="cover">Sampul</span>}
                  <button className="x" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Hapus foto ${i + 1}`}>×</button>
                </div>
              ))}
              {files.length < APP.maksFoto && (
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
              <label className="field"><span className="flabel">Stok</span><input className="input" type="number" min="1" max="99" value={stok} onChange={(e) => setStok(e.target.value)} /></label>
              <label className="field"><span className="flabel">Usia pakai</span><input className="input" value={usiaPakai} onChange={(e) => setUsiaPakai(e.target.value)} placeholder="Contoh: 1 tahun" /></label>
            </div>
            <label className="field"><span className="flabel">Deskripsi</span><textarea rows={4} maxLength={1000} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Ceritakan kondisi, ukuran, dan minusnya" /></label>
            <div className="note b"><Icon.Pin /><span>Serah terima di <b>{APP.titikTemu}</b>, {lokasi}.</span></div>
          </div>

          <div className="note b"><span>Gratis pasang iklan. Komisi {APP.komisi * 100}% dipotong hanya saat laku, jadi kamu terima <b>{rp(netPenjual(angka(harga)))}</b>.</span></div>
          <div className="note y"><span><b>Sibuk?</b> Pakai titip jual: titipkan barangnya, tim kami yang memotret dan menjualkan, dengan bagi hasil 20%.</span></div>
          {error && <p className="err">{error}</p>}
        </div>
      </main>
      <div className="actionbar">
        <button className="btn primary grow" onClick={kirim} disabled={proses}>{proses ? 'Mengunggah…' : 'Kirim untuk moderasi'}</button>
      </div>
    </>
  );
}
