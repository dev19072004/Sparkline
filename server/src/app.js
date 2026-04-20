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
import { getSitemapXml } from "./controllers/sitemapController.js";
import { optionalAuth } from "./middleware/authMiddleware.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");
const clientBuildDirectoryPath = path.join(projectRoot, "dist");
const publicDirectoryPath = path.join(projectRoot, "public");
const clientIndexFilePath = path.join(clientBuildDirectoryPath, "index.html");
const hasClientBuild = () => fs.existsSync(clientIndexFilePath);

const normalizeHostname = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");

const parseOrigin = (value = "") => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const allowedOrigins = [
  process.env.FRONTEND_URL || "",
  process.env.APP_BASE_URL || ""
]
  .join(",")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOriginSet = new Set(
  allowedOrigins.map((origin) => {
    const parsedOrigin = parseOrigin(origin);
    return parsedOrigin ? parsedOrigin.origin : origin.replace(/\/$/, "");
  })
);

const allowedHostnames = new Set(
  allowedOrigins
    .map((origin) => parseOrigin(origin)?.hostname || "")
    .map((hostname) => normalizeHostname(hostname))
    .filter(Boolean)
);

const isAllowedOrigin = (origin, requestHost = "") => {
  if (!origin) {
    return true;
  }

  const parsedOrigin = parseOrigin(origin);
  const normalizedOrigin = parsedOrigin ? parsedOrigin.origin : origin.replace(/\/$/, "");
  const originHostname = normalizeHostname(parsedOrigin?.hostname || "");
  const requestHostname = normalizeHostname(String(requestHost).split(":")[0]);

  if (allowedOriginSet.has(normalizedOrigin)) {
    return true;
  }

  if (originHostname && allowedHostnames.has(originHostname)) {
    return true;
  }

  if (originHostname && requestHostname && originHostname === requestHostname) {
    return true;
  }

  if (originHostname.endsWith(".hostingersite.com")) {
    return true;
  }

  return false;
};

const requiresDatabase = (requestPath = "") =>
  requestPath === "/sitemap.xml" || requestPath.startsWith("/api/");

app.use(
  cors((req, callback) => {
    const requestOrigin = req.header("Origin") || "";
    const requestHost = req.header("Host") || "";

    callback(
      null,
      {
        origin: isAllowedOrigin(requestOrigin, requestHost),
        optionsSuccessStatus: 204
      }
    );
  })
);
app.use(express.json({ limit: "200mb" }));
app.use(optionalAuth);

app.get("/healthz", (_req, res) => {
  const startupState = app.locals.startupState || {};

  if (startupState.databaseReady) {
    res.status(200).json({
      status: "ok",
      databaseReady: true,
      lastSuccessAt: startupState.lastSuccessAt || null
    });
    return;
  }

  res.status(503).json({
    status: "starting",
    databaseReady: false,
    isBootstrapping: Boolean(startupState.isBootstrapping),
    lastAttemptAt: startupState.lastAttemptAt || null,
    message: startupState.startupError || "Database initialization is in progress"
  });
});

app.use((req, res, next) => {
  if (!requiresDatabase(req.path)) {
    next();
    return;
  }

  const startupState = app.locals.startupState || {};

  if (startupState.databaseReady) {
    next();
    return;
  }

  const message =
    startupState.startupError ||
    "Server is starting. Please try again in a moment.";

  if (req.path === "/sitemap.xml") {
    res
      .status(503)
      .type("text/plain; charset=utf-8")
      .send(message);
    return;
  }

  res.status(503).json({
    message,
    status: "starting",
    databaseReady: false
  });
});

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

app.get("/sitemap.xml", getSitemapXml);

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
