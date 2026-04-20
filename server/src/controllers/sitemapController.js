import { getDbPool } from "../config/db.js";
import { services } from "../../../src/data/siteData.js";

const staticPublicPages = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/gallery", changefreq: "weekly", priority: "0.7" },
  { path: "/brochures", changefreq: "weekly", priority: "0.7" },
  { path: "/quote", changefreq: "weekly", priority: "0.7" },
  { path: "/spare-parts-inquiry", changefreq: "weekly", priority: "0.6" }
];

const servicePages = services.map((service) => ({
  path: `/services/${service.slug}`,
  changefreq: "monthly",
  priority: "0.7"
}));

const defaultSitemapEntries = [...staticPublicPages, ...servicePages];

const escapeXml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const normalizeBaseUrl = (value = "") => String(value).trim().replace(/\/+$/, "");

const getBaseUrl = (req) => {
  const configuredBaseUrl = normalizeBaseUrl(
    process.env.APP_BASE_URL || process.env.FRONTEND_URL || ""
  );

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const forwardedProto = String(req.header("x-forwarded-proto") || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = String(req.header("x-forwarded-host") || "")
    .split(",")[0]
    .trim();
  const host = forwardedHost || String(req.header("host") || "").trim();

  return normalizeBaseUrl(host ? `${protocol}://${host}` : "http://localhost:3000");
};

const formatLastModified = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const buildCategoryPathSegments = (categoryId, categoryMap, pathCache) => {
  if (!categoryId || pathCache.has(categoryId)) {
    return pathCache.get(categoryId) || [];
  }

  const category = categoryMap.get(categoryId);

  if (!category) {
    return [];
  }

  const parentSegments = category.parentId
    ? buildCategoryPathSegments(category.parentId, categoryMap, pathCache)
    : [];
  const nextSegments = [...parentSegments, category.slug];

  pathCache.set(categoryId, nextSegments);
  return nextSegments;
};

const buildXmlUrlEntry = (baseUrl, { path, lastmod = null, changefreq, priority }) => {
  const lines = [
    "  <url>",
    `    <loc>${escapeXml(`${baseUrl}${path}`)}</loc>`
  ];

  if (lastmod) {
    lines.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
  }

  if (changefreq) {
    lines.push(`    <changefreq>${escapeXml(changefreq)}</changefreq>`);
  }

  if (priority) {
    lines.push(`    <priority>${escapeXml(priority)}</priority>`);
  }

  lines.push("  </url>");
  return lines.join("\n");
};

const createUrlStore = () => {
  const publicUrls = new Map();

  const addUrl = (path, details = {}) => {
    if (!path || publicUrls.has(path)) {
      return;
    }

    publicUrls.set(path, { path, ...details });
  };

  for (const page of defaultSitemapEntries) {
    addUrl(page.path, page);
  }

  return { publicUrls, addUrl };
};

const addCatalogUrls = async (addUrl) => {
  const pool = getDbPool();
  const [categoryRows] = await pool.execute(
    `
      SELECT
        id,
        parent_id AS parentId,
        slug,
        updated_at AS updatedAt,
        sort_order AS sortOrder
      FROM catalog_categories
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, name ASC
    `
  );

  const [productRows] = await pool.execute(
    `
      SELECT
        slug,
        category_id AS categoryId,
        updated_at AS updatedAt
      FROM catalog_products
      WHERE is_active = TRUE
      ORDER BY updated_at DESC, name ASC
    `
  );

  const categoryMap = new Map(categoryRows.map((category) => [category.id, category]));
  const categoryPathCache = new Map();

  for (const category of categoryRows) {
    const categoryPathSegments = buildCategoryPathSegments(
      category.id,
      categoryMap,
      categoryPathCache
    );

    if (!categoryPathSegments.length) {
      continue;
    }

    addUrl(`/products/${categoryPathSegments.join("/")}`, {
      lastmod: formatLastModified(category.updatedAt),
      changefreq: "weekly",
      priority: category.parentId ? "0.8" : "0.9"
    });
  }

  for (const product of productRows) {
    const categoryPathSegments = buildCategoryPathSegments(
      product.categoryId,
      categoryMap,
      categoryPathCache
    );

    if (!categoryPathSegments.length) {
      continue;
    }

    addUrl(`/products/${categoryPathSegments.join("/")}/${product.slug}`, {
      lastmod: formatLastModified(product.updatedAt),
      changefreq: "weekly",
      priority: "0.8"
    });
  }
};

export const getSitemapXml = async (req, res) => {
  try {
    const { publicUrls, addUrl } = createUrlStore();
    let usedFallback = false;

    try {
      await addCatalogUrls(addUrl);
    } catch (error) {
      usedFallback = true;
      console.error("Error enriching sitemap with catalog URLs:", error.message);
    }

    const baseUrl = getBaseUrl(req);
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...Array.from(publicUrls.values()).map((entry) => buildXmlUrlEntry(baseUrl, entry)),
      "</urlset>"
    ].join("\n");

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    if (usedFallback) {
      res.set("X-Sitemap-Fallback", "1");
    }
    res.status(200).send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error.message);
    res.status(500).json({ message: "Failed to generate sitemap" });
  }
};
