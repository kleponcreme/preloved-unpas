import { APP } from '../config';

// Harga yang berlaku untuk pembeli: harga nego yang disetujui, atau harga normal.
export function hargaEfektif(produk, tawaranSaya = []) {
  const o = tawaranSaya.find((t) => t.productId === produk.id && t.status === 'diterima');
  return o ? o.hargaBalik ?? o.hargaTawar : produk.harga;
}

// Tawaran terbaru pembeli untuk satu produk (daftar sudah urut terbaru)
export const tawaranTerakhir = (tawaranSaya, productId) => tawaranSaya.find((t) => t.productId === productId) ?? null;

export const komisiDari = (harga) => Math.round(harga * APP.komisi);
export const netPenjual = (harga) => harga - komisiDari(harga);
