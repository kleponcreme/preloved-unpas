import { Link } from 'react-router-dom';
import { APP } from '../config';
import { useAuth } from '../services/auth';
import { useKeranjang, useTawaranSaya } from '../services/hooks';
import { hapusDariKeranjang, pilihItem } from '../services/api';
import { hargaEfektif, tawaranTerakhir } from '../lib/harga';
import { rp } from '../lib/format';
import AppBar from '../components/AppBar';
import TabBar from '../components/TabBar';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import ProductMedia from '../components/ProductMedia';
import Avatar from '../components/Avatar';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';

const tersedia = (p) => p && p.status === 'tayang' && p.stok > 0;

export default function Keranjang() {
  const toast = useToast();
  const { akun } = useAuth();
  const { items, loading } = useKeranjang();
  const tawaranSaya = useTawaranSaya().data;
  const dipilih = items.filter((i) => i.dipilih && tersedia(i.produk));
  const subtotal = dipilih.reduce((t, i) => t + hargaEfektif(i.produk, tawaranSaya), 0);
  const hemat = dipilih.reduce((t, i) => t + (i.produk.harga - hargaEfektif(i.produk, tawaranSaya)), 0);

  const grup = {};
  items.forEach((i) => (grup[i.produk?.penjualId ?? 'x'] ||= []).push(i));

  async function hapus(productId) {
    await hapusDariKeranjang(productId);
    toast('Dihapus dari keranjang');
  }

  return (
    <>
      <AppBar title={`Keranjang (${items.length})`} />
      <main className="scroll">
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState judul="Keranjangmu masih kosong" teks="Cari barang di beranda, lalu tekan “+ Keranjang”.">
            <Link to="/" className="btn dark" style={{ marginTop: 12 }}>Lihat katalog</Link>
          </EmptyState>
        ) : (
          <div className="wrap">
            {Object.entries(grup).map(([penjualId, list]) => {
              const contoh = list.find((i) => i.produk)?.produk;
              return (
                <div className="card" key={penjualId}>
                  <div className="card-h">
                    <Avatar nama={contoh?.penjualNama || '?'} size={30} />
                    <div className="grow"><b className="small">{contoh?.penjualNama ?? 'Barang tidak tersedia'}</b><div className="meta">{APP.titikTemu}</div></div>
                  </div>
                  {list.map((i) => {
                    const p = i.produk;
                    if (!tersedia(p)) {
                      return (
                        <div className="card-b item center" key={i.productId}>
                          <div className="istack"><span className="iname">{p?.judul ?? 'Barang ini'}</span><span className="err">Sudah terjual atau tidak tersedia</span></div>
                          <button className="link red" onClick={() => hapus(i.productId)}>Hapus</button>
                        </div>
                      );
                    }
                    const h = hargaEfektif(p, tawaranSaya);
                    return (
                      <div className="card-b item" key={p.id}>
                        <input type="checkbox" className="chk" style={{ marginTop: 24 }} checked={i.dipilih} onChange={(e) => pilihItem(p.id, e.target.checked)} aria-label={`Pilih ${p.judul}`} />
                        <Link to={`/produk/${p.id}`} className="thumb" aria-label={`Buka ${p.judul}`}><ProductMedia produk={p} /></Link>
                        <div className="istack">
                          <span className="iname">{p.judul}</span>
                          <span className="meta">{p.kondisi} · 1 unit</span>
                          <span><b className="navy" style={{ fontSize: 16 }}>{rp(h)}</b>{h !== p.harga && <span className="strike">{rp(p.harga)}</span>}</span>
                          {h !== p.harga && <span className="verified"><Icon.Check /> Nego disetujui</span>}
                          <div className="btnrow-inline">
                            {p.bisaNego && !tawaranTerakhir(tawaranSaya, p.id) && <Link className="link" to={`/produk/${p.id}`}>Ajukan nego</Link>}
                            <button className="link red" onClick={() => hapus(p.id)}>Hapus</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {!akun?.promoDipakai && (
              <div className="note g"><Icon.Check /><span><b>Promo Pembeli Pertama</b> potongan {rp(APP.promoPembeliPertama)} dipakai otomatis saat checkout dengan QRIS.</span></div>
            )}
          </div>
        )}
      </main>

      {items.length > 0 ? (
        <div className="actionbar">
          <div className="totalbox">
            <small>Subtotal ({dipilih.length} barang)</small>
            <b>{rp(subtotal)}</b>
            {hemat > 0 && <small className="green">Hemat {rp(hemat)} dari nego</small>}
          </div>
          <Link to="/checkout" className={`btn primary${dipilih.length ? '' : ' disabled'}`} aria-disabled={!dipilih.length} onClick={(e) => !dipilih.length && e.preventDefault()}>
            Checkout ({dipilih.length})
          </Link>
        </div>
      ) : (
        <TabBar />
      )}
    </>
  );
}
