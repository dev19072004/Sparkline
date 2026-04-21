import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import CatalogEntryCard from "../components/CatalogEntryCard";
import { apiFetch } from "../lib/api";
import { usePageSeo, toAbsoluteSeoUrl } from "../hooks/usePageSeo";
import {
  buildBrochurePath,
  buildCategoryPathFromBreadcrumbs,
  buildProductPathFromBreadcrumbs
} from "../lib/catalog";
import { resolveAssetUrl } from "../lib/media";

function ProductPage() {
  const { productSlug } = useParams();
  const isMountedRef = useRef(true);
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProduct = useCallback(
    async ({ isBackground = false } = {}) => {
      if (!isBackground) {
        setIsLoading(true);
      }

      try {
        const response = await apiFetch(`/products/items/${productSlug}`, {
          cache: "no-store"
        });

        if (!isMountedRef.current) {
          return null;
        }

        setProduct(response);
        setError("");
        return response;
      } catch (loadError) {
        console.error("Unable to load product page", loadError.message);

        if (isMountedRef.current) {
          setError(loadError.message);
        }

        return null;
      } finally {
        if (!isBackground && isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [productSlug]
  );

  useEffect(() => {
    isMountedRef.current = true;
    loadProduct();

    const refreshProduct = () => {
      loadProduct({ isBackground: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshProduct();
      }
    };

    const refreshTimerId = window.setInterval(refreshProduct, 15000);

    window.addEventListener("focus", refreshProduct);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(refreshTimerId);
      window.removeEventListener("focus", refreshProduct);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadProduct]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const productImagePath = product ? resolveAssetUrl(product.image) : "";
  const productDescription =
    product?.shortDescription ||
    product?.fullDescription ||
    "Explore this Sparkline construction machinery product.";
  const breadcrumbStructuredData = product
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          ...product.breadcrumbs.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.name,
            item: toAbsoluteSeoUrl(
              buildCategoryPathFromBreadcrumbs(product.breadcrumbs.slice(0, index), crumb.slug)
            )
          })),
          {
            "@type": "ListItem",
            position: product.breadcrumbs.length + 1,
            name: product.name,
            item: toAbsoluteSeoUrl(
              buildProductPathFromBreadcrumbs(product.breadcrumbs, product.slug)
            )
          }
        ]
      }
    : null;
  const productStructuredData = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: productDescription,
        image: productImagePath ? [toAbsoluteSeoUrl(productImagePath)] : undefined,
        brand: {
          "@type": "Brand",
          name: "Sparkline"
        },
        category: product.breadcrumbs[product.breadcrumbs.length - 1]?.name,
        url: toAbsoluteSeoUrl(buildProductPathFromBreadcrumbs(product.breadcrumbs, product.slug))
      }
    : null;

  usePageSeo(
    product
      ? {
          title: `${product.name} | Sparkline`,
          description: productDescription,
          image: productImagePath,
          structuredData: [breadcrumbStructuredData, productStructuredData]
        }
      : {}
  );

  if (isLoading && !product) {
    return (
      <section className="section page-hero-section">
        <div className="container empty-state">Loading product details...</div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="section page-hero-section">
        <div className="container empty-state">
          {error || "Product details are unavailable right now."}
        </div>
      </section>
    );
  }

  const brochureCategorySlug =
    product.breadcrumbs[product.breadcrumbs.length - 1]?.slug || "";

  return (
    <section className="section page-hero-section">
      <div className="container">
        <div className="breadcrumb-row">
          {product.breadcrumbs.map((crumb, index) => (
            <Link
              key={crumb.slug}
              className="breadcrumb-link"
              to={buildCategoryPathFromBreadcrumbs(
                product.breadcrumbs.slice(0, index),
                crumb.slug
              )}
            >
              {crumb.name}
            </Link>
          ))}
          <span className="breadcrumb-link current">{product.name}</span>
        </div>

        <div className="product-detail-layout">
          <div className="product-visual-panel">
            <img
              src={resolveAssetUrl(product.image)}
              alt={product.name}
              decoding="async"
              fetchPriority="high"
            />
          </div>

          <div className="product-copy-panel">
            <p className="section-eyebrow">Product Detail</p>
            <h1>{product.name}</h1>
            <p className="lead-copy">{product.shortDescription}</p>
            <p>{product.fullDescription}</p>

            {error ? <p className="status-message error">{error}</p> : null}

            <div className="button-row">
              <Link className="btn btn-primary" to={`/quote?product=${product.slug}`}>
                Request Quote
              </Link>
              <Link
                className="btn btn-outline"
                to={buildBrochurePath(brochureCategorySlug)}
              >
                Download Brochure
              </Link>
            </div>
          </div>
        </div>

        <div className="section-top-gap detail-grid">
          <article className="detail-card">
            <div className="section-header left-aligned">
              <p className="section-eyebrow">Key Features</p>
              <h2>What stands out in this model</h2>
            </div>

            <ul className="feature-list">
              {product.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>

          <article className="detail-card">
            <div className="section-header left-aligned">
              <p className="section-eyebrow">Applications</p>
              <h2>Project types this product supports</h2>
            </div>

            <ul className="feature-list">
              {product.applications.map((application) => (
                <li key={application}>{application}</li>
              ))}
            </ul>
          </article>
        </div>

        <div className="section-top-gap">
          <div className="section-header left-aligned">
            <p className="section-eyebrow">Specifications</p>
            <h2>Quick technical overview</h2>
          </div>

          <div className="specification-table">
            {product.specifications.map((specification) => (
              <div className="specification-row" key={specification.label}>
                <span>{specification.label}</span>
                <strong>{specification.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {product.relatedProducts?.length ? (
          <div className="section-top-gap">
            <div className="section-header left-aligned">
              <p className="section-eyebrow">Related Models</p>
              <h2>Explore similar product options</h2>
            </div>

            <div className="card-grid three-up">
              {product.relatedProducts.map((relatedProduct) => (
                <CatalogEntryCard
                  key={relatedProduct.slug}
                  entry={relatedProduct}
                  actions={[
                    {
                      to: buildProductPathFromBreadcrumbs(
                        product.breadcrumbs,
                        relatedProduct.slug
                      ),
                      label: "Open Product",
                      className: "btn btn-outline"
                    }
                  ]}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default ProductPage;
