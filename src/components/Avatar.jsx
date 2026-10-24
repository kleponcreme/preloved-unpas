const WARNA = [['#DDE6FF', '#13285C'], ['#FDE7D9', '#9A3D06'], ['#E3F4EA', '#166A45'], ['#FFF4CC', '#6B4E00']];

export default function Avatar({ nama, size = 44 }) {
  const ini = nama.split(' ').filter(Boolean).slice(0, 2).map((k) => k[0]).join('').toUpperCase();
  const [bg, fg] = WARNA[nama.length % WARNA.length];
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.33, background: bg, color: fg }} aria-hidden="true">
      {ini}
    </span>
  );
}
