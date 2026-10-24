// Gambar produk: pakai foto asli kalau ada, kalau tidak ada pakai ilustrasi kotak.
const ART = {
  jaket: '<path d="M42 12l18 6 18-6 18 12-6 16-8-4v44H38V36l-8 4-6-16z" fill="#13285C"/><path d="M52 14l8 22 8-22" fill="none" stroke="#F5C518" stroke-width="2.4"/><path d="M60 36v44" stroke="#2C4F9E" stroke-width="1.5"/><rect x="44" y="44" width="10" height="8" rx="2" fill="#F5C518"/>',
  blazer: '<path d="M42 12l18 6 18-6 18 12-6 16-8-4v44H38V36l-8 4-6-16z" fill="#2B2E36"/><path d="M50 14l10 30 10-30" fill="#FFFFFF"/><path d="M50 14l6 20-4 6M70 14l-6 20 4 6" fill="none" stroke="#5A6072" stroke-width="2"/><circle cx="60" cy="56" r="1.8" fill="#9AA3B5"/><circle cx="60" cy="66" r="1.8" fill="#9AA3B5"/>',
  rice: '<rect x="28" y="36" width="64" height="46" rx="18" fill="#FFFFFF" stroke="#C9C1B3" stroke-width="1.5"/><path d="M30 40c4-14 56-14 60 0" fill="#ECE7DE" stroke="#C9C1B3" stroke-width="1.5"/><rect x="52" y="18" width="16" height="8" rx="4" fill="#9A9184"/><rect x="48" y="56" width="24" height="12" rx="4" fill="#2B2E36"/><circle cx="54" cy="62" r="2" fill="#E8590C"/><circle cx="62" cy="62" r="2" fill="#F5C518"/>',
  buku: '<rect x="26" y="64" width="68" height="16" rx="2" fill="#1F8A5B"/><rect x="30" y="48" width="62" height="16" rx="2" fill="#13285C"/><rect x="24" y="32" width="66" height="16" rx="2" fill="#E8590C"/><rect x="32" y="16" width="56" height="16" rx="2" fill="#F5C518"/><path d="M36 72h40M38 56h36M32 40h44M40 24h32" stroke="#FFFFFF" stroke-width="2" opacity="0.7"/>',
  laptop: '<rect x="26" y="16" width="68" height="46" rx="4" fill="#2B2E36"/><rect x="30" y="20" width="60" height="38" rx="2" fill="#4D7BD8"/><path d="M30 46l16-12 12 8 14-14 18 14v16H30z" fill="#2C4F9E"/><path d="M16 64h88l-6 12H22z" fill="#B9C0CE"/><rect x="50" y="66" width="20" height="4" rx="2" fill="#8E96A6"/>',
  kipas: '<circle cx="60" cy="34" r="26" fill="#FFFFFF" stroke="#9AA3B5" stroke-width="2"/><path d="M60 34c-4-16 6-20 10-12M60 34c16-4 20 6 12 10M60 34c4 16-6 20-10 12M60 34c-16 4-20-6-12-10" fill="#BFD3FF" stroke="#4D7BD8" stroke-width="1.5"/><circle cx="60" cy="34" r="4" fill="#13285C"/><path d="M60 60v16" stroke="#9AA3B5" stroke-width="4"/><rect x="44" y="76" width="32" height="6" rx="3" fill="#9AA3B5"/>',
  sepatu: '<path d="M18 70c0-10 4-24 12-30l20 4c6 8 18 12 34 14 10 2 16 6 16 12z" fill="#FFFFFF" stroke="#2B2E36" stroke-width="2"/><path d="M18 70h82v6H18z" fill="#2B2E36"/><path d="M36 46l4 10M44 46l2 10M52 50l2 8" stroke="#E8590C" stroke-width="2.2" stroke-linecap="round"/><path d="M64 60c8 2 18 2 26 4" stroke="#13285C" stroke-width="3" stroke-linecap="round"/>',
  recorder: '<rect x="44" y="8" width="32" height="74" rx="10" fill="#2B2E36"/><rect x="48" y="12" width="24" height="20" rx="8" fill="#5A6072"/><rect x="49" y="38" width="22" height="12" rx="2" fill="#B9CBA4"/><circle cx="60" cy="62" r="6" fill="#E8590C"/><rect x="51" y="72" width="18" height="4" rx="2" fill="#5A6072"/>',
  rak: '<path d="M36 8v74M84 8v74" stroke="#7A5A3A" stroke-width="4" stroke-linecap="round"/><path d="M36 28h48M36 52h48M36 76h48" stroke="#A47A50" stroke-width="5"/><rect x="42" y="14" width="10" height="12" fill="#13285C"/><rect x="54" y="18" width="14" height="8" rx="2" fill="#F5C518"/><rect x="44" y="40" width="20" height="10" rx="2" fill="#1F8A5B"/><circle cx="74" cy="44" r="5" fill="#E8590C"/><rect x="48" y="64" width="26" height="10" rx="2" fill="#DDE3F0"/>',
  dispenser: '<rect x="40" y="8" width="40" height="74" rx="6" fill="#FFFFFF" stroke="#9AA3B5" stroke-width="2"/><rect x="46" y="16" width="28" height="22" rx="3" fill="#DDE6FF"/><circle cx="53" cy="46" r="3" fill="#4D7BD8"/><circle cx="67" cy="46" r="3" fill="#E8590C"/><rect x="50" y="54" width="20" height="10" rx="2" fill="#2B2E36"/><rect x="44" y="68" width="32" height="10" rx="2" fill="#E9ECF3"/>',
  kotak: '<path d="M28 30l32-14 32 14v40l-32 14-32-14z" fill="#E9D7B9" stroke="#A47A50" stroke-width="2"/><path d="M28 30l32 14 32-14M60 44v40" fill="none" stroke="#A47A50" stroke-width="2"/>',
};

export default function ProductMedia({ produk, foto }) {
  const src = foto ?? produk?.foto?.[0];
  if (src) return <img src={src} alt="" />;
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" className="art">
      <ellipse cx="60" cy="84" rx="36" ry="4" fill="rgba(11,26,64,0.08)" />
      <g dangerouslySetInnerHTML={{ __html: ART[produk?.art] ?? ART.kotak }} />
    </svg>
  );
}
