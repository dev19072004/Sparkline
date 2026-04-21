import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import CatalogEntryCard from "../components/CatalogEntryCard";
import { usePageSeo, toAbsoluteSeoUrl } from "../hooks/usePageSeo";
import { apiFetch } from "../lib/api";
import {
  buildCategoryPathFromBreadcrumbs,
  buildProductPathFromBreadcrumbs
} from "../lib/catalog";

function CategoryPage() {
  const { parentSlug, categorySlug } = useParams();
  const resolvedSlug = categorySlug || parentSlug;
  const isMountedRef = useRef(true);

  const [categoryState, setCategoryState] = useState({
    category: null,
    breadcrumbs: [],
    childCategories: [],
    products: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCategory = useCallback(
    async ({ isBackground = false } = {}) => {
      if (!isBackground) {
        setIsLoading(true);
      }

      try {
        const response = await apiFetch(`/products/categories/${resolvedSlug}`, {
          cache: "no-store"
        });

        if (!isMountedRef.current) {
          return null;
        }

        setCategoryState(response);
        setError("");
        return response;
      } catch (loadError) {
        console.error("Unable to load category page", loadError.message);

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
    [resolvedSlug]
  );

  useEffect(() => {
    isMountedRef.current = true;
    loadCategory();

    const refreshCategory = () => {
      loadCategory({ isBackground: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshCategory();
      }
    };

    const refreshTimerId = window.setInterval(refreshCategory, 15000);

    window.addEventListener("focus", refreshCategory);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(refreshTimerId);
      window.removeEventListener("focus", refreshCategory);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadCategory]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const { category, breadcrumbs, childCategories, products } = categoryState;
  const isSparePartsCategory = category?.slug === "spareparts";
  const categoryTitle = category ? `${category.name} | Sparkline` : undefined;
  const categoryDescription =
    category?.shortDescription ||
    category?.fullDescription ||
    "Explore Sparkline construction machinery and spare parts categories.";
  const breadcrumbStructuredData = category
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: toAbsoluteSeoUrl(
            buildCategoryPathFromBreadcrumbs(breadcrumbs.slice(0, index), crumb.slug)
          )
        }))
      }
    : null;
  const collectionStructuredData = category
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: category.name,
        description: categoryDescription,
        url: toAbsoluteSeoUrl(
          buildCategoryPathFromBreadcrumbs(
            breadcrumbs.slice(0, Math.max(breadcrumbs.length - 1, 0)),
            category.slug
          )
        )
      }
    : null;

  usePageSeo(
    category
      ? {
          title: categoryTitle,
          description: categoryDescription,
          image: category.image,
          structuredData: [breadcrumbStructuredData, collectionStructuredData]
        }
      : {}
  );

  if (isLoading && !category) {
    return (
      <section className="section page-hero-section">
        <div className="container empty-state">Loading category details...</div>
      </section>
    );
  }

  if (!category) {
    return (
      <section className="section page-hero-section">
        <div className="container empty-state">
          {error || "Category details are unavailable right now."}
        </div>
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

        {error ? <p className="status-message error">{error}</p> : null}

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
                <CatalogEntryCard
                  key={childCategory.slug}
                  entry={childCategory}
                  actions={[
                    {
                      to: buildCategoryPathFromBreadcrumbs(breadcrumbs, childCategory.slug),
                      label: "Open Category",
                      className: "btn btn-primary"
                    }
                  ]}
                />
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
                <CatalogEntryCard
                  key={product.slug}
                  entry={product}
                  actions={[
                    {
                      to: buildProductPathFromBreadcrumbs(breadcrumbs, product.slug),
                      label: "Open Product",
                      className: "btn btn-primary"
                    },
                    {
                      to: `/quote?product=${product.slug}`,
                      label: "Get Quote",
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

export default CategoryPage;
