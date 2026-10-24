import { Link } from 'react-router-dom';
import { usePesananSaya } from '../services/hooks';
import { rp } from '../lib/format';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import ProductMedia from '../components/ProductMedia';

export const STATUS_PESANAN = {
  menunggu_bayar: ['Menunggu bayar', 'wait'],
  dana_ditahan: ['Dana ditahan', 'hold'],
  cod: ['Bayar saat COD', 'hold'],
  selesai: ['Selesai', 'done'],
  batal: ['Dibatalkan', ''],
};

export default function Pesanan() {
  const { data, loading } = usePesananSaya();
  return (
    <>
      <AppBar title="Pesanan saya" back={false} />
      <main className="scroll">
        {loading ? (
          <Loading />
        ) : data.length === 0 ? (
          <EmptyState judul="Belum ada pesanan" teks="Pesanan yang kamu checkout akan muncul di sini." />
        ) : (
          <div className="wrap">
            {data.map((o) => {
              const [label, cls] = STATUS_PESANAN[o.status] ?? [o.status, ''];
              const ke = o.status === 'menunggu_bayar' ? `/bayar/${o.paymentId}` : `/pesanan/${o.id}`;
              return (
                <Link key={o.id} to={ke} className="card plain">
                  <div className="card-h"><b className="small grow">{o.kode}</b><span className={`status ${cls}`}>{label}</span></div>
                  <div className="card-b item center">
                    <div className="thumb" style={{ width: 52, height: 52 }}><ProductMedia foto={o.items[0].foto} /></div>
                    <div className="istack">
                      <span className="iname">{o.items[0].judul}</span>
                      <span className="meta">{o.items.length > 1 ? `+${o.items.length - 1} barang lain` : o.penjualNama}</span>
                    </div>
                    <b>{rp(o.subtotal + o.ongkir)}</b>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <TabBar />
    </>
  );
}
