import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { keluar } from '../services/api';
import AppBar from './AppBar';
import Loading from './Loading';
import EmptyState from './EmptyState';

// Pembungkus halaman yang butuh login.
// verified = true: hanya untuk akun yang sudah disetujui admin.
// admin = true: hanya untuk admin.
export default function Wajib({ children, verified = true, admin = false }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) return <><AppBar title="" back={false} /><main className="scroll"><Loading /></main></>;
  if (!auth.user) return <Navigate to="/masuk" state={{ from: location }} replace />;
  if (admin && !auth.admin) return <Navigate to="/" replace />;
  if (verified && !auth.terverifikasi && !auth.admin) return <MenungguVerifikasi />;
  return children;
}

export function MenungguVerifikasi() {
  const { akun } = useAuth();
  const ditolak = akun?.statusVerifikasi === 'ditolak';
  return (
    <>
      <AppBar title="Verifikasi akun" fallback="/" />
      <main className="scroll">
        <EmptyState
          judul={ditolak ? 'Verifikasi ditolak' : akun ? 'Akunmu sedang diverifikasi' : 'Menyiapkan akunmu…'}
          teks={
            ditolak
              ? 'Data KTM tidak sesuai atau bukan mahasiswa FISIP Kampus Lengkong. Hubungi admin Preloved Unpas jika ini keliru.'
              : 'Admin sedang mengecek KTM-mu, biasanya kurang dari 1x24 jam. Sementara itu kamu tetap bisa melihat katalog.'
          }
        >
          <button className="link center-self" onClick={keluar}>Keluar</button>
        </EmptyState>
      </main>
    </>
  );
}
