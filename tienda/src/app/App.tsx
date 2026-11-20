import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart } from 'lucide-react';
import { NexoraLogo } from '../shared/ui/atoms/NexoraLogo';
import { CartDrawer } from '../shared/ui/organisms/CartDrawer';
import { useCart } from '../shared/cart/CartContext';
import { HomePage } from '../features/home/HomePage';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { CategoriesPage } from '../features/categories/CategoriesPage';
import { CartPage } from '../features/cart-checkout/CartPage';
import { CheckoutPage } from '../features/cart-checkout/CheckoutPage';
import { ProductDetailPage } from '../features/product-detail/ProductDetailPage';
import { StoreProfilePage } from '../features/stores/StoreProfilePage';
import { CreateStorePage } from '../features/stores/CreateStorePage';
import { OrderTrackingPage } from '../features/orders/OrderTrackingPage';
import { CustomerAccountPage } from '../features/account/CustomerAccountPage';
import { CustomerAuthProvider } from '../shared/auth/CustomerAuthContext';

function Header() {
  const { count, setOpen } = useCart();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : '/catalogo');
  };

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="brand" aria-label="NEXORA Market, inicio">
          <NexoraLogo subtitle="MARKET" />
        </Link>

        <nav className="nav" aria-label="Principal">
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/catalogo">Catálogo</NavLink>
          <NavLink to="/categorias">Categorías</NavLink>
          <NavLink to="/mis-compras">Mis compras</NavLink>
          <NavLink to="/mi-cuenta">Mi cuenta</NavLink>
          <NavLink to="/vender">Vender</NavLink>
          <NavLink to="/carrito">Carrito</NavLink>
        </nav>

        <div className="header__actions">
          <form className="header__search" onSubmit={handleSearch} role="search">
            <input
              type="search"
              placeholder="Buscar productos, marcas, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar productos"
            />
            <button type="submit" aria-label="Buscar">
              <Search size={15} />
            </button>
          </form>

          <button
            className="cart-btn"
            onClick={() => setOpen(true)}
            aria-label={`Abrir carrito, ${count} artículos`}
          >
            <ShoppingCart size={18} strokeWidth={2} />
            <span className="cart-btn__count">{count}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <NexoraLogo subtitle="MARKET" size="sm" />
          <small className="footer__tagline">Tu marketplace multi-categoría con stock en tiempo real.</small>
        </div>
        <nav aria-label="Pie de página">
          <Link to="/">Inicio</Link>
          <Link to="/catalogo">Catálogo</Link>
          <Link to="/categorias">Categorías</Link>
          <Link to="/checkout">Checkout</Link>
        </nav>
        <small className="footer__copy">© 2026 NEXORA · Marketplace</small>
      </div>
    </footer>
  );
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <CustomerAuthProvider>
      <ScrollTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalogo" element={<CatalogPage />} />
          <Route path="/producto/:slug" element={<ProductDetailPage />} />
          <Route path="/tienda/:slug" element={<StoreProfilePage />} />
          <Route path="/vender" element={<CreateStorePage />} />
          <Route path="/mis-compras" element={<OrderTrackingPage />} />
          <Route path="/mi-cuenta" element={<CustomerAccountPage />} />
          <Route path="/categorias" element={<CategoriesPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route
            path="*"
            element={
              <section className="section section--dark section--page">
                <div className="container">
                  <h1 className="page-title">Página no encontrada</h1>
                  <Link to="/" className="link-arrow link-arrow--dark">Volver al inicio →</Link>
                </div>
              </section>
            }
          />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
    </CustomerAuthProvider>
  );
}
