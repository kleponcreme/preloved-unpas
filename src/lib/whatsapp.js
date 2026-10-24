// Membuat link wa.me. Kalau nomor belum ada, WhatsApp akan meminta pengguna memilih kontak.
export function linkWhatsApp(nomor, pesan) {
  const teks = encodeURIComponent(pesan);
  if (!nomor) return `https://wa.me/?text=${teks}`;
  const no = String(nomor).replace(/\D/g, '').replace(/^0/, '62');
  return `https://wa.me/${no}?text=${teks}`;
}
