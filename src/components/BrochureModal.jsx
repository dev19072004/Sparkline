import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import InquiryAccountCard from "./InquiryAccountCard";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { buildAuthRedirectPath } from "../lib/authRedirect";

function BrochureModal({
  isOpen,
  onClose,
  productSlug,
  brochureCategorySlug,
  brochureTitle,
  requestedItem
}) {
  const location = useLocation();
  const { user } = useAuth();
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStatus({ type: "", message: "" });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      setStatus({
        type: "error",
        message: "Please login before requesting a brochure."
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await apiFetch("/brochure-leads", {
        method: "POST",
        body: JSON.stringify({
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          companyName: user.companyName,
          designation: user.designation,
          productSlug,
          brochureCategorySlug,
          requestedItem
        })
      });

      setStatus({
        type: "success",
        message: "Your brochure request has been captured. The download is starting."
      });

      const downloadLink = document.createElement("a");
      downloadLink.href = response.downloadUrl;
      downloadLink.download = response.fileName || "";
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      window.setTimeout(onClose, 900);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="mega-eyebrow">Download Brochure</p>
            <h2>{brochureTitle || requestedItem}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {requestedItem ? (
          <p className="modal-selection-label">Selected category: {requestedItem}</p>
        ) : null}

        <p className="modal-copy">
          Share your details so we can send you the brochure and keep the enquiry linked to the right project requirement.
        </p>
        {user ? (
          <form className="form-stack" onSubmit={handleSubmit}>
            <InquiryAccountCard user={user} />

            {status.message ? (
              <p className={`status-message ${status.type}`}>{status.message}</p>
            ) : null}

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit and Download"}
              </button>
            </div>
          </form>
        ) : (
          <div className="account-required-card compact">
            <p className="section-eyebrow">Login Required</p>
            <h2>Login or signup before downloading a brochure</h2>
            <p>
              Brochure requests are linked to the signed-in account so Sparkline can track the enquiry correctly.
            </p>
            <div className="form-actions">
              <Link
                className="btn btn-primary"
                to={buildAuthRedirectPath(`${location.pathname}${location.search}`)}
              >
                Login / Signup
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BrochureModal;
