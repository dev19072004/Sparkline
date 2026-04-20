import CatalogEntryCard from "../components/CatalogEntryCard";
import { buildCatalogPath } from "../lib/catalog";
import useCatalogNavigation from "../hooks/useCatalogNavigation";

function ProductsPage() {
  const { navigation, isLoading, error } = useCatalogNavigation();

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
        {error ? <p className="status-message error">{error}</p> : null}

        {isLoading ? <div className="empty-state">Loading product catalog...</div> : null}

        {!isLoading && navigation.length ? (
          <div className="card-grid two-up">
            {navigation.map((category) => (
              <CatalogEntryCard
                key={category.slug}
                entry={category}
                headingTag="h2"
                description={category.fullDescription || category.shortDescription}
                chips={(category.childCategories || []).map((childCategory) => ({
                  key: childCategory.slug,
                  label: childCategory.name
                }))}
                actions={[
                  {
                    to: buildCatalogPath(category.slug),
                    label: `Open ${category.name}`,
                    className: "btn btn-primary"
                  }
                ]}
              />
            ))}
          </div>
        ) : null}

        {!isLoading && !error && !navigation.length ? (
          <div className="empty-state">No products are available right now.</div>
        ) : null}

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
