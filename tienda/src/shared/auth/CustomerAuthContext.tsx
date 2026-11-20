import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../api/client';
import type { RegisterCustomerRequest, StoreUser } from '../api/contracts';

interface CustomerAuthState {
  readonly user: StoreUser | null;
  readonly accessToken: string | null;
  readonly booting: boolean;
  login(email: string, password: string): Promise<void>;
  register(payload: RegisterCustomerRequest): Promise<void>;
  logout(): Promise<void>;
}

const Ctx = createContext<CustomerAuthState | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoreUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authApi
      .refresh()
      .then((s) => {
        if (!cancelled) {
          setUser(s.user);
          setAccessToken(s.access_token);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setAccessToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const s = await authApi.login(email, password);
    setUser(s.user);
    setAccessToken(s.access_token);
  };

  const register = async (payload: RegisterCustomerRequest) => {
    const s = await authApi.register(payload);
    setUser(s.user);
    setAccessToken(s.access_token);
  };

  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    setUser(null);
    setAccessToken(null);
  };

  return (
    <Ctx.Provider value={{ user, accessToken, booting, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCustomerAuth debe usarse dentro de CustomerAuthProvider');
  return ctx;
}
