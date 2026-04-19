import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import BrochureModal from "./components/BrochureModal";

const HomePage = lazy(() => import("./pages/HomePage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const QuotePage = lazy(() => import("./pages/QuotePage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const BrochurePage = lazy(() => import("./pages/BrochurePage"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const SparePartsInquiryPage = lazy(() => import("./pages/SparePartsInquiryPage"));
const UserQueriesPage = lazy(() => import("./pages/UserQueriesPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace("#", "");

      window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
      });

      return;
    }

    window.scrollTo({ top: 0 });
  }, [location.hash, location.pathname]);

  return null;
}

function AppShell() {
  const [brochureModalState, setBrochureModalState] = useState({
    isOpen: false,
    productSlug: "",
    brochureCategorySlug: "",
    brochureTitle: "Company Brochure",
    requestedItem: "Company Brochure"
  });

  const openBrochureModal = ({
    productSlug = "",
    brochureCategorySlug = "",
    brochureTitle = "Company Brochure",
    requestedItem = "Company Brochure"
  } = {}) => {
    setBrochureModalState({
      isOpen: true,
      productSlug,
      brochureCategorySlug,
      brochureTitle,
      requestedItem
    });
  };

  const closeBrochureModal = () => {
    setBrochureModalState((currentState) => ({
      ...currentState,
      isOpen: false
    }));
  };

  return (
    <>
      <ScrollManager />
      <Header />
      <main className="site-main">
        <Suspense
          fallback={
            <section className="section page-hero-section">
              <div className="container empty-state">Loading page...</div>
            </section>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:parentSlug" element={<CategoryPage />} />
            <Route path="/products/:parentSlug/:categorySlug" element={<CategoryPage />} />
            <Route
              path="/products/:parentSlug/:categorySlug/:productSlug"
              element={<ProductPage />}
            />
            <Route path="/quote" element={<QuotePage />} />
            <Route path="/spare-parts-inquiry" element={<SparePartsInquiryPage />} />
            <Route path="/queries" element={<UserQueriesPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/brochures"
              element={<BrochurePage openBrochureModal={openBrochureModal} />}
            />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/services/:serviceSlug" element={<ServicePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/owner" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <BrochureModal
        isOpen={brochureModalState.isOpen}
        onClose={closeBrochureModal}
        productSlug={brochureModalState.productSlug}
        brochureCategorySlug={brochureModalState.brochureCategorySlug}
        brochureTitle={brochureModalState.brochureTitle}
        requestedItem={brochureModalState.requestedItem}
      />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
