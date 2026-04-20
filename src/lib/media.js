const ABSOLUTE_URL_PATTERN = /^(?:https?:)?\/\//i;
const SPECIAL_URL_PATTERN = /^(?:data:|blob:)/i;

const normalizeRelativeAssetPath = (value) => {
  const normalizedValue = String(value).replace(/\\/g, "/");

  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.startsWith("/")) {
    return normalizedValue;
  }

  if (normalizedValue.startsWith("public/")) {
    return `/${normalizedValue.slice("public/".length)}`;
  }

  const publicMarker = "/public/";
  const publicMarkerIndex = normalizedValue.lastIndexOf(publicMarker);

  if (publicMarkerIndex >= 0) {
    return normalizedValue.slice(publicMarkerIndex + publicMarker.length - 1);
  }

  if (
    normalizedValue.startsWith("images/") ||
    normalizedValue.startsWith("gallery/") ||
    normalizedValue.startsWith("brochure/")
  ) {
    return `/${normalizedValue}`;
  }

  return normalizedValue;
};

export const resolveAssetUrl = (value = "") => {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (
    ABSOLUTE_URL_PATTERN.test(trimmedValue) ||
    SPECIAL_URL_PATTERN.test(trimmedValue)
  ) {
    return trimmedValue;
  }

  return normalizeRelativeAssetPath(trimmedValue);
};

export const getCatalogEntryImage = (entry) => {
  const galleryImage =
    Array.isArray(entry?.imageGallery) && entry.imageGallery.length
      ? entry.imageGallery.find(Boolean)
      : "";

  return resolveAssetUrl(galleryImage || entry?.image || "");
};

export const getCatalogEntryDescription = (entry) => {
  const shortDescription = String(entry?.shortDescription || "").trim();
  const fullDescription = String(entry?.fullDescription || "").trim();

  return shortDescription || fullDescription;
};
