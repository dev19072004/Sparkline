import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import productRoutes from "./routes/productRoutes.js";
import quoteRoutes from "./routes/quoteRoutes.js";
import brochureRoutes from "./routes/brochureRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import galleryRoutes from "./routes/galleryRoutes.js";
import { optionalAuth } from "./middleware/authMiddleware.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");
const clientBuildDirectoryPath = path.join(projectRoot, "dist");
const publicDirectoryPath = path.join(projectRoot, "public");
const clientIndexFilePath = path.join(clientBuildDirectoryPath, "index.html");
const hasClientBuild = () => fs.existsSync(clientIndexFilePath);

const allowedOrigins = [
  process.env.FRONTEND_URL || "",
  process.env.APP_BASE_URL || ""
]
  .join(",")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    }
  })
);
app.use(express.json({ limit: "200mb" }));
app.use(optionalAuth);

if (fs.existsSync(publicDirectoryPath)) {
  app.use(express.static(publicDirectoryPath));
}

app.use(express.static(clientBuildDirectoryPath));

app.get("/", (_req, res) => {
  if (hasClientBuild()) {
    res.sendFile(clientIndexFilePath);
    return;
  }

  res.json({ message: "Sparkline API is running" });
});

app.use("/api/products", productRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/brochure-leads", brochureRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/admin", adminRoutes);

app.get(/^(?!\/api(?:\/|$)).*/, (_req, res, next) => {
  if (!hasClientBuild()) {
    next();
    return;
  }

  res.sendFile(clientIndexFilePath);
});

app.use((error, _req, res, next) => {
  if (!error) {
    next();
    return;
  }

  if (error.type === "entity.too.large") {
    res.status(413).json({
      message:
        "Upload request is too large. Gallery images can be up to 10 MB, gallery videos up to 100 MB, and category or product images up to 5 MB."
    });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  console.error("App error:", error.message);
  res.status(error.status || 500).json({ message: error.message || "Server error" });
});

export default app;
