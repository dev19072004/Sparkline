import { useLocation } from "react-router-dom";

import RequireUserAccount from "../components/RequireUserAccount";
import QuoteForm from "../components/QuoteForm";

function QuotePage() {
  const location = useLocation();

  return (
    <section className="section page-hero-section">
      <div className="container">
        <div className="page-hero narrow">
          <p className="section-eyebrow">Request a Quote</p>
          <h1>Tell us what you need and we will connect you with the right solution</h1>
          <p>
            Share the project requirement, product interest, and quantity details so we can respond with the right next step.
          </p>
        </div>

        <RequireUserAccount
          redirectPath={`${location.pathname}${location.search}`}
          title="Login or signup before requesting a quote"
          message="Sparkline now links every quote request to the signed-in account so your inquiry can be tracked properly."
        >
          <QuoteForm />
        </RequireUserAccount>
      </div>
    </section>
  );
}

export default QuotePage;
