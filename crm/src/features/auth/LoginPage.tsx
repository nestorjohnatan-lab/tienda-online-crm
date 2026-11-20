import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthContext';
import { NexoraLogo } from '../../shared/ui/atoms/NexoraLogo';

export function LoginPage() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await signIn(String(f.get('email')), String(f.get('password')));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <form className="login__card" onSubmit={onSubmit}>
        <div className="login__brand">
          <NexoraLogo subtitle="MARKET · CRM" size="md" tone="light" />
        </div>
        <p className="muted">Acceso exclusivo para el equipo interno.</p>
        <label>Correo<input name="email" type="email" required autoComplete="username" /></label>
        <label>Contraseña<input name="password" type="password" required minLength={6} autoComplete="current-password" /></label>
        {error && <p className="alert" role="alert">{error}</p>}
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </main>
  );
}
