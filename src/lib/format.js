export const rp = (n) => 'Rp' + Math.round(n || 0).toLocaleString('id-ID');
export const angka = (teks) => Number(String(teks).replace(/\D/g, '')) || 0;
export const formatRibuan = (teks) => {
  const n = angka(teks);
  return n ? n.toLocaleString('id-ID') : '';
};
