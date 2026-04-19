import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { catalogSeed } from "../data/catalogSeed.js";
import { hashPassword } from "../utils/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaFilePath = path.resolve(__dirname, "../sql/schema.sql");

const DEFAULT_CATEGORY_BROCHURES = {
  "bar-cutting-machine-scm": "bar-cutting.pdf",
  "bar-bending-machine-sbm": "bar-bending.pdf",
  "series-of-rope-suspended-platform-srp": "rope-suspended-platform.pdf",
  "series-of-passenger-material-hoist-spm": "spm-and-smh.pdf",
  "multi-functional-passenger-material-hoist-smh": "spm-and-smh.pdf",
  "scrap-straightening-machine": "scrap-and-ring.pdf",
  "ring-making-machine": "scrap-and-ring.pdf",
  "self-loading-concrete-batching-vehicle": "self-loading-concrete-batching-vehicle.pdf"
};

const splitSqlStatements = (sql) =>
  sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

const hasColumn = async (pool, tableName, columnName) => {
  const [rows] = await pool.execute(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [process.env.DB_NAME, tableName, columnName]
  );

  return rows[0].count > 0;
};

const ensureColumn = async (pool, tableName, columnName, definition) => {
  if (await hasColumn(pool, tableName, columnName)) {
    return;
  }

  await pool.query(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
  );
};

export const runSchema = async (pool) => {
  const schemaSql = await fs.readFile(schemaFilePath, "utf8");
  const statements = splitSqlStatements(schemaSql);

  for (const statement of statements) {
    await pool.query(statement);
  }

  await ensureColumn(pool, "quote_enquiries", "admin_feedback", "TEXT NULL");
  await ensureColumn(pool, "quote_enquiries", "contacted_at", "DATETIME NULL");
  await ensureColumn(pool, "quote_enquiries", "user_id", "INT NULL");
  await ensureColumn(
    pool,
    "quote_enquiries",
    "source_type",
    "VARCHAR(50) DEFAULT 'quote'"
  );
  await ensureColumn(
    pool,
    "quote_enquiries",
    "updated_at",
    "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  );

  await pool.execute(
    `
      UPDATE quote_enquiries
      SET source_type = 'quote'
      WHERE source_type IS NULL OR source_type = ''
    `
  );

  await ensureColumn(
    pool,
    "brochure_leads",
    "status",
    "VARCHAR(50) DEFAULT 'new'"
  );
  await ensureColumn(pool, "brochure_leads", "user_id", "INT NULL");
  await ensureColumn(pool, "brochure_leads", "admin_feedback", "TEXT NULL");
  await ensureColumn(pool, "brochure_leads", "contacted_at", "DATETIME NULL");
  await ensureColumn(
    pool,
    "brochure_leads",
    "updated_at",
    "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  );
  await ensureColumn(
    pool,
    "catalog_categories",
    "brochure_file_name",
    "VARCHAR(255) NULL"
  );
  await ensureColumn(
    pool,
    "catalog_categories",
    "image_gallery_json",
    "LONGTEXT NULL"
  );
  await ensureColumn(pool, "admin_tasks", "due_on", "DATE NULL");
  await ensureColumn(pool, "admin_tasks", "completed_at", "DATETIME NULL");
  await ensureColumn(
    pool,
    "spare_parts_inventory",
    "related_product_ids_json",
    "LONGTEXT NULL"
  );

  const [categoryImageRows] = await pool.execute(
    `
      SELECT id, image
      FROM catalog_categories
      WHERE (image_gallery_json IS NULL OR image_gallery_json = '')
        AND image IS NOT NULL
        AND image <> ''
    `
  );

  for (const category of categoryImageRows) {
    await pool.execute(
      `
        UPDATE catalog_categories
        SET image_gallery_json = ?
        WHERE id = ?
      `,
      [JSON.stringify([category.image]), category.id]
    );
  }
};

const insertCategoryTree = async (pool, category, parentId = null) => {
  const [result] = await pool.execute(
    `
      INSERT INTO catalog_categories (
        name,
        slug,
        parent_id,
        short_description,
        full_description,
        image,
        image_gallery_json,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      category.name,
      category.slug,
      parentId,
      category.shortDescription,
      category.fullDescription,
      category.image,
      JSON.stringify([category.image]),
      category.sortOrder || 0
    ]
  );

  const categoryId = result.insertId;

  if (Array.isArray(category.products)) {
    for (const product of category.products) {
      const [productResult] = await pool.execute(
        `
          INSERT INTO catalog_products (
            category_id,
            name,
            slug,
            short_description,
            full_description,
            image,
            brochure_file_name,
            key_features_json,
            applications_json
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          categoryId,
          product.name,
          product.slug,
          product.shortDescription,
          product.fullDescription,
          product.image,
          product.brochureFileName || "SPARKLINE-8.pdf",
          JSON.stringify(product.features || []),
          JSON.stringify(product.applications || [])
        ]
      );

      if (Array.isArray(product.specifications)) {
        for (const specification of product.specifications) {
          await pool.execute(
            `
              INSERT INTO catalog_product_specifications (
                product_id,
                spec_label,
                spec_value
              )
              VALUES (?, ?, ?)
            `,
            [productResult.insertId, specification.label, specification.value]
          );
        }
      }
    }
  }

  if (Array.isArray(category.children)) {
    for (const childCategory of category.children) {
      await insertCategoryTree(pool, childCategory, categoryId);
    }
  }
};

