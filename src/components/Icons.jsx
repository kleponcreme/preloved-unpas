const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const Svg = ({ size, children, ...rest }) => (
  <svg {...base} width={size ?? base.width} height={size ?? base.height} {...rest}>{children}</svg>
);

export const Icon = {
  Back: (p) => <Svg size={24} {...p}><path d="M15 5l-7 7 7 7" /></Svg>,
  Close: (p) => <Svg strokeWidth={2.2} {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>,
  Cart: (p) => <Svg {...p}><path d="M3 4h2l2.4 11h10.8L21 7H6.2" /><circle cx="9" cy="19.5" r="1.4" /><circle cx="17" cy="19.5" r="1.4" /></Svg>,
  Home: (p) => <Svg {...p}><path d="M4 11l8-7 8 7v9H4z" /><path d="M10 20v-5h4v5" /></Svg>,
  Order: (p) => <Svg {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></Svg>,
  Store: (p) => <Svg {...p}><path d="M4 9l1.5-5h13L20 9" /><path d="M4 9h16v1.5a3 3 0 0 1-5.3 1.9 3 3 0 0 1-5.4 0A3 3 0 0 1 4 10.5z" /><path d="M5 12.5V20h14v-7.5" /></Svg>,
  Wa: (p) => <Svg {...p}><path d="M4 20l1.3-4A8 8 0 1 1 8.4 19z" /><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1.2 1.8.8-.4 1.6c-3.6.2-7.6-3.8-7.4-7.4l1.6-.4.8 1.8z" /></Svg>,
  Search: (p) => <Svg size={20} stroke="#5A6072" {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>,
  Shield: (p) => <Svg size={16} strokeWidth={2.4} {...p}><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></Svg>,
  Check: (p) => <Svg size={12} strokeWidth={3.5} {...p}><path d="M5 12l5 5 9-10" /></Svg>,
  Pin: (p) => <Svg size={14} strokeWidth={2.4} {...p}><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2" /></Svg>,
  Camera: (p) => <Svg {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg>,
  Logo: () => (
    <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#F5C518" />
      <path d="M12 15h16l-1.5 14h-13z" fill="none" stroke="#13285C" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M16 15v-2a4 4 0 0 1 8 0v2" fill="none" stroke="#13285C" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M17 23a3.2 3.2 0 0 1 5.6-1.6M23 23a3.2 3.2 0 0 1-5.6 1.6" fill="none" stroke="#1F8A5B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};
