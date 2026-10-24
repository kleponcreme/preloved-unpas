import { useNavigate } from 'react-router-dom';

// Kembali ke layar sebelumnya. Kalau halaman dibuka langsung (tanpa riwayat), kembali ke fallback.
export function useBack(fallback = '/') {
  const navigate = useNavigate();
  return () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}