export const seedCatalog = async (pool) => {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM catalog_categories"
  );

  if (rows[0].count > 0) {
    return;
  }

  for (const category of catalogSeed) {
    await insertCategoryTree(pool, category);
  }
};

export const applyDefaultCategoryBrochures = async (pool) => {
  for (const [categorySlug, brochureFileName] of Object.entries(
    DEFAULT_CATEGORY_BROCHURES
  )) {
    await pool.execute(
      `
        UPDATE catalog_categories
        SET brochure_file_name = ?
        WHERE slug = ?
          AND is_active = TRUE
          AND (
            brochure_file_name IS NULL
            OR brochure_file_name = ''
          )
      `,
      [brochureFileName, categorySlug]
    );
  }
};

const upsertStaffAccount = async (pool, account) => {
  const normalizedEmail = String(account.email || "").trim().toLowerCase();

  if (!normalizedEmail || !account.password) {
    return;
  }

  const [rows] = await pool.execute(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [normalizedEmail]
  );

  const passwordHash = hashPassword(account.password);

  if (rows.length > 0) {
    await pool.execute(
      `
        UPDATE users
        SET
          full_name = ?,
          phone = ?,
          company_name = ?,
          designation = ?,
          password_hash = ?,
          role = ?,
          is_active = TRUE,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        account.fullName,
        account.phone,
        account.companyName,
        account.designation,
        passwordHash,
        account.role,
        rows[0].id
      ]
    );

    return;
  }

  await pool.execute(
    `
      INSERT INTO users (
        full_name,
        email,
        phone,
        company_name,
        designation,
        password_hash,
        role,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
    `,
    [
      account.fullName,
      normalizedEmail,
      account.phone,
      account.companyName,
      account.designation,
      passwordHash,
      account.role
    ]
  );
};

export const seedStaffAccounts = async (pool) => {
  const ownerEmail = process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD || process.env.ADMIN_PASSWORD;

  await upsertStaffAccount(pool, {
    fullName: process.env.OWNER_NAME || process.env.ADMIN_NAME || "Devanshu Verma",
    email: ownerEmail,
    password: ownerPassword,
    phone: process.env.OWNER_PHONE || process.env.ADMIN_PHONE || "9054606803",
    companyName: process.env.OWNER_COMPANY || process.env.ADMIN_COMPANY || "Sparkline",
    designation: process.env.OWNER_DESIGNATION || "Owner",
    role: "owner"
  });

  const shouldSeedDefaultAdmin =
    String(process.env.SEED_DEFAULT_ADMIN || "false").trim().toLowerCase() === "true";

  if (!shouldSeedDefaultAdmin) {
    return;
  }

  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || "";
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "";

  if (!defaultAdminEmail || !defaultAdminPassword) {
    return;
  }

  if (
    defaultAdminEmail &&
    ownerEmail &&
    defaultAdminEmail.trim().toLowerCase() === ownerEmail.trim().toLowerCase()
  ) {
    return;
  }

  await upsertStaffAccount(pool, {
    fullName: process.env.DEFAULT_ADMIN_NAME || "Spares Admin",
    email: defaultAdminEmail,
    password: defaultAdminPassword,
    phone: process.env.DEFAULT_ADMIN_PHONE || "",
    companyName: process.env.DEFAULT_ADMIN_COMPANY || "Sparkline",
    designation: process.env.DEFAULT_ADMIN_DESIGNATION || "Admin",
    role: "admin"
  });
};
