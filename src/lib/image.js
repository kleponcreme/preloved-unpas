// Mengecilkan foto di browser sebelum diunggah, supaya hemat kuota Storage
// dan lolos batas 2 MB di aturan keamanan.
export function kecilkanFoto(file, lebarMaks = 1200, kualitas = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Foto gagal dibaca.'));
    };
    img.onload = () => {
      const skala = Math.min(1, lebarMaks / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * skala);
      canvas.height = Math.round(img.height * skala);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Foto gagal diproses.'))), 'image/jpeg', kualitas);
    };
    img.src = url;
  });
}
