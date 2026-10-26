import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

const AuthContext = createContext(null);

// Menyediakan info login ke seluruh aplikasi:
// user (akun Firebase), akun (dokumen users), admin, terverifikasi, loading
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [admin, setAdmin] = useState(false);
  const [akun, setAkun] = useState(undefined);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        setUser(u);
        if (u) {
          let token = await u.getIdTokenResult();
          if (!token.claims.admin) {
            // Cek apakah email ini terdaftar sebagai admin (ADMIN_EMAIL di Netlify)
            const jadi = await import('./api').then((m) => m.cekAdmin()).catch(() => false);
            if (jadi) token = await u.getIdTokenResult(true);
          }
          setAdmin(Boolean(token.claims.admin));
        } else {
          setAdmin(false);
        }
      }),
    [],
  );

  useEffect(() => {
    if (!user) {
      setAkun(user === null ? null : undefined);
      return undefined;
    }
    import('./api').then((m) => m.pindahkanWhatsapp(user.uid)).catch(() => {});
    return onSnapshot(
      doc(db, 'users', user.uid),
      (s) => setAkun(s.exists() ? { id: s.id, ...s.data() } : null),
      () => setAkun(null),
    );
  }, [user]);

  const value = {
    user: user ?? null,
    akun: akun ?? null,
    admin,
    loading: user === undefined || (user && akun === undefined),
    terverifikasi: akun?.statusVerifikasi === 'terverifikasi',
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
