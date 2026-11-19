import type { ReactNode } from 'react';

export function PageState({ loading, error, children }: { loading: boolean; error: string | null; children: ReactNode }) {
  if (loading) return <div className="skeleton" aria-busy="true" />;
  if (error) return <p className="alert" role="alert">{error}</p>;
  return <>{children}</>;
}

export function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'warn' | 'ok' | 'bad' }) {
  return (
    <div className="card stat">
      <small>{label}</small>
      <strong className={tone ? `tone-${tone}` : ''}>{value}</strong>
    </div>
  );
}

export function StatusPill({ value }: { value: string }) {
  return <span className={`pill pill--${value}`}>{value}</span>;
}
