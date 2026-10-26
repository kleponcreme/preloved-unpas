import { useState } from 'react';
import { Link } from 'react-router-dom';
import { APP } from '../config';
import { useAuth } from '../services/auth';
import { useKatalog } from '../services/hooks';
import ProductCard from '../components/ProductCard';
import TabBar from '../components/TabBar';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import { Icon } from '../components/Icons';

export default function Beranda() {
  const { user } = useAuth();
  const { data, loading, error } = useKatalog();
  const [kategori, setKategori] = useState('Semua');
  const [q, setQ] = useState('');
  const kata = q.trim().toLowerCase();
  const PAKET = 'Paket Maba';
  const cocok = (p) => kategori === 'Semua' || (kategori === PAKET ? p.paket === true : p.kategori === kategori);
  const list = data.filter((p) => cocok(p) && (!kata || p.judul.toLowerCase().includes(kata)));
  const jumlahPaket = data.filter((p) => p.paket === true).length;

  return (
    <>
      <header className="top">
        <div className="brand">
          <Icon.Logo />
          <div><b>RE:LOOP</b><small>FISIP UNPAS</small></div>
          {user ? (
            <span className="scope"><Icon.Shield />Khusus mahasiswa<br />{APP.cakupan}</span>
          ) : (
            <Link to="/masuk" className="btn sm primary" style={{ marginLeft: 'auto' }}>Masuk</Link>
          )}
        </div>
        <label className="search">
          <span className="sr">Cari barang</span>
          <Icon.Search />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari jaket, rice cooker, buku…" />
        </label>
      </header>

      <main className="scroll">
        <div className="chips" role="group" aria-label="Kategori">
          {['Semua', ...(jumlahPaket ? [PAKET] : []), ...APP.kategori].map((k) => (
            <button key={k} className="chip" aria-pressed={kategori === k} onClick={() => setKategori(k)}>{k}</button>
          ))}
        </div>
        {kategori === 'Semua' && !kata && (
          <button className="banner" style={{ display: 'block', textAlign: 'left', width: 'calc(100% - 32px)', border: 0, cursor: jumlahPaket ? 'pointer' : 'default' }} onClick={() => jumlahPaket && setKategori(PAKET)}>
            <h2>Paket Maba FISIP: perlengkapan kos dan buku per prodi, 30–70% lebih hemat</h2>
            <p>Dari kakak tingkat FISIP, ambil di Titik Temu FISIP Kampus Lengkong.{jumlahPaket ? ` Lihat ${jumlahPaket} barang →` : ' Segera hadir.'}</p>
          </button>
        )}
        <div className="section-h">
          <h2>{kata ? 'Hasil pencarian' : kategori === 'Semua' ? 'Baru diunggah' : kategori === PAKET ? 'Paket Maba FISIP' : kategori}</h2>
          {!loading && <span>{list.length} barang</span>}
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <EmptyState judul="Katalog gagal dimuat" teks="Periksa koneksi internet, lalu muat ulang halaman." />
        ) : list.length ? (
          <div className="grid">{list.map((p) => <ProductCard key={p.id} produk={p} milikSaya={p.penjualId === user?.uid} />)}</div>
        ) : (
          <EmptyState judul={data.length ? 'Belum ada barang yang cocok' : 'Katalog masih kosong'} teks={data.length ? 'Coba kata lain atau pilih kategori Semua.' : 'Jadilah yang pertama memasang barang di Lapak saya.'} />
        )}
      </main>
      <TabBar />
    </>
  );
}
