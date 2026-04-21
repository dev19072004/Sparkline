import { Link, useParams } from "react-router-dom";

import { services } from "../data/siteData";
import { usePageSeo } from "../hooks/usePageSeo";

function ServicePage() {
  const { serviceSlug } = useParams();
  const service = services.find((entry) => entry.slug === serviceSlug);

  usePageSeo(
    service
      ? {
          title: `${service.title} | Sparkline Services`,
          description: service.summary || service.description
        }
      : {}
  );

  if (!service) {
    return (
      <section className="section page-hero-section">
        <div className="container empty-state">Service page not found.</div>
      </section>
    );
  }

  return (
    <section className="section page-hero-section">
      <div className="container">
        <div className="page-hero narrow">
          <p className="section-eyebrow">Service</p>
          <h1>{service.title}</h1>
          <p>{service.description}</p>
        </div>

        <div className="detail-grid">
          <article className="detail-card">
            <div className="section-header left-aligned">
              <p className="section-eyebrow">Overview</p>
              <h2>Where this service helps</h2>
            </div>
            <p>{service.summary}</p>
          </article>

          <article className="detail-card">
            <div className="section-header left-aligned">
              <p className="section-eyebrow">Service Highlights</p>
              <h2>What is included</h2>
            </div>
            <ul className="feature-list">
              {service.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        </div>

        <div className="cta-panel inline-cta section-top-gap">
          <div>
            <p className="section-eyebrow">Need this service for your site?</p>
            <h2>We can connect the service requirement with the right machine or spare support path.</h2>
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
      </div>
    </section>
  );
}

export default ServicePage;
