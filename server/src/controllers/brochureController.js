import { getDbPool } from "../config/db.js";
import {
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone
} from "../utils/validation.js";

const resolveProductReference = async (pool, productSlug) => {
  if (!productSlug) {
    return null;
  }

  const [rows] = await pool.execute(
    `
      SELECT
        catalog_products.id,
        catalog_products.name,
        catalog_products.brochure_file_name AS brochureFileName,
        catalog_categories.slug AS categorySlug,
        catalog_categories.name AS categoryName
      FROM catalog_products
      INNER JOIN catalog_categories ON catalog_categories.id = catalog_products.category_id
      WHERE slug = ?
      LIMIT 1
    `,
    [productSlug]
  );

  return rows[0] || null;
};

const resolveCategoryReference = async (pool, categorySlug) => {
  if (!categorySlug) {
    return null;
  }

  const [rows] = await pool.execute(
    `
      SELECT id, name, slug
      , brochure_file_name AS brochureFileName
      FROM catalog_categories
      WHERE slug = ?
      LIMIT 1
    `,
    [categorySlug]
  );

  return rows[0] || null;
};

export const createBrochureLead = async (req, res) => {
  try {
    const {
      productSlug = "",
      brochureCategorySlug = "",
      requestedItem = ""
    } = req.body;

    const fullName = req.user?.fullName || "";
    const email = req.user?.email || "";
    const companyName = req.user?.companyName || "";
    const designation = req.user?.designation || "";
    const phone = req.user?.phone || "";

    if (!fullName || !email || !companyName || !designation || !phone) {
      return res.status(400).json({
        message:
          "Complete your account details before requesting a brochure"
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (!isValidPhone(normalizePhone(phone))) {
      return res.status(400).json({ message: "Enter a valid 10-digit phone number" });
    }

    const pool = getDbPool();
    const [product, category] = await Promise.all([
      resolveProductReference(pool, productSlug),
      resolveCategoryReference(pool, brochureCategorySlug)
    ]);

    const brochureFileName =
      category?.brochureFileName || product?.brochureFileName || "SPARKLINE-8.pdf";
    const resolvedRequestedItem =
      requestedItem.trim() ||
      (category?.name ? `${category.name} Brochure` : "") ||
      category?.name ||
      product?.categoryName ||
      product?.name ||
      "Company Brochure";

    await pool.execute(
      `
        INSERT INTO brochure_leads (
          user_id,
          full_name,
          email,
          company_name,
          designation,
          phone,
          product_id,
          requested_item
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user?.id || null,
        fullName.trim(),
        normalizeEmail(email),
        companyName.trim(),
        designation.trim(),
        normalizePhone(phone),
        product?.id || null,
        resolvedRequestedItem
      ]
    );

    res.status(201).json({
      message: "Brochure request submitted successfully",
      downloadUrl: `/brochure/${brochureFileName}`,
      fileName: brochureFileName
    });
  } catch (error) {
    console.error("Brochure lead error:", error.message);
    res.status(500).json({ message: "Unable to process brochure request" });
  }
};
