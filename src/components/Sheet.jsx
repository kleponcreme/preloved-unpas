import { useEffect, useRef } from 'react';
import { Icon } from './Icons';

// Panel bawah (bottom sheet) dengan latar gelap. Tutup dengan tombol X, klik latar, atau Escape.
export default function Sheet({ title, onClose, children, header }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('input, textarea, button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="handle" />
        <div className="sheet-h">
          {header ?? <h2>{title}</h2>}
          <button className="iconbtn" onClick={onClose} aria-label="Tutup" style={{ marginRight: -10 }}><Icon.Close /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
