import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import RequireUserAccount from "../components/RequireUserAccount";
import { apiFetch } from "../lib/api";
import { resolveBrochureCategories } from "../data/brochureCatalog";

function BrochurePage({ openBrochureModal }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [navigation, setNavigation] = useState([]);

  useEffect(() => {
    const loadNavigation = async () => {
      try {
        const data = await apiFetch("/products/navigation");
        setNavigation(data);
      } catch (error) {
        console.error("Unable to load brochure categories", error.message);
      }
    };

    loadNavigation();
  }, []);

  const brochureCategories = useMemo(
    () => resolveBrochureCategories(navigation),
    [navigation]
  );

  const selectedCategorySlug = searchParams.get("category") || "";

  const selectedCategory = brochureCategories.find(
    (category) => category.slug === selectedCategorySlug
  );

  return (
    <section className="section page-hero-section brochure-page-section">
      <div className="container">
        <div className="page-hero brochure-page-hero">
          <p className="section-eyebrow">Download Brochure</p>
          <h1>Select the brochure category you want to download</h1>
          <p>
            Choose the machinery category first. After that, the signed-in account will be used in the brochure request and the brochure will download after submission.
          </p>
        </div>

        <RequireUserAccount
          redirectPath={`/brochures${selectedCategorySlug ? `?category=${selectedCategorySlug}` : ""}`}
          title="Login or signup before downloading a brochure"
          message="Brochure requests are now linked to the signed-in account so your enquiry and download history can be tracked correctly."
        >
          <div className="brochure-selector-shell">
            <article className="brochure-selector-card">
              <label className="form-field brochure-selector-field" htmlFor="brochure-category">
                <span>Select Machine Category</span>
                <select
                  id="brochure-category"
                  value={selectedCategorySlug}
                  onChange={(event) => {
                    const nextCategorySlug = event.target.value;

                    setSearchParams(nextCategorySlug ? { category: nextCategorySlug } : {});
                  }}
                >
                  <option value="">Choose a category</option>
                  {brochureCategories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn btn-primary brochure-selector-action"
                disabled={!selectedCategory}
                onClick={() => {
                  if (!selectedCategory) {
                    return;
                  }

                  openBrochureModal({
                    brochureCategorySlug: selectedCategory.slug,
                    brochureTitle: selectedCategory.name,
                    requestedItem: selectedCategory.requestedItem
                  });
                }}
              >
                Download Brochure
              </button>
            </article>
          </div>
        </RequireUserAccount>
      </div>
    </section>
  );
}

export default BrochurePage;
