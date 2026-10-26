import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { masuk, lupaPassword } from '../services/api';
import { pesanError } from '../lib/errors';
import AppBar from '../components/AppBar';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';

export default function Masuk() {
  const { user } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [proses, setProses] = useState(false);

  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  async function kirim(e) {
    e.preventDefault();
    setError('');
    setProses(true);
    try {
      await masuk(email, password);
    } catch (err) {
      setError(pesanError(err));
      setProses(false);
    }
  }

  async function lupa() {
    if (!email) return setError('Isi email dulu, lalu tekan “Lupa password”.');
    try {
      await lupaPassword(email);
      toast('Link reset password sudah dikirim ke email');
    } catch (err) {
      setError(pesanError(err));
    }
  }

  return (
    <>
      <AppBar title="Masuk" />
      <main className="scroll">
        <form className="wrap" onSubmit={kirim}>
          <div className="brand-hero"><Icon.Logo /><div><b>RE:LOOP</b><span className="meta">Khusus mahasiswa FISIP Kampus Lengkong</span></div></div>
          <div className="card card-b stack lg">
            <label className="field"><span className="flabel">Email</span><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="field"><span className="flabel">Password</span><input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            {error && <p className="err">{error}</p>}
            <button className="btn primary" type="submit" disabled={proses}>{proses ? 'Masuk…' : 'Masuk'}</button>
            <button className="link center-self" type="button" onClick={lupa}>Lupa password</button>
          </div>
          <p className="meta center">Belum punya akun? <Link to="/daftar" state={location.state}>Daftar sebagai mahasiswa FISIP</Link></p>
        </form>
      </main>
    </>
  );
}
