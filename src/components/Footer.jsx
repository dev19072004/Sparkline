import { Link } from "react-router-dom";
import { FaEnvelope, FaPhoneAlt, FaMapMarkerAlt } from "react-icons/fa";

import { contactDetails, services } from "../data/siteData";

function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container footer-grid">
        <div className="footer-brand-panel">
          <div className="brand-lockup footer-brand-lockup">
            <div>
              <img src="/images/logo.png" alt="Sparkline logo" className="brand-image" />
              <p className="brand-tagline">Reliable construction machinery and spare parts support</p>
            </div>
          </div>

          <p>
            We support residential, commercial, housing society, and infrastructure
            projects with dependable machinery, spare parts, and long-term service backing.
          </p>
        </div>

        <div>
          <h3>Quick Links</h3>
          <div className="footer-link-list">
            <Link to="/">Home</Link>
            <Link to="/products">Products</Link>
            <Link to="/quote">Request Quote</Link>
            <Link to="/auth">Login / Signup</Link>
          </div>
        </div>

        <div>
          <h3>Core Services</h3>
          <div className="footer-link-list">
            {services.slice(0, 4).map((service) => (
              <Link key={service.slug} to={`/services/${service.slug}`}>
                {service.title}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3>Contact</h3>
          <div className="footer-contact-list">
            <p>
              <FaPhoneAlt /> {contactDetails.phone}
            </p>
            <p>
              <FaEnvelope /> {contactDetails.email}
            </p>
            <p>
              <FaMapMarkerAlt /> {contactDetails.location}
            </p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">© 2026 Sparkline. All rights reserved.</div>
    </footer>
  );
}

export default Footer;
