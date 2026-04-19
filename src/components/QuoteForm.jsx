import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import InquiryAccountCard from "./InquiryAccountCard";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

function QuoteForm() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedProductSlug = searchParams.get("product") || "";
  const [products, setProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const [formData, setFormData] = useState({
    productSlug: selectedProductSlug,
    quantity: "",
    message: ""
  });

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const rows = await apiFetch("/products");
        setProducts(rows);
      } catch (error) {
        console.error("Unable to load quote products", error.message);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    setFormData((currentState) => ({
      ...currentState,
      productSlug: selectedProductSlug
    }));
  }, [selectedProductSlug]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      const selectedProduct = products.find(
        (product) => product.slug === formData.productSlug
      );

      await apiFetch("/quotes", {
        method: "POST",
        body: JSON.stringify({
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          companyName: user.companyName,
          designation: user.designation,
          ...formData,
          requestedItem: selectedProduct?.name || ""
        })
      });

      setStatus({
        type: "success",
        message: "Your quote request has been submitted successfully."
      });

      setFormData({
        productSlug: selectedProductSlug,
        quantity: "",
        message: ""
      });
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
          <span>Product of Interest</span>
          <select
            name="productSlug"
            value={formData.productSlug}
            onChange={handleChange}
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.slug} value={product.slug}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field full-width">
          <span>Quantity Required</span>
          <input
            type="number"
            min="1"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
          />
        </label>
      </div>

      <label className="form-field full-width">
        <span>Requirement Details</span>
        <textarea
          name="message"
          rows="6"
          value={formData.message}
          onChange={handleChange}
          placeholder="Tell us about your project, expected usage, site type, or any specific requirement."
          required
        />
      </label>

      {status.message ? (
        <p className={`status-message ${status.type}`}>{status.message}</p>
      ) : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Quote Request"}
        </button>
      </div>
    </form>
  );
}

export default QuoteForm;
