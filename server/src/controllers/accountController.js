import { getDbPool } from "../config/db.js";

const formatInquiryType = (value) => {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (normalizedValue === "spare_parts") {
    return "spare_parts";
  }

  if (normalizedValue === "brochure") {
    return "brochure";
  }

  return "quote";
};

export const getCurrentUserQueries = async (req, res) => {
  try {
    const pool = getDbPool();
    const [rows] = await pool.execute(
      `
        SELECT
          inquiries.id,
          inquiries.inquiryType,
          inquiries.requestedItem,
          inquiries.quantity,
          inquiries.message,
          inquiries.status,
          inquiries.createdAt,
          inquiries.updatedAt
        FROM (
          SELECT
            quote_enquiries.id,
            CASE
              WHEN COALESCE(NULLIF(quote_enquiries.source_type, ''), 'quote') = 'spare_parts'
                THEN 'spare_parts'
              WHEN quote_enquiries.message LIKE 'Spare Parts Inquiry:%'
                THEN 'spare_parts'
              ELSE COALESCE(NULLIF(quote_enquiries.source_type, ''), 'quote')
            END AS inquiryType,
            quote_enquiries.requested_item AS requestedItem,
            quote_enquiries.quantity,
            CASE
              WHEN quote_enquiries.message LIKE 'Spare Parts Inquiry:%'
                THEN TRIM(SUBSTRING(quote_enquiries.message, LENGTH('Spare Parts Inquiry:') + 1))
              ELSE quote_enquiries.message
            END AS message,
            quote_enquiries.status,
            quote_enquiries.created_at AS createdAt,
            quote_enquiries.updated_at AS updatedAt
          FROM quote_enquiries
          WHERE quote_enquiries.user_id = ?
             OR (
               quote_enquiries.user_id IS NULL
               AND quote_enquiries.email = ?
             )

          UNION ALL

          SELECT
            brochure_leads.id,
            'brochure' AS inquiryType,
            brochure_leads.requested_item AS requestedItem,
            NULL AS quantity,
            '' AS message,
            brochure_leads.status,
            brochure_leads.created_at AS createdAt,
            brochure_leads.updated_at AS updatedAt
          FROM brochure_leads
          WHERE brochure_leads.user_id = ?
             OR (
               brochure_leads.user_id IS NULL
               AND brochure_leads.email = ?
             )
        ) AS inquiries
        ORDER BY inquiries.createdAt DESC, inquiries.id DESC
      `,
      [Number(req.user.id), req.user.email, Number(req.user.id), req.user.email]
    );

    res.status(200).json({
      inquiries: rows.map((row) => ({
        ...row,
        inquiryType: formatInquiryType(row.inquiryType)
      }))
    });
  } catch (error) {
    console.error("Current user queries error:", error.message);
    res.status(500).json({ message: "Unable to load your queries" });
  }
};
