import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { APP } from '../config';
import { daftar } from '../services/api';
import { pesanError } from '../lib/errors';
import AppBar from '../components/AppBar';
import { Icon } from '../components/Icons';

const TAHUN = new Date().getFullYear();

export default function Daftar() {
  const navigate = useNavigate();
  const [f, setF] = useState({ nama: '', npm: '', prodi: APP.prodi[0], angkatan: TAHUN, whatsapp: '', email: '', password: '' });
  const [ktm, setKtm] = useState(null);
  const [setuju, setSetuju] = useState(false);
  const [error, setError] = useState('');
  const [proses, setProses] = useState(false);
  const pratinjau = useMemo(() => (ktm ? URL.createObjectURL(ktm) : null), [ktm]);
  useEffect(() => () => pratinjau && URL.revokeObjectURL(pratinjau), [pratinjau]);
  const ubah = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function kirim(e) {
    e.preventDefault();
    setError('');
    if (!setuju) return setError('Centang persetujuan Syarat & Ketentuan dulu.');
    setProses(true);
    try {
      await daftar(f, ktm);
      navigate('/', { replace: true });
    } catch (err) {
      setError(pesanError(err));
      setProses(false);
    }
  }

  return (
    <>
      <AppBar title="Daftar akun" fallback="/masuk" />
      <main className="scroll">
        <form className="wrap" onSubmit={kirim}>
          <div className="note b"><Icon.Shield /><span>Preloved Unpas khusus mahasiswa <b>FISIP Kampus Lengkong</b>. Akun diverifikasi admin dari foto KTM sebelum bisa jual-beli.</span></div>
          <div className="card card-b stack lg">
            <label className="field"><span className="flabel">Nama lengkap</span><input className="input" required value={f.nama} onChange={ubah('nama')} autoComplete="name" /></label>
            <label className="field"><span className="flabel">NPM</span><input className="input" required value={f.npm} onChange={ubah('npm')} inputMode="numeric" /></label>
            <div className="two">
              <label className="field"><span className="flabel">Angkatan</span><input className="input" type="number" min="2015" max={TAHUN} required value={f.angkatan} onChange={ubah('angkatan')} /></label>
              <label className="field"><span className="flabel">Prodi</span><select className="input" value={f.prodi} onChange={ubah('prodi')}>{APP.prodi.map((p) => <option key={p}>{p}</option>)}</select></label>
            </div>
            <label className="field"><span className="flabel">Nomor WhatsApp</span><input className="input" required value={f.whatsapp} onChange={ubah('whatsapp')} inputMode="tel" placeholder="08xxxxxxxxxx" /><span className="meta">Hanya terlihat oleh mahasiswa terverifikasi yang bertransaksi denganmu.</span></label>
            <label className="field"><span className="flabel">Email</span><input className="input" type="email" required value={f.email} onChange={ubah('email')} autoComplete="email" /></label>
            <label className="field"><span className="flabel">Password</span><input className="input" type="password" minLength={6} required value={f.password} onChange={ubah('password')} autoComplete="new-password" /></label>
          </div>
          <div className="card card-b stack">
            <span className="flabel">Foto KTM</span>
            <span className="meta">Pastikan nama, NPM, dan fakultas terbaca. Foto dihapus setelah diverifikasi.</span>
            {pratinjau && <img className="ktm-preview" src={pratinjau} alt="Pratinjau KTM" />}
            <label className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
              <Icon.Camera />{ktm ? 'Ganti foto' : 'Pilih foto KTM'}
              <input type="file" accept="image/*" className="sr" onChange={(e) => setKtm(e.target.files[0] ?? null)} />
            </label>
          </div>
          <label className="switch" style={{ fontWeight: 500 }}>
            <span>Saya setuju dengan Syarat &amp; Ketentuan dan Kebijakan Privasi Preloved Unpas.</span>
            <input type="checkbox" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} />
          </label>
          {error && <p className="err">{error}</p>}
          <button className="btn primary" type="submit" disabled={proses}>{proses ? 'Mendaftarkan…' : 'Daftar'}</button>
          <p className="meta center">Sudah punya akun? <Link to="/masuk">Masuk</Link></p>
        </form>
      </main>
    </>
  );
}
