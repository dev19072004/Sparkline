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
      SELECT id, name
      FROM catalog_products
      WHERE slug = ?
      LIMIT 1
    `,
    [productSlug]
  );

  return rows[0] || null;
};

const insertQuoteEnquiry = async (
  pool,
  {
    sourceType = "quote",
    userId = null,
    fullName,
    email,
    phone,
    companyName,
    designation,
    productId = null,
    requestedItem = "",
    quantity = null,
    message = ""
  }
) => {
  await pool.execute(
    `
      INSERT INTO quote_enquiries (
        source_type,
        user_id,
        full_name,
        email,
        phone,
        company_name,
        designation,
        product_id,
        requested_item,
        quantity,
        message
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      sourceType,
      userId ? Number(userId) : null,
      fullName.trim(),
      normalizeEmail(email),
      normalizePhone(phone),
      companyName.trim(),
      designation.trim(),
      productId,
      requestedItem.trim(),
      quantity ? Number(quantity) : null,
      message.trim()
    ]
  );
};

export const createQuoteEnquiry = async (req, res) => {
  try {
    const {
      productSlug = "",
      requestedItem = "",
      quantity = null,
      message = ""
    } = req.body;

    const fullName = req.user?.fullName || "";
    const email = req.user?.email || "";
    const phone = req.user?.phone || "";
    const companyName = req.user?.companyName || "";
    const designation = req.user?.designation || "";

    if (!fullName || !email || !phone || !companyName || !designation || !message) {
      return res.status(400).json({
        message:
          "Complete your account details before submitting an inquiry"
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (phone && !isValidPhone(normalizePhone(phone))) {
      return res.status(400).json({ message: "Enter a valid 10-digit phone number" });
    }

    const pool = getDbPool();
    const product = await resolveProductReference(pool, productSlug);

    await insertQuoteEnquiry(pool, {
      sourceType: "quote",
      userId: req.user?.id || null,
      fullName,
      email,
      phone,
      companyName,
      designation,
      productId: product?.id || null,
      requestedItem: requestedItem.trim() || product?.name || "",
      quantity,
      message
    });

    res.status(201).json({
      message: "Quote request submitted successfully"
    });
  } catch (error) {
    console.error("Quote enquiry error:", error.message);
    res.status(500).json({ message: "Unable to submit quote request" });
  }
};

export const createSparePartsEnquiry = async (req, res) => {
  try {
    const {
      sparePartName = "",
      quantityRequired = "",
      requirementDetails = ""
    } = req.body;

    const fullName = req.user?.fullName || "";
    const email = req.user?.email || "";
    const phone = req.user?.phone || "";
    const companyName = req.user?.companyName || "";
    const designation = req.user?.designation || "";

    if (
      !fullName ||
      !email ||
      !phone ||
      !companyName ||
      !designation ||
      !sparePartName ||
      !quantityRequired ||
      !requirementDetails
    ) {
      return res.status(400).json({
        message:
          "Complete your account details and spare part requirement before submitting"
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (!isValidPhone(normalizePhone(phone))) {
      return res.status(400).json({ message: "Enter a valid 10-digit phone number" });
    }

    const parsedQuantity = Number(quantityRequired);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({
        message: "Enter a valid quantity required"
      });
    }

    const pool = getDbPool();

    await insertQuoteEnquiry(pool, {
      sourceType: "spare_parts",
      userId: req.user?.id || null,
      fullName,
      email,
      phone,
      companyName,
      designation,
      requestedItem: sparePartName,
      quantity: parsedQuantity,
      message: requirementDetails
    });

    res.status(201).json({
      message: "Spare parts inquiry submitted successfully"
    });
  } catch (error) {
    console.error("Spare parts enquiry error:", error.message);
    res.status(500).json({ message: "Unable to submit spare parts inquiry" });
  }
};
