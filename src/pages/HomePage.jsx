import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import HeroCarousel from "../components/HeroCarousel";
import { buildCatalogPath } from "../lib/catalog";
import { getCatalogNavigation } from "../lib/navigation";
import {
  aboutParagraphs,
  customerLogos,
  leaderProfile,
  projectSlides,
  services,
  whyChooseUs
} from "../data/siteData";

function HomePage() {
  const [navigation, setNavigation] = useState([]);
  const [isNavigationLoading, setIsNavigationLoading] = useState(true);
  const [navigationError, setNavigationError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const loadNavigation = async () => {
      try {
        const data = await getCatalogNavigation();

        if (!isCancelled) {
          setNavigation(data);
          setNavigationError("");
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Unable to load home navigation", error.message);
          setNavigationError(error.message);
        }
      } finally {
        if (!isCancelled) {
          setIsNavigationLoading(false);
        }
      }
    };

    loadNavigation();

    return () => {
      isCancelled = true;
    };
  }, []);

  const machineryCategory = navigation.find((item) => item.slug === "machinery");
  const sparepartsCategory = navigation.find((item) => item.slug === "spareparts");

  return (
    <div className="page-stack">
      <HeroCarousel slides={projectSlides} />

      <section className="section home-about-section" id="about">
        <div className="container">
          <div className="home-about-shell">
            <div className="section-header left-aligned home-section-header">
              <p className="section-eyebrow">About Company</p>
              <h2>
                Engineering the future of construction through precision and performance.
              </h2>
            </div>

            <div className="home-about-layout">
              <article className="about-panel about-panel-rich">
                {aboutParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </article>

              <aside className="about-side-panel about-side-panel-tall">
                <div className="highlight-tile highlight-tile-stats">
                  <div className="highlight-stat">
                    <span>20+</span>
                    <p>Years of experience supporting real construction project needs.</p>
                  </div>

                  <div className="highlight-stat">
                    <span>50+</span>
                    <p>Valuable customers are served by us.</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="section surface-section home-leader-section">
        <div className="container">
          <div className="leader-profile-shell">
            <div className="leader-profile-layout">
              <div className="leader-profile-visual">
                <div
                  className={`leader-profile-placeholder ${
                    leaderProfile.image ? "has-photo" : ""
                  }`}
                >
                  {leaderProfile.image ? (
                    <img
                      className="leader-profile-photo"
                      src={leaderProfile.image}
                      alt={leaderProfile.name}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <>
                      <span>{leaderProfile.imageLabel}</span>
                      <p>{leaderProfile.imageNote}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="leader-profile-content">
                <div className="section-header left-aligned leader-section-header">
                  <p className="section-eyebrow">Leader&apos;s Profile</p>
                  <h1>{leaderProfile.name}</h1>
                  <p className="leader-section-tagline">{leaderProfile.statement}</p>
                </div>

                <article className="about-panel leader-profile-panel">
                  {leaderProfile.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section home-services-section" id="services">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">Our Services</p>
            <h2>Services that move with your project, from supply to long-term support</h2>
            <p>
              Hover over the service belt to pause it, then open any service page for more detail.
            </p>
          </div>
        </div>

        <div className="service-marquee service-marquee-full">
          <div className="service-track">
            {[...services, ...services].map((service, index) => (
              <Link
                key={`${service.slug}-${index}`}
                className="service-card"
                to={`/services/${service.slug}`}
              >
                <h3>{service.title}</h3>
                <p>{service.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section surface-section home-reasons-section">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">Why Choose Us</p>
            <h2>Built around reliability, efficiency, and practical support</h2>
            <p>
              We focus on dependable delivery, long-term machinery support, and practical solutions for construction teams.
            </p>
          </div>

          <div className="home-reasons-row">
            {whyChooseUs.map((reason, index) => (
              <article className="reason-card reason-card-horizontal" key={reason.title}>
                <span className="reason-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{reason.title}</h3>
                <p>{reason.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section surface-section home-products-section">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">Product Range</p>
            <h2>Explore the machinery lines we support across construction projects</h2>
            <p>
              Browse the parent categories first, then move into sub-categories and individual machine variants.
            </p>
          </div>

          {navigationError ? <p className="status-message error">{navigationError}</p> : null}

          {isNavigationLoading ? (
            <div className="empty-state">Loading product categories...</div>
          ) : null}

          {!isNavigationLoading && machineryCategory?.childCategories?.length ? (
            <div className="card-grid three-up home-products-grid">
              {machineryCategory.childCategories.map((category) => (
                <article className="info-card product-range-card" key={category.slug}>
                  <img
                    src={category.image}
                    alt={category.name}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="info-card-body product-range-body">
                    <h3>{category.name}</h3>
                    <p>{category.shortDescription}</p>
                    <div className="chip-list">
                      {category.products?.slice(0, 3).map((product) => (
                        <span className="chip" key={product.slug}>
                          {product.name}
                        </span>
                      ))}
                    </div>
                    <Link
                      className="btn btn-outline product-range-action"
                      to={buildCatalogPath("machinery", category.slug)}
                    >
                      Explore Category
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!isNavigationLoading && !navigationError && !machineryCategory?.childCategories?.length ? (
            <div className="empty-state">No product categories are available right now.</div>
          ) : null}

          {sparepartsCategory ? (
            <article className="spareparts-banner">
              <div className="spareparts-banner-copy">
                <p className="section-eyebrow">Spareparts</p>
                <h3>{sparepartsCategory.name}</h3>
                <p>{sparepartsCategory.fullDescription}</p>
              </div>

              <Link
                className="btn btn-primary"
                to={buildCatalogPath(sparepartsCategory.slug)}
              >
                Explore Spare Parts
              </Link>
            </article>
          ) : null}
        </div>
      </section>

      <section className="section surface-section home-customers-section">
        <div className="container">
          <div className="section-header">
            <h2>Our Valuable Customer</h2>
          </div>
        </div>

        <div className="customer-marquee customer-marquee-full">
          <div className="customer-track">
            {[...customerLogos, ...customerLogos].map((customer, index) => (
              <div className="customer-logo-card" key={`${customer.name}-${index}`}>
                <img src={customer.image} alt={customer.name} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section cta-section">
        <div className="container cta-panel">
          <div>
            <p className="section-eyebrow">Need Pricing or Product Guidance?</p>
            <h2>Tell us about your project and we will help you choose the right solution.</h2>
          </div>

          <div className="cta-actions">
            <Link className="btn btn-primary" to="/quote">
              Request a Quote
            </Link>
            <Link className="btn btn-outline" to="/brochures">
              Download Brochure
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
