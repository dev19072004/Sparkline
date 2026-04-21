import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { resolveAssetUrl } from "../lib/media";

export const SEO_DEFAULTS = {
  baseUrl: "https://sparklineindia.com",
  title: "Sparkline | Construction Machinery and Spare Parts",
  description:
    "Sparkline offers construction machinery, spare parts, brochures, gallery media, and service support for bar cutting, bar bending, suspended platforms, passenger hoists, and more.",
  image: "/images/logo.png",
  robots: "index, follow"
};

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const getSiteOrigin = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return SEO_DEFAULTS.baseUrl;
};

const ensureMetaTag = (selector, attributeName, attributeValue) => {
  let tag = document.head.querySelector(selector);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attributeName, attributeValue);
    document.head.append(tag);
  }

  return tag;
};

const ensureLinkTag = (selector, relValue) => {
  let tag = document.head.querySelector(selector);

  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", relValue);
    document.head.append(tag);
  }

  return tag;
};

const normalizeStructuredData = (structuredData) => {
  if (!structuredData) {
    return [];
  }

  return (Array.isArray(structuredData) ? structuredData : [structuredData]).filter(Boolean);
};

export const toAbsoluteSeoUrl = (value = "") => {
  const normalizedValue = resolveAssetUrl(value) || String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  if (ABSOLUTE_URL_PATTERN.test(normalizedValue)) {
    return normalizedValue;
  }

  return new URL(
    normalizedValue.startsWith("/") ? normalizedValue : `/${normalizedValue}`,
    getSiteOrigin()
  ).toString();
};

const syncStructuredData = (structuredData) => {
  document.head
    .querySelectorAll('script[data-seo-structured-data="true"]')
    .forEach((script) => script.remove());

  for (const entry of normalizeStructuredData(structuredData)) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seoStructuredData = "true";
    script.textContent = JSON.stringify(entry);
    document.head.append(script);
  }
};

export const applySeo = ({
  title = SEO_DEFAULTS.title,
  description = SEO_DEFAULTS.description,
  image = SEO_DEFAULTS.image,
  canonicalPath = "/",
  robots = SEO_DEFAULTS.robots,
  structuredData = null
} = {}) => {
  if (typeof document === "undefined") {
    return;
  }

  const canonicalUrl = toAbsoluteSeoUrl(canonicalPath || "/");
  const imageUrl = toAbsoluteSeoUrl(image || SEO_DEFAULTS.image);

  document.title = title;

  ensureMetaTag('meta[name="description"]', "name", "description").setAttribute(
    "content",
    description
  );
  ensureMetaTag('meta[name="robots"]', "name", "robots").setAttribute("content", robots);
  ensureMetaTag('meta[property="og:title"]', "property", "og:title").setAttribute(
    "content",
    title
  );
  ensureMetaTag(
    'meta[property="og:description"]',
    "property",
    "og:description"
  ).setAttribute("content", description);
  ensureMetaTag('meta[property="og:url"]', "property", "og:url").setAttribute(
    "content",
    canonicalUrl
  );
  ensureMetaTag('meta[property="og:image"]', "property", "og:image").setAttribute(
    "content",
    imageUrl
  );
  ensureMetaTag('meta[name="twitter:title"]', "name", "twitter:title").setAttribute(
    "content",
    title
  );
  ensureMetaTag(
    'meta[name="twitter:description"]',
    "name",
    "twitter:description"
  ).setAttribute("content", description);
  ensureMetaTag('meta[name="twitter:image"]', "name", "twitter:image").setAttribute(
    "content",
    imageUrl
  );

  ensureLinkTag('link[rel="canonical"]', "canonical").setAttribute("href", canonicalUrl);

  syncStructuredData(structuredData);
};

export const useDefaultSeo = () => {
  const location = useLocation();

  useEffect(() => {
    applySeo({
      canonicalPath: `${location.pathname}${location.search}`
    });
  }, [location.pathname, location.search]);
};

export const usePageSeo = ({
  title,
  description,
  image,
  canonicalPath,
  robots,
  structuredData
} = {}) => {
  const location = useLocation();
  const resolvedCanonicalPath =
    canonicalPath || `${location.pathname}${location.search}`;
  const structuredDataKey = JSON.stringify(normalizeStructuredData(structuredData));

  useEffect(() => {
    applySeo({
      title,
      description,
      image,
      canonicalPath: resolvedCanonicalPath,
      robots,
      structuredData
    });
  }, [
    title,
    description,
    image,
    resolvedCanonicalPath,
    robots,
    structuredData,
    structuredDataKey
  ]);
};
