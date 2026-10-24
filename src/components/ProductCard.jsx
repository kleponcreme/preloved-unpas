import { Link } from 'react-router-dom';
import ProductMedia from './ProductMedia';
import { rp } from '../lib/format';
import { Icon } from './Icons';

export default function ProductCard({ produk: p, milikSaya }) {
  return (
    <Link to={`/produk/${p.id}`} className="pcard">
      <div className="pimg">
        <ProductMedia produk={p} />
        <span className="tag">{p.kondisi}</span>
        {p.stok < 1 || p.status === 'terjual' ? <span className="tag r sold">Terjual</span> : milikSaya ? <span className="tag r dark">Punyamu</span> : p.titip ? <span className="tag r y">Titip jual</span> : p.paket ? <span className="tag r g">Paket</span> : null}
      </div>
      <div className="pbody">
        <span className="pname">{p.judul}</span>
        <span className="pricerow">
          <span className="price">{rp(p.harga)}</span>
          {p.bisaNego && <span className="nego">Bisa nego</span>}
        </span>
        <span className="meta withicon"><Icon.Pin size={12} />FISIP Lengkong · {p.penjualNama}</span>
      </div>
    </Link>
  );
}
