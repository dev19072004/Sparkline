import { getDbPool } from "../config/db.js";

export const getGalleryItems = async (_req, res) => {
  try {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `
        SELECT
          id,
          media_type AS mediaType,
          media_path AS mediaPath,
          description,
          created_at AS createdAt
        FROM gallery_items
        WHERE is_active = TRUE
        ORDER BY created_at DESC, id DESC
      `
    );

    res.status(200).json({ items: rows });
  } catch (error) {
    console.error("Gallery items error:", error.message);
    res.status(500).json({ message: "Unable to load gallery items" });
  }
};
