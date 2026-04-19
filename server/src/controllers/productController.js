import { getDbPool } from "../config/db.js";

const parseJsonArray = (value) => {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
};

const buildCategoryTree = (categories, products) => {
  const categoryMap = new Map(
    categories.map((category) => [
      category.id,
      {
        ...category,
        childCategories: [],
        products: []
      }
    ])
  );

  for (const product of products) {
    const parentCategory = categoryMap.get(product.categoryId);

    if (parentCategory) {
      parentCategory.products.push(product);
    }
  }

  const roots = [];

  for (const category of categoryMap.values()) {
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId);

      if (parent) {
        parent.childCategories.push(category);
      }
    } else {
      roots.push(category);
    }
  }

  return roots;
};

const loadCategoryRows = async (pool) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        parent_id AS parentId,
        name,
        slug,
        short_description AS shortDescription,
        full_description AS fullDescription,
        image,
        image_gallery_json AS imageGalleryJson,
        brochure_file_name AS brochureFileName,
        sort_order AS sortOrder
      FROM catalog_categories
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, name ASC
    `
  );

  return rows.map((row) => ({
    ...row,
    imageGallery: parseJsonArray(row.imageGalleryJson)
  }));
};

const loadProductSummaryRows = async (pool, limit = null) => {
  const safeLimit = Number(limit);
  const hasLimit = Number.isInteger(safeLimit) && safeLimit > 0;
  const query = `
      SELECT
        catalog_products.id,
        catalog_products.category_id AS categoryId,
        catalog_products.name,
        catalog_products.slug,
        catalog_products.short_description AS shortDescription,
        catalog_products.image,
        catalog_products.brochure_file_name AS brochureFileName,
        catalog_categories.slug AS categorySlug,
        catalog_categories.name AS categoryName
      FROM catalog_products
      INNER JOIN catalog_categories ON catalog_categories.id = catalog_products.category_id
      WHERE catalog_products.is_active = TRUE
      ORDER BY catalog_products.created_at DESC
      ${hasLimit ? "LIMIT ?" : ""}
    `;

  const [rows] = await pool.execute(query, hasLimit ? [safeLimit] : []);
  return rows;
};

const buildBreadcrumbs = (categories, startCategoryId) => {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const breadcrumbs = [];
  let currentCategoryId = startCategoryId;

  while (currentCategoryId) {
    const currentCategory = categoryMap.get(currentCategoryId);

    if (!currentCategory) {
      break;
    }

    breadcrumbs.unshift({
      id: currentCategory.id,
      name: currentCategory.name,
      slug: currentCategory.slug
    });

    currentCategoryId = currentCategory.parentId;
  }

  return breadcrumbs;
};

export const getCatalogNavigation = async (_req, res) => {
  try {
    const pool = getDbPool();
    const [categories, products] = await Promise.all([
      loadCategoryRows(pool),
      loadProductSummaryRows(pool)
    ]);

    const tree = buildCategoryTree(categories, products);
    res.status(200).json(tree);
  } catch (error) {
    console.error("Error fetching catalog navigation:", error.message);
    res.status(500).json({ message: "Failed to fetch catalog navigation" });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const pool = getDbPool();
    const rows = await loadProductSummaryRows(pool, req.query.limit || null);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const pool = getDbPool();
    const [allCategories, directProducts] = await Promise.all([
      loadCategoryRows(pool),
      pool.execute(
        `
          SELECT
            catalog_products.id,
            catalog_products.name,
            catalog_products.slug,
            catalog_products.short_description AS shortDescription,
            catalog_products.image,
            catalog_products.brochure_file_name AS brochureFileName
          FROM catalog_products
          INNER JOIN catalog_categories ON catalog_categories.id = catalog_products.category_id
          WHERE catalog_categories.slug = ?
            AND catalog_products.is_active = TRUE
          ORDER BY catalog_products.name ASC
        `,
        [slug]
      )
    ]);

    const category = allCategories.find((entry) => entry.slug === slug);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const childCategories = allCategories.filter(
      (entry) => entry.parentId === category.id
    );

    res.status(200).json({
      category,
      breadcrumbs: buildBreadcrumbs(allCategories, category.id),
      childCategories,
      products: directProducts[0]
    });
  } catch (error) {
    console.error("Error fetching category:", error.message);
    res.status(500).json({ message: "Failed to fetch category" });
  }
};

export const getSingleProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const pool = getDbPool();

    const [productRows] = await pool.execute(
      `
        SELECT
          catalog_products.id,
          catalog_products.category_id AS categoryId,
          catalog_products.name,
          catalog_products.slug,
          catalog_products.short_description AS shortDescription,
          catalog_products.full_description AS fullDescription,
          catalog_products.image,
          catalog_products.brochure_file_name AS brochureFileName,
          catalog_products.key_features_json AS featuresJson,
          catalog_products.applications_json AS applicationsJson,
          catalog_categories.name AS categoryName,
          catalog_categories.slug AS categorySlug
        FROM catalog_products
        INNER JOIN catalog_categories ON catalog_categories.id = catalog_products.category_id
        WHERE catalog_products.slug = ?
          AND catalog_products.is_active = TRUE
        LIMIT 1
      `,
      [slug]
    );

    if (productRows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = productRows[0];

    const [allCategories, specRows, relatedRows] = await Promise.all([
      loadCategoryRows(pool),
      pool.execute(
        `
          SELECT
            spec_label AS label,
            spec_value AS value
          FROM catalog_product_specifications
          WHERE product_id = ?
          ORDER BY id ASC
        `,
        [product.id]
      ),
      pool.execute(
        `
          SELECT
            id,
            name,
            slug,
            short_description AS shortDescription,
            image
          FROM catalog_products
          WHERE category_id = ?
            AND slug <> ?
            AND is_active = TRUE
          ORDER BY created_at DESC
          LIMIT 3
        `,
        [product.categoryId, slug]
      )
    ]);

    res.status(200).json({
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      fullDescription: product.fullDescription,
      image: product.image,
      brochureFileName: product.brochureFileName,
      features: parseJsonArray(product.featuresJson),
      applications: parseJsonArray(product.applicationsJson),
      specifications: specRows[0],
      breadcrumbs: buildBreadcrumbs(allCategories, product.categoryId),
      relatedProducts: relatedRows[0]
    });
  } catch (error) {
    console.error("Error fetching single product:", error.message);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};
