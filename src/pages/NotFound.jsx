import { Link } from 'react-router-dom';
import AppBar from '../components/AppBar';
import EmptyState from '../components/EmptyState';

export default function NotFound({ judul = 'Halaman tidak ditemukan', teks = 'Barang atau pesanan ini mungkin sudah dihapus atau terjual.' }) {
  return (
    <>
      <AppBar title="Tidak ditemukan" />
      <main className="scroll">
        <EmptyState judul={judul} teks={teks}>
          <Link to="/" className="btn dark" style={{ marginTop: 12 }}>Ke beranda</Link>
        </EmptyState>
      </main>
    </>
  );
}
