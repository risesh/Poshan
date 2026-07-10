import type { Product } from "@/lib/products";

export default function ProductPanel({ product }: { product: Product }) {
  return (
    <section className="product-panel">
      <div className="product-panel__label">Product details</div>
      <div className="product-panel__grid">
        <div className="product-panel__left">
          {product.vegetarian && (
            <div className="product-panel__veg-row">
              <span className="product-panel__veg-icon">
                <span className="product-panel__veg-dot"></span>
              </span>
              <span className="product-panel__veg-label">Vegetarian</span>
            </div>
          )}
          <div className="product-panel__field">
            <div className="product-panel__field-label">Ingredients</div>
            <div className="product-panel__field-value">{product.ingredients}</div>
          </div>
          <div className="product-panel__meta-grid">
            <div>
              <div className="product-panel__meta-label">Net quantity</div>
              <div className="product-panel__meta-value">{product.netQuantity}</div>
            </div>
            <div>
              <div className="product-panel__meta-label">Storage</div>
              <div className="product-panel__meta-value">{product.storage}</div>
            </div>
            <div>
              <div className="product-panel__meta-label">Shelf life</div>
              <div className="product-panel__meta-value">{product.shelfLife}</div>
            </div>
          </div>
        </div>
        <div className="product-panel__right">
          <div className="product-panel__nutrition-head">
            <span className="product-panel__nutrition-title">Nutrition</span>
            <span className="product-panel__nutrition-basis">{product.nutritionBasis}</span>
          </div>
          {product.nutritionRows.map(([label, value]) => (
            <div className="product-panel__nutrition-row" key={label}>
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
