import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { initializePool } = await import("../src/config/db.js");
const { deleteGalleryMediaFile } = await import("../src/services/mediaStorage.js");

const resolveOwnerUser = async (connection) => {
  const ownerEmail = String(process.env.OWNER_EMAIL || "")
    .trim()
    .toLowerCase();

  if (ownerEmail) {
    const [ownerRows] = await connection.execute(
      `
        SELECT id, full_name AS fullName, email, role
        FROM users
        WHERE LOWER(email) = ?
        LIMIT 1
      `,
      [ownerEmail]
    );

    if (ownerRows.length) {
      return ownerRows[0];
    }
  }

  const [fallbackRows] = await connection.execute(
    `
      SELECT id, full_name AS fullName, email, role
      FROM users
      WHERE role = 'owner'
      ORDER BY id ASC
      LIMIT 1
    `
  );

  return fallbackRows[0] || null;
};

const resetDemoData = async () => {
  const pool = await initializePool();
  const connection = await pool.getConnection();
  let ownerUser = null;
  let galleryMediaPaths = [];

  try {
    ownerUser = await resolveOwnerUser(connection);

    if (!ownerUser) {
      throw new Error("Owner account was not found, so the reset was aborted");
    }

    const [galleryRows] = await connection.execute(
      `
        SELECT media_path AS mediaPath
        FROM gallery_items
        WHERE media_path IS NOT NULL
          AND media_path <> ''
      `
    );

    galleryMediaPaths = galleryRows.map((row) => row.mediaPath);

    await connection.beginTransaction();

    await connection.execute("DELETE FROM audit_logs");
    await connection.execute("DELETE FROM admin_tasks");
    await connection.execute("DELETE FROM auth_sessions");
    await connection.execute("DELETE FROM password_reset_tokens");
    await connection.execute("DELETE FROM gallery_items");
    await connection.execute("DELETE FROM brochure_leads");
    await connection.execute("DELETE FROM quote_enquiries");
    await connection.execute("DELETE FROM spare_parts_inventory");
    await connection.execute("DELETE FROM users WHERE id <> ?", [ownerUser.id]);

    await connection.commit();

    const fileDeletionResults = await Promise.allSettled(
      galleryMediaPaths.map((mediaPath) => deleteGalleryMediaFile(mediaPath))
    );

    const deletedFileCount = fileDeletionResults.filter(
      (result) => result.status === "fulfilled"
    ).length;
    const failedFileCount = fileDeletionResults.length - deletedFileCount;

    console.log("Sparkline demo data reset completed.");
    console.log(`Owner preserved: ${ownerUser.fullName} <${ownerUser.email}>`);
    console.log(
      `Cleared inquiries, brochure leads, admin tasks, audits, sessions, reset tokens, gallery records, spare parts inventory, and non-owner users.`
    );
    console.log(
      `Gallery media cleanup attempted for ${galleryMediaPaths.length} file(s): ${deletedFileCount} succeeded, ${failedFileCount} failed.`
    );
  } catch (error) {
    await connection.rollback();
    console.error("Sparkline demo data reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
};

await resetDemoData();
