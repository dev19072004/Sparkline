import { products } from "../data/siteData";
import { Link } from "react-router-dom";

function ProductGrid() {
  return (
    <section className="products-modern" id="products">
      <div className="container">
        <div className="section-heading">
          <span className="section-badge">Our Products</span>
          <h2>Product Categories</h2>
          <p>
            Explore our premium portfolio of industrial and construction equipment.
          </p>
        </div>

        <div className="products-grid-modern">
          {products.map((product, index) => (
            <div className="product-modern-card" key={index}>
              <div className="product-image-wrap">
                <img src={product.image} alt={product.title} />
              </div>
              <div className="product-content">
                <h3>{product.title}</h3>
                <p>{product.description}</p>
                <div className="product-card-buttons">
                  <Link to="/products">
                    <button className="secondary-btn small-btn">Learn More</button>
                  </Link>

                  <Link to={`/quote?product=${encodeURIComponent(product.title)}`}>
                    <button className="primary-btn small-btn">Get Quote</button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProductGrid;