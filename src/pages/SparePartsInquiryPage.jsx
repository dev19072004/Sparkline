import { useLocation } from "react-router-dom";

import RequireUserAccount from "../components/RequireUserAccount";
import SparePartsInquiryForm from "../components/SparePartsInquiryForm";

function SparePartsInquiryPage() {
  const location = useLocation();

  return (
    <section className="section page-hero-section">
      <div className="container">
        <div className="page-hero narrow">
          <p className="section-eyebrow">Spare Parts Inquiry</p>
          <h1>Share your spare parts requirement and our team will connect with the right support</h1>
          <p>
            Fill in the required details so we can review the spare part name, quantity, and exact requirement before responding.
          </p>
        </div>

        <RequireUserAccount
          redirectPath={`${location.pathname}${location.search}`}
          title="Login or signup before sending a spare parts inquiry"
          message="Every spare parts inquiry is now linked to the signed-in account so you can track its status later."
        >
          <SparePartsInquiryForm />
        </RequireUserAccount>
      </div>
    </section>
  );
}

export default SparePartsInquiryPage;
