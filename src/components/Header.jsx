import { useEffect, useRef, useState } from "react";
import { FaBars, FaChevronDown, FaEnvelope, FaPhoneAlt, FaTimes } from "react-icons/fa";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { buildAuthRedirectPath } from "../lib/authRedirect";
import { buildCatalogPath } from "../lib/catalog";
import { getCatalogNavigation } from "../lib/navigation";
import { contactDetails } from "../data/siteData";

function Header() {
  const [navigation, setNavigation] = useState([]);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const { user, logout } = useAuth();
  const machineryCategory = navigation.find((item) => item.slug === "machinery");
  const sparepartsCategory = navigation.find((item) => item.slug === "spareparts");

  useEffect(() => {
    const loadNavigation = async () => {
      try {
        const data = await getCatalogNavigation();
        setNavigation(data);
      } catch (error) {
        console.error("Unable to load product navigation", error.message);
      }
    };

    loadNavigation();
  }, []);

  useEffect(() => {
    if (isMobileOpen) {
      return undefined;
    }

    const closeOnOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsProductsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isMobileOpen]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsMobileOpen(false);
      setIsProductsOpen(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.classList.toggle("mobile-nav-open", isMobileOpen);

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
        setIsProductsOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.classList.remove("mobile-nav-open");
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMobileOpen]);

  const closeNavigationMenus = () => {
    setIsProductsOpen(false);
    setIsMobileOpen(false);
  };

  const handleLogout = async () => {
    closeNavigationMenus();
    await logout();
  };

  const renderProductsMenu = (isMobile = false) => (
    <div
      className={`products-dropdown ${isMobile ? "mobile-products-dropdown" : ""}`}
      ref={isMobile ? null : dropdownRef}
    >
      <button
        type="button"
        className="nav-link nav-link-button"
        onClick={() => setIsProductsOpen((currentState) => !currentState)}
      >
        Products <FaChevronDown />
      </button>

      {isProductsOpen ? (
        isMobile ? (
          <div className="mobile-products-panel">
            <div className="mobile-products-head">
              <p className="mega-eyebrow">Catalog</p>
              <h3>Explore Machinery and Spare Parts</h3>
            </div>

            {machineryCategory ? (
              <div className="mobile-products-groups">
                {machineryCategory.childCategories?.map((childCategory) => (
                  <section className="mobile-product-group" key={childCategory.slug}>
                    <Link
                      className="mobile-product-group-link"
                      to={buildCatalogPath(machineryCategory.slug, childCategory.slug)}
                      onClick={closeNavigationMenus}
                    >
                      {childCategory.name}
                    </Link>

                    <div className="mobile-product-pills">
                      {childCategory.products?.map((product) => (
                        <Link
                          key={product.slug}
                          className="mega-product-pill compact"
                          to={buildCatalogPath(
                            machineryCategory.slug,
                            childCategory.slug,
                            product.slug
                          )}
                          onClick={closeNavigationMenus}
                        >
                          {product.name}
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}

            {sparepartsCategory ? (
              <div className="mobile-spareparts-entry">
                <div>
                  <p className="mega-row-label">Support Category</p>
                  <h4>{sparepartsCategory.name}</h4>
                  <p>{sparepartsCategory.shortDescription}</p>
                </div>
                <Link
                  className="btn btn-outline btn-small"
                  to={buildCatalogPath(sparepartsCategory.slug)}
                  onClick={closeNavigationMenus}
                >
                  Open Spareparts
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="products-mega-menu">
            <div className="products-mega-head">
              <div>
                <p className="mega-eyebrow">Catalog</p>
                <h3>Explore Machinery and Spare Parts</h3>
              </div>
            </div>

            {machineryCategory ? (
              <div className="products-mega-grid">
                {machineryCategory.childCategories?.map((childCategory) => (
                  <div className="mega-category-card" key={childCategory.slug}>
                    <Link
                      className="mega-child-link"
                      to={buildCatalogPath(machineryCategory.slug, childCategory.slug)}
                      onClick={closeNavigationMenus}
                    >
                      {childCategory.name}
                    </Link>

                    <div className="mega-product-links compact">
                      {childCategory.products?.map((product) => (
                        <Link
                          key={product.slug}
                          className="mega-product-pill compact"
                          to={buildCatalogPath(
                            machineryCategory.slug,
                            childCategory.slug,
                            product.slug
                          )}
                          onClick={closeNavigationMenus}
                        >
                          {product.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {sparepartsCategory ? (
              <div className="mega-spareparts-row">
                <div>
                  <p className="mega-row-label">Support Category</p>
                  <h4>{sparepartsCategory.name}</h4>
                  <p>{sparepartsCategory.shortDescription}</p>
                </div>
                <Link
                  className="btn btn-outline btn-small"
                  to={buildCatalogPath(sparepartsCategory.slug)}
                  onClick={closeNavigationMenus}
                >
                  Open Spareparts
                </Link>
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );

  const renderNavigationLinks = (isMobile = false) => (
    <>
      <NavLink to="/" end className="nav-link" onClick={closeNavigationMenus}>
        Home
      </NavLink>
      <NavLink to="/gallery" className="nav-link" onClick={closeNavigationMenus}>
        Gallery
      </NavLink>

      {renderProductsMenu(isMobile)}

      <a href="/#about" className="nav-link" onClick={closeNavigationMenus}>
        About
      </a>
      <a href="/#services" className="nav-link" onClick={closeNavigationMenus}>
        Services
      </a>
      <NavLink
        to={user ? "/quote" : buildAuthRedirectPath("/quote")}
        className="nav-link"
        onClick={closeNavigationMenus}
      >
        Quote
      </NavLink>
      <a href="/#contact" className="nav-link" onClick={closeNavigationMenus}>
        Contact
      </a>
      <NavLink
        to={user ? "/queries" : buildAuthRedirectPath("/queries")}
        className="nav-link"
        onClick={closeNavigationMenus}
      >
        Queries
      </NavLink>
      {["admin", "owner"].includes(user?.role || "") ? (
        <NavLink to="/admin" className="nav-link" onClick={closeNavigationMenus}>
          Admin
        </NavLink>
      ) : null}
      {user?.role === "owner" ? (
        <NavLink to="/owner" className="nav-link" onClick={closeNavigationMenus}>
          Owner
        </NavLink>
      ) : null}
    </>
  );

  const renderHeaderActions = () => (
    <>
      {user ? (
        <>
          <div className="user-badge">
            <span>{user.fullName}</span>
            <small>{user.role}</small>
          </div>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </>
      ) : (
        <Link className="btn btn-outline" to="/auth" onClick={closeNavigationMenus}>
          Login / Signup
        </Link>
      )}

      <Link
        to={user ? "/quote" : buildAuthRedirectPath("/quote")}
        className="btn btn-primary"
        onClick={closeNavigationMenus}
      >
        Get Quote
      </Link>
    </>
  );

  const mobileNavigationOverlay =
    isMobileOpen && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              className={`mobile-nav-backdrop ${isMobileOpen ? "is-open" : ""}`}
              aria-label="Close navigation"
              onClick={closeNavigationMenus}
            />

            <div className={`header-nav-shell mobile-nav-shell ${isMobileOpen ? "is-open" : ""}`}>
              <div className="mobile-nav-head">
                <strong>Menu</strong>
                <button
                  type="button"
                  className="mobile-nav-close"
                  aria-label="Close menu"
                  onClick={closeNavigationMenus}
                >
                  <FaTimes />
                </button>
              </div>

              <nav className="header-nav">{renderNavigationLinks(true)}</nav>
              <div className="header-actions">{renderHeaderActions()}</div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <header className="site-header">
        <div className="header-topbar">
          <div className="container header-topbar-inner">
            <p>Construction Machinery, Spare Parts, Support, and Reliable Project Delivery</p>
            <div className="header-contact-list">
              <span>
                <FaPhoneAlt /> {contactDetails.phone}
              </span>
              <span>
                <FaEnvelope /> {contactDetails.email}
              </span>
            </div>
          </div>
        </div>

        <div className="container header-main">
          <Link className="brand-lockup" to="/">
            <img
              src="/images/logo.png"
              alt="Sparkline logo"
              className="brand-image"
              decoding="async"
              fetchPriority="high"
            />
          </Link>

          <button
            className="mobile-menu-toggle"
            type="button"
            onClick={() => setIsMobileOpen((currentState) => !currentState)}
            aria-label="Toggle navigation"
          >
            {isMobileOpen ? <FaTimes /> : <FaBars />}
          </button>

          <div className="header-nav-shell desktop-nav-shell">
            <nav className="header-nav">{renderNavigationLinks(false)}</nav>
            <div className="header-actions">{renderHeaderActions()}</div>
          </div>
        </div>
      </header>
      {mobileNavigationOverlay}
    </>
  );
}

export default Header;
