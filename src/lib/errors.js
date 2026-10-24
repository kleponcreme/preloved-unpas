// Pesan error Firebase dalam bahasa Indonesia
const PESAN = {
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/invalid-credential': 'Email atau password salah.',
  'auth/wrong-password': 'Email atau password salah.',
  'auth/user-not-found': 'Akun dengan email ini belum terdaftar.',
  'auth/email-already-in-use': 'Email ini sudah terdaftar. Silakan masuk.',
  'auth/weak-password': 'Password minimal 6 karakter.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
  'auth/network-request-failed': 'Koneksi internet bermasalah.',
  'auth/operation-not-allowed': 'Login email belum diaktifkan di Firebase (lihat Panduan, Langkah 4).',
  'auth/unauthorized-domain': 'Alamat website ini belum diizinkan di Firebase (lihat Panduan, Langkah 9).',
  'auth/invalid-api-key': 'Kunci Firebase di Netlify salah (lihat Panduan, Langkah 8).',
  'permission-denied': 'Kamu tidak punya izin untuk melakukan ini.',
};

export const pesanError = (err) => PESAN[err?.code] || err?.message || 'Terjadi kesalahan. Coba lagi.';
