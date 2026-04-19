import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiFetch } from "../lib/api";
import { buildCatalogPath } from "../lib/catalog";

function ProductsPage() {
  const [navigation, setNavigation] = useState([]);

  useEffect(() => {
    const loadNavigation = async () => {
      try {
        const data = await apiFetch("/products/navigation");
        setNavigation(data);
      } catch (error) {
        console.error("Unable to load products overview", error.message);
      }
    };

    loadNavigation();
  }, []);

  return (
    <section className="section page-hero-section">
      <div className="container">
        <div className="page-hero">
          <p className="section-eyebrow">Products</p>
          <h1>Browse the complete Sparkline product structure</h1>
          <p>
            Open a parent category to see its children, then go deeper into the specific machine model page for detailed information.
          </p>
        </div>
      </div>

      <div className="container section-top-gap">
        <div className="card-grid two-up">
          {navigation.map((category) => (
            <article className="info-card" key={category.slug}>
              <img src={category.image} alt={category.name} />
              <div className="info-card-body">
                <h2>{category.name}</h2>
                <p>{category.fullDescription}</p>

                {category.childCategories?.length ? (
                  <div className="chip-list">
                    {category.childCategories.map((childCategory) => (
                      <span className="chip" key={childCategory.slug}>
                        {childCategory.name}
                      </span>
                    ))}
                  </div>
                ) : null}

                <Link className="btn btn-primary" to={buildCatalogPath(category.slug)}>
                  Open {category.name}
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="section section-mini">
          <div className="section-header left-aligned">
            <p className="section-eyebrow">How It Works</p>
            <h2>Simple structure for browsing the catalog</h2>
          </div>

          <div className="card-grid three-up">
            <article className="reason-card">
              <h3>1. Open a parent category</h3>
              <p>Start with Machinery or Spareparts to understand the broad product family.</p>
            </article>
            <article className="reason-card">
              <h3>2. Choose a child category</h3>
              <p>Select the relevant machine range such as SCM, SBM, SRP, SPM, SMH, or other supported lines.</p>
            </article>
            <article className="reason-card">
              <h3>3. Open the final product page</h3>
              <p>Review the specific model, features, applications, brochure flow, and quote options.</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductsPage;
