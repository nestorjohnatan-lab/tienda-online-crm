import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '../../shared/api/contracts';
import * as http from '../../shared/api/http';

interface AuthValue {
  user: AuthUser | null;
  booting: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const ALLOWED_CRM_ROLES = new Set(['admin', 'vendedor', 'almacen']);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    http.setSessionLostHandler(() => setUser(null));
    http.refreshSession().then((u) => {
      setUser(u && ALLOWED_CRM_ROLES.has(u.role) ? u : null);
      setBooting(false);
    });
    return () => http.setSessionLostHandler(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const logged = await http.login(email, password);
    if (!ALLOWED_CRM_ROLES.has(logged.role)) {
      await http.logout();
      throw new Error('Acceso exclusivo para personal interno del CRM');
    }
    setUser(logged);
  }, []);
  const signOut = useCallback(async () => {
    await http.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, booting, signIn, signOut }), [user, booting, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requiere AuthProvider');
  return ctx;
}
