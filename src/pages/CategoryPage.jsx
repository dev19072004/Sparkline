import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiFetch } from "../lib/api";
import {
  buildCategoryPathFromBreadcrumbs,
  buildProductPathFromBreadcrumbs
} from "../lib/catalog";

function CategoryPage() {
  const { parentSlug, categorySlug } = useParams();
  const resolvedSlug = categorySlug || parentSlug;

  const [categoryState, setCategoryState] = useState({
    category: null,
    breadcrumbs: [],
    childCategories: [],
    products: []
  });

  useEffect(() => {
    const loadCategory = async () => {
      try {
        const response = await apiFetch(`/products/categories/${resolvedSlug}`);
        setCategoryState(response);
      } catch (error) {
        console.error("Unable to load category page", error.message);
      }
    };

    loadCategory();
  }, [resolvedSlug]);

  const { category, breadcrumbs, childCategories, products } = categoryState;
  const isSparePartsCategory = category?.slug === "spareparts";

  if (!category) {
    return (
      <section className="section page-hero-section">
        <div className="container empty-state">Loading category details...</div>
      </section>
    );
  }

  return (
    <section className="section page-hero-section">
      <div className="container">
        <div className="breadcrumb-row">
          {breadcrumbs.map((crumb, index) => (
            <Link
              key={crumb.slug}
              className="breadcrumb-link"
              to={buildCategoryPathFromBreadcrumbs(
                breadcrumbs.slice(0, index),
                crumb.slug
              )}
            >
              {crumb.name}
            </Link>
          ))}
        </div>

        <div className="page-hero">
          <p className="section-eyebrow">Category</p>
          <h1>{category.name}</h1>
          <p>{category.fullDescription}</p>
        </div>

        {isSparePartsCategory ? (
          <div className="section-top-gap">
            <div className="spareparts-inquiry-action">
              <Link className="btn btn-primary" to="/spare-parts-inquiry">
                Inquire for Spare Parts
              </Link>
            </div>
          </div>
        ) : null}

        {!isSparePartsCategory && childCategories.length ? (
          <div className="section-top-gap">
            <div className="section-header left-aligned">
              <h2>Explore the product lines under this category</h2>
              <p>
                Choose one line below to move into the final model page for that equipment family.
              </p>
            </div>

            <div className="card-grid three-up">
              {childCategories.map((childCategory) => (
                <article className="info-card" key={childCategory.slug}>
                  <img src={childCategory.image} alt={childCategory.name} />
                  <div className="info-card-body">
                    <h3>{childCategory.name}</h3>
                    <p>{childCategory.shortDescription}</p>
                    <Link
                      className="btn btn-primary"
                      to={buildCategoryPathFromBreadcrumbs(
                        breadcrumbs,
                        childCategory.slug
                      )}
                    >
                      Open Category
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {!isSparePartsCategory && products.length ? (
          <div className="section-top-gap">
            <div className="section-header left-aligned">
              <p className="section-eyebrow">Models</p>
              <h2>Choose the product page for the exact machine model</h2>
            </div>

            <div className="card-grid three-up">
              {products.map((product) => (
                <article className="info-card" key={product.slug}>
                  <img src={product.image} alt={product.name} />
                  <div className="info-card-body">
                    <h3>{product.name}</h3>
                    <p>{product.shortDescription}</p>
                    <div className="button-row">
                      <Link
                        className="btn btn-primary"
                        to={buildProductPathFromBreadcrumbs(breadcrumbs, product.slug)}
                      >
                        Open Product
                      </Link>
                      <Link
                        className="btn btn-outline"
                        to={`/quote?product=${product.slug}`}
                      >
                        Get Quote
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

      </div>
    </section>
  );
}

export default CategoryPage;
