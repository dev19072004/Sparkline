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
const DATABASE_RETRY_DELAY_MS = 15000;

const startupState = {
  databaseReady: false,
  isBootstrapping: false,
  startupError: null,
  lastSuccessAt: null,
  lastAttemptAt: null
};

app.locals.startupState = startupState;

const bootstrapDatabase = async () => {
  if (startupState.databaseReady || startupState.isBootstrapping) {
    return;
  }

  startupState.isBootstrapping = true;
  startupState.lastAttemptAt = new Date().toISOString();

  try {
    const pool = await initializePool();
    await runSchema(pool);
    await seedCatalog(pool);
    await applyDefaultCategoryBrochures(pool);
    await seedStaffAccounts(pool);

    const connection = await pool.getConnection();
    console.log("MySQL connected successfully");
    connection.release();

    startupState.databaseReady = true;
    startupState.startupError = null;
    startupState.lastSuccessAt = new Date().toISOString();
  } catch (error) {
    startupState.databaseReady = false;
    startupState.startupError = error.message;
    console.error("Database bootstrap failed:", error.message);

    setTimeout(() => {
      bootstrapDatabase().catch(() => {});
    }, DATABASE_RETRY_DELAY_MS);
  } finally {
    startupState.isBootstrapping = false;
  }
};

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  bootstrapDatabase().catch((error) => {
    startupState.databaseReady = false;
    startupState.startupError = error.message;
    console.error("Unexpected bootstrap error:", error.message);
  });
};

startServer();
