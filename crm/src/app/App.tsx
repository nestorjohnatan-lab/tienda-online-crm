import { lazy, Suspense, type ReactElement } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import type { UserRole } from '../shared/api/contracts';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';

// Code splitting por módulo
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const BannersPage = lazy(() => import('../features/banners/BannersPage').then((m) => ({ default: m.BannersPage })));
const InventoryPage = lazy(() => import('../features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const SalesPage = lazy(() => import('../features/sales/SalesPage').then((m) => ({ default: m.SalesPage })));
const CustomersPage = lazy(() => import('../features/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const StoreSettingsPage = lazy(() => import('../features/settings/StoreSettingsPage').then((m) => ({ default: m.StoreSettingsPage })));

interface Module { path: string; label: string; roles: readonly UserRole[]; element: ReactElement }

// Deny by default: cada módulo declara explícitamente los roles permitidos
const MODULES: readonly Module[] = [
  { path: '/', label: 'Dashboard', roles: ['admin', 'vendedor', 'almacen'], element: <DashboardPage /> },
  { path: '/banners', label: 'Carrusel de banners', roles: ['admin', 'vendedor'], element: <BannersPage /> },
  { path: '/inventario', label: 'Inventario', roles: ['admin', 'almacen'], element: <InventoryPage /> },
  { path: '/ventas', label: 'Ventas y pedidos', roles: ['admin', 'vendedor', 'almacen'], element: <SalesPage /> },
  { path: '/clientes', label: 'Clientes', roles: ['admin', 'vendedor'], element: <CustomersPage /> },
  { path: '/configuracion', label: 'Configuración tienda', roles: ['admin'], element: <StoreSettingsPage /> },
];

function Shell() {
  const { user, signOut } = useAuth();
  if (!user) return <LoginPage />;
  const allowed = MODULES.filter((m) => m.roles.includes(user.role));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">Auto<b>Frío</b> <small>CRM</small></div>
        <nav aria-label="Módulos">
          {allowed.map((m) => (
            <NavLink key={m.path} to={m.path} end={m.path === '/'}>{m.label}</NavLink>
          ))}
        </nav>
        <div className="sidebar__user">
          <strong>{user.full_name}</strong>
          <small>Rol: {user.role}</small>
          <button className="btn btn--sm" onClick={() => void signOut()}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="content">
        <Suspense fallback={<div className="skeleton" aria-busy="true" />}>
          <Routes>
            {allowed.map((m) => <Route key={m.path} path={m.path} element={m.element} />)}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { booting } = useAuth();
  if (booting) return <div className="boot" aria-busy="true">Verificando sesión…</div>;
  return <Shell />;
}
