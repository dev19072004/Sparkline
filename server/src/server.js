import "dotenv/config";
import app from "./app.js";
import { initializePool } from "./config/db.js";
import {
  applyDefaultCategoryBrochures,
  runSchema,
  seedCatalog,
  seedStaffAccounts
} from "./services/databaseService.js";

const PORT = process.env.PORT || 5050;

const startServer = async () => {
  try {
    const pool = await initializePool();
    await runSchema(pool);
    await seedCatalog(pool);
    await applyDefaultCategoryBrochures(pool);
    await seedStaffAccounts(pool);

    const connection = await pool.getConnection();
    console.log("MySQL connected successfully");
    connection.release();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
