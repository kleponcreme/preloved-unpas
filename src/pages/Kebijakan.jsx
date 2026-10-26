// Halaman Syarat & Ketentuan dan Kebijakan Privasi. Teksnya ada di src/data/legal.json
import { Link } from 'react-router-dom';
import legal from '../data/legal.json';
import AppBar from '../components/AppBar';

function Halaman({ judul, bagian, lain }) {
  return (
    <>
      <AppBar title={judul} fallback="/" />
      <main className="scroll">
        <div className="wrap">
          <div className="card card-b stack legal">
            <h1>{judul}</h1>
            <p className="meta">Berlaku sejak {legal.berlaku}.</p>
            {bagian.map((b) => (
              <section key={b.judul}>
                <h2>{b.judul}</h2>
                {b.isi.length === 1 ? <p>{b.isi[0]}</p> : <ul>{b.isi.map((p) => <li key={p.slice(0, 40)}>{p}</li>)}</ul>}
              </section>
            ))}
            <Link className="link" to={lain.to}>Baca juga {lain.label}</Link>
          </div>
        </div>
      </main>
    </>
  );
}

export const SyaratKetentuan = () => <Halaman judul="Syarat & Ketentuan" bagian={legal.syarat} lain={{ to: '/privasi', label: 'Kebijakan Privasi' }} />;
export const KebijakanPrivasi = () => <Halaman judul="Kebijakan Privasi" bagian={legal.privasi} lain={{ to: '/syarat', label: 'Syarat & Ketentuan' }} />;
