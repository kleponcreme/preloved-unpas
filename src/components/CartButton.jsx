import { Link } from 'react-router-dom';
import { Icon } from './Icons';
import { useIsiKeranjang } from '../services/hooks';

export default function CartButton() {
  const n = useIsiKeranjang().data.length;
  return (
    <Link to="/keranjang" className="iconbtn" aria-label={`Keranjang, ${n} barang`}>
      <Icon.Cart />
      {n > 0 && <span className="badge">{n}</span>}
    </Link>
  );
}
