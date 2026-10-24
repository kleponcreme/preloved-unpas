import { Routes, Route } from 'react-router-dom';
import { firebaseSiap } from './services/firebase';
import Wajib from './components/Wajib';
import SetupFirebase from './components/SetupFirebase';
import Beranda from './pages/Beranda';
import DetailProduk from './pages/DetailProduk';
import Masuk from './pages/Masuk';
import Daftar from './pages/Daftar';
import Keranjang from './pages/Keranjang';
import Checkout from './pages/Checkout';
import Pesanan from './pages/Pesanan';
import DetailPesanan from './pages/DetailPesanan';
import Pembayaran from './pages/Pembayaran';
import Lapak from './pages/Lapak';
import JualBarang from './pages/JualBarang';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

export default function App() {
  if (!firebaseSiap) return <div className="app"><SetupFirebase /></div>;
  return (
    <div className="app">
      <Routes>
        {/* Bisa dibuka tanpa login */}
        <Route path="/" element={<Beranda />} />
        <Route path="/produk/:id" element={<DetailProduk />} />
        <Route path="/masuk" element={<Masuk />} />
        <Route path="/daftar" element={<Daftar />} />

        {/* Wajib login dan terverifikasi */}
        <Route path="/keranjang" element={<Wajib><Keranjang /></Wajib>} />
        <Route path="/checkout" element={<Wajib><Checkout /></Wajib>} />
        <Route path="/pesanan" element={<Wajib verified={false}><Pesanan /></Wajib>} />
        <Route path="/pesanan/:id" element={<Wajib verified={false}><DetailPesanan /></Wajib>} />
        <Route path="/bayar/:id" element={<Wajib verified={false}><Pembayaran /></Wajib>} />
        <Route path="/lapak" element={<Wajib><Lapak /></Wajib>} />
        <Route path="/lapak/jual" element={<Wajib><JualBarang /></Wajib>} />
        <Route path="/admin" element={<Wajib admin><Admin /></Wajib>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
