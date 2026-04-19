export const buildCatalogPath = (...segments) =>
  `/products/${segments.flat().filter(Boolean).join("/")}`;

export const buildCategoryPathFromBreadcrumbs = (breadcrumbs, nextSlug) =>
  buildCatalogPath(
    breadcrumbs.map((item) => item.slug),
    nextSlug
  );

export const buildProductPathFromBreadcrumbs = (breadcrumbs, productSlug) =>
  buildCatalogPath(
    breadcrumbs.map((item) => item.slug),
    productSlug
  );

export const buildBrochurePath = (categorySlug = "") => {
  if (!categorySlug) {
    return "/brochures";
  }

  const searchParams = new URLSearchParams({
    category: categorySlug
  });

  return `/brochures?${searchParams.toString()}`;
};
