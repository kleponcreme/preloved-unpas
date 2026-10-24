import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [pesan, setPesan] = useState(null);
  const timer = useRef();
  const tampilkan = useCallback((teks) => {
    setPesan(teks);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPesan(null), 2800);
  }, []);
  return (
    <ToastContext.Provider value={tampilkan}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {pesan && <div className="toast">{pesan}</div>}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
