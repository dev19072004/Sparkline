import { Link } from "react-router-dom";

function CTA() {
  return (
    <section className="cta-modern">
      <div className="container cta-modern-box">
        <div>
          <span className="section-badge">Need Help?</span>
          <h2>Looking for the Right Product Solution?</h2>
          <p>
            Connect with our team to get product details, brochures, and pricing information.
          </p>
        </div>

        <div className="cta-actions">
          <Link to="/quote">
            <button className="primary-btn">Get Quote</button>
          </Link>
          <Link to="/brochures">
            <button className="secondary-btn">Download Brochure</button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CTA;
