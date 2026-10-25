// Bunyi notifikasi dibuat langsung oleh browser (Web Audio), tanpa file suara.
// Browser hanya mengizinkan suara setelah pengguna mengetuk layar sekali.
const KUNCI = 'preloved-bunyi';
let ctx = null;

export const bunyiAktif = () => {
  try { return localStorage.getItem(KUNCI) !== 'mati'; } catch { return true; }
};

export const aturBunyi = (nyala) => {
  try { localStorage.setItem(KUNCI, nyala ? 'nyala' : 'mati'); } catch { /* abaikan */ }
};

function konteks() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

// Dipanggil sekali saat website dibuka: suara "dibuka" pada ketukan pertama
export function siapkanBunyi() {
  const buka = () => {
    const c = konteks();
    if (c && c.state === 'suspended') c.resume();
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach((e) => window.addEventListener(e, buka, { passive: true }));
}

// jenis 'uang' untuk pembayaran/pesanan, 'info' untuk lainnya
export function bunyi(jenis = 'info') {
  if (!bunyiAktif()) return;
  const c = konteks();
  if (!c || c.state !== 'running') return;
  const nada = jenis === 'uang' ? [784, 988, 1319] : [660, 880];
  const t0 = c.currentTime;
  nada.forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    const t = t0 + i * 0.13;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.42);
  });
  if (navigator.vibrate) navigator.vibrate(120);
}
