import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import BrochureModal from "./components/BrochureModal";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import QuotePage from "./pages/QuotePage";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ServicePage from "./pages/ServicePage";
import AdminPage from "./pages/AdminPage";
import BrochurePage from "./pages/BrochurePage";
import GalleryPage from "./pages/GalleryPage";
import SparePartsInquiryPage from "./pages/SparePartsInquiryPage";
import UserQueriesPage from "./pages/UserQueriesPage";
import NotFoundPage from "./pages/NotFoundPage";

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
      <Routes>
        <Route
          path="/"
          element={<HomePage />}
        />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:parentSlug" element={<CategoryPage />} />
        <Route path="/products/:parentSlug/:categorySlug" element={<CategoryPage />} />
        <Route path="/products/:parentSlug/:categorySlug/:productSlug" element={<ProductPage />} />
        <Route path="/quote" element={<QuotePage />} />
        <Route path="/spare-parts-inquiry" element={<SparePartsInquiryPage />} />
        <Route path="/queries" element={<UserQueriesPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/brochures" element={<BrochurePage openBrochureModal={openBrochureModal} />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/services/:serviceSlug" element={<ServicePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/owner" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
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
