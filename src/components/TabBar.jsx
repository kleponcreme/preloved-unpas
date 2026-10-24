import { NavLink } from 'react-router-dom';
import { Icon } from './Icons';
import { useAuth } from '../services/auth';
import { useIsiKeranjang, usePesananSaya, usePenjualanSaya, useTawaranMasuk } from '../services/hooks';

export default function TabBar() {
  const { user } = useAuth();
  const keranjang = useIsiKeranjang().data.length;
  const pesanan = usePesananSaya().data.filter((o) => ['menunggu_bayar', 'dana_ditahan'].includes(o.status)).length;
  const lapak =
    useTawaranMasuk().data.filter((o) => o.status === 'menunggu').length +
    usePenjualanSaya().data.filter((o) => o.status === 'dana_ditahan' && !o.jadwalDikonfirmasi).length;

  const tabs = [
    { to: '/', label: 'Beranda', icon: <Icon.Home />, end: true },
    { to: '/keranjang', label: 'Keranjang', icon: <Icon.Cart />, badge: keranjang },
    { to: '/pesanan', label: 'Pesanan', icon: <Icon.Order />, badge: pesanan },
    { to: user ? '/lapak' : '/masuk', label: user ? 'Lapak saya' : 'Masuk', icon: <Icon.Store />, badge: lapak },
  ];
  return (
    <nav className="tabbar" aria-label="Menu utama">
      {tabs.map((t) => (
        <NavLink key={t.label} to={t.to} end={t.end} className="tab">
          {t.icon}
          {t.badge > 0 && <span className="badge">{t.badge}</span>}
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
