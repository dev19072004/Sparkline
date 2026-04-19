import { useState } from "react";

import InquiryAccountCard from "./InquiryAccountCard";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

const initialFormData = {
  sparePartName: "",
  quantityRequired: "",
  requirementDetails: ""
};

function SparePartsInquiryForm() {
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentState) => ({
      ...currentState,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      setStatus({
        type: "error",
        message: "Please login before submitting an inquiry."
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      try {
        await apiFetch("/quotes/spare-parts", {
          method: "POST",
          body: JSON.stringify({
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            companyName: user.companyName,
            designation: user.designation,
            ...formData
          })
        });
      } catch (error) {
        const message = String(error.message || "");
        const shouldUseLegacyFallback =
          message.includes("Cannot POST /api/quotes/spare-parts") ||
          message.includes("Cannot POST");

        if (!shouldUseLegacyFallback) {
          throw error;
        }

        await apiFetch("/quotes", {
          method: "POST",
          body: JSON.stringify({
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            companyName: user.companyName,
            designation: user.designation,
            requestedItem: formData.sparePartName,
            quantity: formData.quantityRequired,
            message: `Spare Parts Inquiry: ${formData.requirementDetails}`
          })
        });
      }

      setStatus({
        type: "success",
        message: "Your spare parts inquiry has been submitted successfully."
      });
      setFormData(initialFormData);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="quote-form form-stack" onSubmit={handleSubmit}>
      <InquiryAccountCard user={user} />

      <div className="form-grid">
        <label className="form-field">
          <span>Product Name of Spare Part</span>
          <input
            type="text"
            name="sparePartName"
            value={formData.sparePartName}
            onChange={handleChange}
            required
          />
        </label>

        <label className="form-field full-width">
          <span>Quantity Required</span>
          <input
            type="number"
            min="1"
            step="1"
            name="quantityRequired"
            value={formData.quantityRequired}
            onChange={handleChange}
            required
          />
        </label>
      </div>

      <label className="form-field full-width">
        <span>Requirement Details</span>
        <textarea
          name="requirementDetails"
          rows="6"
          value={formData.requirementDetails}
          onChange={handleChange}
          placeholder="Tell us the spare part specification, machine reference, urgency, or any other requirement detail."
          required
        />
      </label>

      {status.message ? (
        <p className={`status-message ${status.type}`}>{status.message}</p>
      ) : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Spare Parts Inquiry"}
        </button>
      </div>
    </form>
  );
}

export default SparePartsInquiryForm;
