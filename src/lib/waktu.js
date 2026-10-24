// Mengubah Timestamp Firestore menjadi teks tanggal
export const keDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);

export function tanggalWaktu(ts) {
  const d = keDate(ts);
  return d ? d.toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'baru saja';
}
