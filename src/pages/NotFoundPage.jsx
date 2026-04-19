import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section className="section page-hero-section">
      <div className="container not-found-shell">
        <p className="section-eyebrow">404</p>
        <h1>We could not find that page</h1>
        <p>
          The page may have moved, or the route may not exist yet. Return home and continue browsing the machinery catalog.
        </p>
        <Link className="btn btn-primary" to="/">
          Back to Home
        </Link>
      </div>
    </section>
  );
}

export default NotFoundPage;
