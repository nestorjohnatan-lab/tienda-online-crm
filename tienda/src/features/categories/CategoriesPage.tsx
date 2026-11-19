import { Link } from 'react-router-dom';
import { useCategories } from '../../shared/api/client';
import { CategoryCard, CategorySkeleton } from '../../shared/ui/molecules/CategoryCard';

export function CategoriesPage() {
  const categories = useCategories();
  return (
    <section className="section section--light section--page">
      <div className="container">
        <p className="eyebrow">Categorías</p>
        <h1 className="page-title">Compra por categoría</h1>
        <div className="grid grid--cats">
          {categories.loading
            ? Array.from({ length: 6 }, (_, i) => <CategorySkeleton key={i} />)
            : categories.data.map((c) => <CategoryCard key={c.category_id} category={c} />)}
        </div>
        <p style={{ marginTop: '1.5rem' }}>
          <Link to="/catalogo" className="link-arrow">Ver todo el catálogo →</Link>
        </p>
      </div>
    </section>
  );
}
