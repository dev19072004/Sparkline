import { Link } from "react-router-dom";

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="container hero-layout">
        <div className="hero-left">
          <span className="hero-tag">Industrial Excellence</span>
          <h1>
            Engineered Equipment
            <br />
            Built for Modern
            <br />
            Construction
          </h1>

          <p>
            We help businesses showcase premium construction and industrial
            products with trust, strength, and innovation at the center of every solution.
          </p>

          <div className="hero-buttons">
            <Link to="/products">
              <button className="primary-btn">Explore Products</button>
            </Link>

            <Link to="/brochures">
              <button className="secondary-btn">Download Brochure</button>
            </Link>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-image-card">
            <img src="/images/hero.jpg" alt="Industrial Equipment" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
