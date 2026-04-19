import { getDbPool } from "../config/db.js";
import { saveBrochureUpload } from "../services/brochureStorage.js";
import {
  saveCategoryImageUploads,
  saveProductImageUpload
} from "../services/imageStorage.js";
import { deleteGalleryMediaFile, saveGalleryMediaUpload } from "../services/mediaStorage.js";
import { hashPassword } from "../utils/auth.js";
import {
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone
} from "../utils/validation.js";

const ALLOWED_INQUIRY_STATUSES = ["new", "called", "resolved", "not_resolved"];
const ALLOWED_TASK_STATUSES = ["open", "completed"];

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseJsonArray = (value) => {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
};

const parseJsonValue = (value) => {
  try {
    return JSON.parse(value || "null");
  } catch {
    return null;
  }
};

const parseLineArray = (value) =>
  Array.isArray(value)
    ? value.map((entry) => String(entry).trim()).filter(Boolean)
    : String(value || "")
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean);

const parseSpecifications = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((specification) => ({
        label: String(specification.label || "").trim(),
        value: String(specification.value || "").trim()
      }))
      .filter((specification) => specification.label && specification.value);
  }

  return String(value || "")
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [label, ...rest] = entry.split(":");

      return {
        label: String(label || "").trim(),
        value: rest.join(":").trim()
      };
    })
    .filter((specification) => specification.label && specification.value);
};

const formatStatusLabel = (value) => String(value || "").replaceAll("_", " ");

const normalizeDueOn = (value) => {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return null;
  }

  const normalizedValue = trimmedValue.includes("T")
    ? trimmedValue.split("T")[0]
    : trimmedValue;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    throw new Error("Invalid task deadline");
  }

  return normalizedValue;
};

const buildTaskTitle = (title, description) => {
  const trimmedTitle = String(title || "").trim();

  if (trimmedTitle) {
    return trimmedTitle.slice(0, 255);
  }

  return String(description || "")
    .trim()
    .split(/\s+/)
    .slice(0, 12)
    .join(" ")
    .slice(0, 255);
};

const recordAuditLog = async (
  pool,
  { actorUserId, actionType, entityType, entityId = null, description, metadata = null }
) => {
  if (!actorUserId || !description) {
    return;
  }

  await pool.execute(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        action_type,
        entity_type,
        entity_id,
        description,
        metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      Number(actorUserId),
      String(actionType || "").trim(),
      String(entityType || "").trim(),
      entityId ? Number(entityId) : null,
      String(description).trim(),
      metadata ? JSON.stringify(metadata) : null
    ]
  );
};

const decorateCategoriesWithRoot = (categories) => {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return categories.map((category) => {
    let currentCategory = category;
    let rootCategory = category;

    while (currentCategory.parentId) {
      currentCategory = categoryMap.get(currentCategory.parentId);

      if (!currentCategory) {
        break;
      }

      rootCategory = currentCategory;
    }

    return {
      ...category,
      rootId: rootCategory.id,
      rootSlug: rootCategory.slug,
      rootName: rootCategory.name
    };
  });
};

const loadAdminCategories = async (pool) => {
  const [rows] = await pool.execute(
    `
      SELECT
        catalog_categories.id,
        catalog_categories.parent_id AS parentId,
        catalog_categories.name,
        catalog_categories.slug,
        catalog_categories.short_description AS shortDescription,
        catalog_categories.full_description AS fullDescription,
        catalog_categories.image,
        catalog_categories.image_gallery_json AS imageGalleryJson,
        catalog_categories.brochure_file_name AS brochureFileName,
        catalog_categories.sort_order AS sortOrder,
        (
          SELECT COUNT(*)
          FROM catalog_products
          WHERE catalog_products.category_id = catalog_categories.id
            AND catalog_products.is_active = TRUE
        ) AS productCount
      FROM catalog_categories
      WHERE catalog_categories.is_active = TRUE
      ORDER BY catalog_categories.parent_id IS NULL DESC, catalog_categories.sort_order ASC, catalog_categories.name ASC
    `
  );

  return decorateCategoriesWithRoot(
    rows.map((row) => ({
      ...row,
      imageGallery: parseJsonArray(row.imageGalleryJson)
    }))
  );
};

const loadAdminProducts = async (pool, categories) => {
  const [productRows, specificationRows] = await Promise.all([
    pool.query(
      `
        SELECT
          catalog_products.id,
          catalog_products.name,
          catalog_products.slug,
          catalog_products.short_description AS shortDescription,
          catalog_products.full_description AS fullDescription,
          catalog_products.image,
          catalog_products.brochure_file_name AS brochureFileName,
          catalog_products.key_features_json AS featuresJson,
          catalog_products.applications_json AS applicationsJson,
          catalog_products.created_at AS createdAt,
          catalog_products.updated_at AS updatedAt,
          catalog_categories.id AS categoryId,
          catalog_categories.name AS categoryName,
          catalog_categories.slug AS categorySlug
        FROM catalog_products
        INNER JOIN catalog_categories ON catalog_categories.id = catalog_products.category_id
        WHERE catalog_products.is_active = TRUE
        ORDER BY catalog_products.created_at DESC
      `
    ),
    pool.query(
      `
        SELECT
          product_id AS productId,
          spec_label AS label,
          spec_value AS value
        FROM catalog_product_specifications
        ORDER BY id ASC
      `
    )
  ]);

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const specificationMap = specificationRows[0].reduce((map, specification) => {
    if (!map.has(specification.productId)) {
      map.set(specification.productId, []);
    }

    map.get(specification.productId).push({
      label: specification.label,
      value: specification.value
    });

    return map;
  }, new Map());

  return productRows[0].map((product) => {
    const category = categoryMap.get(product.categoryId);

    return {
      ...product,
      rootId: category?.rootId || product.categoryId,
      rootSlug: category?.rootSlug || product.categorySlug,
      rootName: category?.rootName || product.categoryName,
      features: parseJsonArray(product.featuresJson),
      applications: parseJsonArray(product.applicationsJson),
      specifications: specificationMap.get(product.id) || []
    };
  });
};

const loadCategoryById = async (pool, categoryId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        catalog_categories.id,
        catalog_categories.parent_id AS parentId,
        catalog_categories.name,
        catalog_categories.slug,
        catalog_categories.short_description AS shortDescription,
        catalog_categories.full_description AS fullDescription,
        catalog_categories.image,
        catalog_categories.image_gallery_json AS imageGalleryJson,
        catalog_categories.brochure_file_name AS brochureFileName,
        catalog_categories.sort_order AS sortOrder
      FROM catalog_categories
      WHERE catalog_categories.id = ?
        AND catalog_categories.is_active = TRUE
      LIMIT 1
    `,
    [Number(categoryId)]
  );

  if (!rows.length) {
    return null;
  }

  return {
    ...rows[0],
    imageGallery: parseJsonArray(rows[0].imageGalleryJson)
  };
};

const loadAdminGalleryItems = async (pool) => {
  const [rows] = await pool.query(
    `
      SELECT
        gallery_items.id,
        gallery_items.media_type AS mediaType,
        gallery_items.media_path AS mediaPath,
        gallery_items.description,
        gallery_items.original_file_name AS originalFileName,
        gallery_items.mime_type AS mimeType,
        gallery_items.file_size_bytes AS fileSizeBytes,
        gallery_items.created_at AS createdAt,
        gallery_items.updated_at AS updatedAt,
        users.full_name AS createdByName,
        users.email AS createdByEmail
      FROM gallery_items
      INNER JOIN users ON users.id = gallery_items.created_by_user_id
      WHERE gallery_items.is_active = TRUE
      ORDER BY gallery_items.created_at DESC, gallery_items.id DESC
    `
  );

  return rows;
};

const loadAdminByEmail = async (pool, email) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        full_name AS fullName,
        email,
        role
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [email]
  );

  return rows[0] || null;
};

const loadProductById = async (pool, productId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        catalog_products.id,
        catalog_products.name,
        catalog_products.slug,
        catalog_products.category_id AS categoryId,
        catalog_products.short_description AS shortDescription,
        catalog_products.full_description AS fullDescription,
        catalog_products.image,
        catalog_products.brochure_file_name AS brochureFileName,
        catalog_products.key_features_json AS featuresJson,
        catalog_products.applications_json AS applicationsJson
      FROM catalog_products
      WHERE catalog_products.id = ?
        AND catalog_products.is_active = TRUE
      LIMIT 1
    `,
    [Number(productId)]
  );

  if (!rows.length) {
    return null;
  }

  const [specifications] = await pool.execute(
    `
      SELECT
        spec_label AS label,
        spec_value AS value
      FROM catalog_product_specifications
      WHERE product_id = ?
      ORDER BY id ASC
    `,
    [Number(productId)]
  );

  return {
    ...rows[0],
    features: parseJsonArray(rows[0].featuresJson),
    applications: parseJsonArray(rows[0].applicationsJson),
    specifications
  };
};

const loadAdminSpareParts = async (pool) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        name,
        slug,
        short_description AS shortDescription,
        full_description AS fullDescription,
        image,
        key_features_json AS featuresJson,
        applications_json AS applicationsJson,
        specifications_json AS specificationsJson,
        related_product_ids_json AS relatedProductIdsJson,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM spare_parts_inventory
      WHERE is_active = TRUE
      ORDER BY updated_at DESC, created_at DESC, id DESC
    `
  );

  return rows.map((row) => ({
    ...row,
    features: parseJsonArray(row.featuresJson),
    applications: parseJsonArray(row.applicationsJson),
    specifications: parseJsonArray(row.specificationsJson),
    relatedProductIds: parseJsonArray(row.relatedProductIdsJson)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  }));
};

const loadSparePartById = async (pool, sparePartId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        name,
        slug,
        short_description AS shortDescription,
        full_description AS fullDescription,
        image,
        key_features_json AS featuresJson,
        applications_json AS applicationsJson,
        specifications_json AS specificationsJson,
        related_product_ids_json AS relatedProductIdsJson,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM spare_parts_inventory
      WHERE id = ?
        AND is_active = TRUE
      LIMIT 1
    `,
    [Number(sparePartId)]
  );

  if (!rows.length) {
    return null;
  }

  return {
    ...rows[0],
    features: parseJsonArray(rows[0].featuresJson),
    applications: parseJsonArray(rows[0].applicationsJson),
    specifications: parseJsonArray(rows[0].specificationsJson),
    relatedProductIds: parseJsonArray(rows[0].relatedProductIdsJson)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  };
};

const normalizeRelatedProductIds = async (pool, value) => {
  const requestedIds = Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry > 0)
    )
  );

  if (!requestedIds.length) {
    return [];
  }

  const placeholders = requestedIds.map(() => "?").join(", ");
  const [rows] = await pool.execute(
    `
      SELECT id
      FROM catalog_products
      WHERE is_active = TRUE
        AND id IN (${placeholders})
    `,
    requestedIds
  );

  const availableIds = new Set(rows.map((row) => Number(row.id)));
  const normalizedIds = requestedIds.filter((entry) => availableIds.has(entry));

  if (normalizedIds.length !== requestedIds.length) {
    throw new Error("One or more selected related models are invalid");
  }

  return normalizedIds;
};

const replaceProductSpecifications = async (pool, productId, specifications) => {
  await pool.execute(
    `
      DELETE FROM catalog_product_specifications
      WHERE product_id = ?
    `,
    [Number(productId)]
  );

  for (const specification of specifications) {
    await pool.execute(
      `
        INSERT INTO catalog_product_specifications (
          product_id,
          spec_label,
          spec_value
        )
        VALUES (?, ?, ?)
      `,
      [Number(productId), specification.label, specification.value]
    );
  }
};

export const getAdminOverview = async (_req, res) => {
  try {
    const pool = getDbPool();
    const [counts] = await Promise.all([
      pool.query(
        `
          SELECT
            (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS userCount,
            (SELECT COUNT(*) FROM users WHERE is_active = TRUE AND role = 'admin') AS adminCount,
            (SELECT COUNT(*) FROM users WHERE is_active = TRUE AND role = 'owner') AS ownerCount,
            (SELECT COUNT(*) FROM catalog_products WHERE is_active = TRUE) AS productCount,
            (SELECT COUNT(*) FROM catalog_categories WHERE is_active = TRUE) AS categoryCount,
            (SELECT COUNT(*) FROM quote_enquiries) AS quoteCount,
            (SELECT COUNT(*) FROM brochure_leads) AS brochureLeadCount,
            (
              (SELECT COUNT(*) FROM quote_enquiries WHERE status IN ('new', 'called'))
              +
              (SELECT COUNT(*) FROM brochure_leads WHERE status IN ('new', 'called'))
            ) AS activeInquiryCount,
            (SELECT COUNT(*) FROM admin_tasks WHERE status = 'open') AS openTaskCount
        `
      )
    ]);

    res.status(200).json({
      metrics: counts[0][0]
    });
  } catch (error) {
    console.error("Admin overview error:", error.message);
    res.status(500).json({ message: "Unable to load admin overview" });
  }
};

export const getAdminInquiries = async (_req, res) => {
  try {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `
        SELECT *
        FROM (
          SELECT
            quote_enquiries.id,
            CASE
              WHEN COALESCE(NULLIF(quote_enquiries.source_type, ''), 'quote') = 'spare_parts'
                THEN 'spare_parts'
              WHEN quote_enquiries.message LIKE 'Spare Parts Inquiry:%'
                THEN 'spare_parts'
              ELSE COALESCE(NULLIF(quote_enquiries.source_type, ''), 'quote')
            END AS inquiryType,
            quote_enquiries.full_name AS fullName,
            quote_enquiries.email,
            quote_enquiries.phone,
            quote_enquiries.company_name AS companyName,
            quote_enquiries.designation,
            quote_enquiries.requested_item AS requestedItem,
            quote_enquiries.quantity,
            quote_enquiries.message,
            quote_enquiries.status,
            quote_enquiries.admin_feedback AS adminFeedback,
            quote_enquiries.contacted_at AS contactedAt,
            quote_enquiries.created_at AS createdAt,
            quote_enquiries.updated_at AS updatedAt,
            catalog_products.name AS productName
          FROM quote_enquiries
          LEFT JOIN catalog_products ON catalog_products.id = quote_enquiries.product_id

          UNION ALL

          SELECT
            brochure_leads.id,
            'brochure' AS inquiryType,
            brochure_leads.full_name AS fullName,
            brochure_leads.email,
            brochure_leads.phone,
            brochure_leads.company_name AS companyName,
            brochure_leads.designation,
            brochure_leads.requested_item AS requestedItem,
            NULL AS quantity,
            CONCAT('Brochure lead for ', COALESCE(catalog_products.name, brochure_leads.requested_item, 'Sparkline brochure')) AS message,
            brochure_leads.status,
            brochure_leads.admin_feedback AS adminFeedback,
            brochure_leads.contacted_at AS contactedAt,
            brochure_leads.created_at AS createdAt,
            brochure_leads.updated_at AS updatedAt,
            catalog_products.name AS productName
          FROM brochure_leads
          LEFT JOIN catalog_products ON catalog_products.id = brochure_leads.product_id
        ) AS inquiries
        ORDER BY createdAt DESC
      `
    );

    res.status(200).json({ inquiries: rows });
  } catch (error) {
    console.error("Admin inquiries error:", error.message);
    res.status(500).json({ message: "Unable to load inquiries" });
  }
};

export const updateAdminInquiry = async (req, res) => {
  try {
    const { inquiryType, id } = req.params;
    const { status, adminFeedback = "" } = req.body;
    const pool = getDbPool();

    if (!["quote", "spare_parts", "brochure"].includes(inquiryType)) {
      return res.status(400).json({ message: "Invalid inquiry type" });
    }

    if (!ALLOWED_INQUIRY_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid inquiry status" });
    }

    const tableName =
      inquiryType === "brochure" ? "brochure_leads" : "quote_enquiries";
    const [existingRows] = await pool.execute(
      `
        SELECT full_name AS fullName, email
        FROM ${tableName}
        WHERE id = ?
        LIMIT 1
      `,
      [Number(id)]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    await pool.execute(
      `
        UPDATE ${tableName}
        SET
          status = ?,
          admin_feedback = ?,
          contacted_at = CASE
            WHEN ? <> 'new' AND contacted_at IS NULL THEN NOW()
            WHEN ? = 'new' THEN NULL
            ELSE contacted_at
          END
        WHERE id = ?
      `,
      [status, adminFeedback.trim(), status, status, Number(id)]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "update_inquiry",
      entityType: inquiryType,
      entityId: Number(id),
      description: `${req.user.fullName} marked ${existingRows[0].fullName}'s ${String(
        inquiryType
      ).replaceAll("_", " ")} inquiry as ${formatStatusLabel(status)}.`,
      metadata: {
        customerEmail: existingRows[0].email,
        status,
        adminFeedback: adminFeedback.trim()
      }
    });

    res.status(200).json({ message: "Inquiry updated successfully" });
  } catch (error) {
    console.error("Admin inquiry update error:", error.message);
    res.status(500).json({ message: "Unable to update inquiry" });
  }
};

export const getAdminUsers = async (_req, res) => {
  try {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `
        SELECT
          users.id,
          users.full_name AS fullName,
          users.email,
          users.phone,
          users.company_name AS companyName,
          users.designation,
          users.role,
          users.created_at AS createdAt,
          users.updated_at AS updatedAt,
          (
            (SELECT COUNT(*) FROM quote_enquiries WHERE quote_enquiries.email = users.email)
            +
            (SELECT COUNT(*) FROM brochure_leads WHERE brochure_leads.email = users.email)
          ) AS inquiryCount,
          (
            SELECT COUNT(*)
            FROM admin_tasks
            WHERE admin_tasks.status = 'open'
              AND admin_tasks.assigned_to_user_id = users.id
          ) AS assignedTaskCount
        FROM users
        WHERE users.is_active = TRUE
        ORDER BY users.created_at DESC
      `
    );

    res.status(200).json({ users: rows });
  } catch (error) {
    console.error("Admin users error:", error.message);
    res.status(500).json({ message: "Unable to load users" });
  }
};

export const getAdminTasks = async (req, res) => {
  try {
    const pool = getDbPool();
    const isOwner = req.user.role === "owner";
    const query = `
      SELECT
        admin_tasks.id,
        admin_tasks.title,
        admin_tasks.description,
        admin_tasks.applies_to_all_admins AS appliesToAllAdmins,
        admin_tasks.status,
        admin_tasks.due_on AS dueOn,
        admin_tasks.completed_at AS completedAt,
        admin_tasks.created_at AS createdAt,
        admin_tasks.updated_at AS updatedAt,
        assignedBy.id AS assignedById,
        assignedBy.full_name AS assignedByName,
        assignedBy.email AS assignedByEmail,
        assignedTo.id AS assignedToId,
        assignedTo.full_name AS assignedToName,
        assignedTo.email AS assignedToEmail
      FROM admin_tasks
      INNER JOIN users AS assignedBy ON assignedBy.id = admin_tasks.assigned_by_user_id
      LEFT JOIN users AS assignedTo ON assignedTo.id = admin_tasks.assigned_to_user_id
      ${isOwner ? "" : "WHERE admin_tasks.applies_to_all_admins = TRUE OR admin_tasks.assigned_to_user_id = ?"}
      ORDER BY
        CASE WHEN admin_tasks.status = 'completed' THEN 1 ELSE 0 END ASC,
        CASE WHEN admin_tasks.due_on IS NULL THEN 1 ELSE 0 END ASC,
        admin_tasks.due_on ASC,
        admin_tasks.created_at DESC
    `;

    const [rows] = await pool.query(query, isOwner ? [] : [req.user.id]);

    res.status(200).json({ tasks: rows });
  } catch (error) {
    console.error("Admin tasks error:", error.message);
    res.status(500).json({ message: "Unable to load tasks" });
  }
};

export const createAdminTask = async (req, res) => {
  try {
    const { title = "", description, assignedTo = "all", dueOn = "" } = req.body;
    const pool = getDbPool();

    if (!description || !String(description).trim()) {
      return res.status(400).json({ message: "Task description is required" });
    }

    const normalizedDueOn = normalizeDueOn(dueOn);

    let assignedToUserId = null;
    let appliesToAllAdmins = true;
    let assigneeLabel = "All admins";

    if (assignedTo !== "all") {
      const [assigneeRows] = await pool.execute(
        `
          SELECT id, full_name AS fullName, role
          FROM users
          WHERE id = ?
            AND is_active = TRUE
          LIMIT 1
        `,
        [Number(assignedTo)]
      );

      if (assigneeRows.length === 0 || assigneeRows[0].role !== "admin") {
        return res.status(404).json({ message: "Selected admin was not found" });
      }

      assignedToUserId = assigneeRows[0].id;
      appliesToAllAdmins = false;
      assigneeLabel = assigneeRows[0].fullName;
    }

    const [result] = await pool.execute(
      `
        INSERT INTO admin_tasks (
          title,
          description,
          assigned_by_user_id,
          assigned_to_user_id,
          applies_to_all_admins,
          status,
          due_on
        )
        VALUES (?, ?, ?, ?, ?, 'open', ?)
      `,
      [
        buildTaskTitle(title, description),
        String(description).trim(),
        req.user.id,
        assignedToUserId,
        appliesToAllAdmins,
        normalizedDueOn
      ]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "assign_task",
      entityType: "task",
      entityId: result.insertId,
      description: `${req.user.fullName} assigned a task to ${assigneeLabel}.`,
      metadata: {
        assignedTo,
        description: String(description).trim(),
        dueOn: normalizedDueOn
      }
    });

    res.status(201).json({ message: "Task assigned successfully" });
  } catch (error) {
    console.error("Admin task create error:", error.message);
    res
      .status(error.message === "Invalid task deadline" ? 400 : 500)
      .json({
        message:
          error.message === "Invalid task deadline"
            ? error.message
            : "Unable to assign task"
      });
  }
};

export const updateAdminTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const pool = getDbPool();
    const isOwner = req.user.role === "owner";

    if (!ALLOWED_TASK_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid task status" });
    }

    const [taskRows] = await pool.execute(
      `
        SELECT
          admin_tasks.id,
          admin_tasks.title,
          admin_tasks.status,
          admin_tasks.applies_to_all_admins AS appliesToAllAdmins,
          admin_tasks.assigned_to_user_id AS assignedToUserId,
          assignedTo.full_name AS assignedToName
        FROM admin_tasks
        LEFT JOIN users AS assignedTo ON assignedTo.id = admin_tasks.assigned_to_user_id
        WHERE admin_tasks.id = ?
        LIMIT 1
      `,
      [Number(id)]
    );

    if (!taskRows.length) {
      return res.status(404).json({ message: "Task not found" });
    }

    const task = taskRows[0];

    if (
      !isOwner &&
      !task.appliesToAllAdmins &&
      Number(task.assignedToUserId) !== Number(req.user.id)
    ) {
      return res.status(403).json({ message: "You cannot update this task" });
    }

    if (!isOwner && status !== "completed") {
      return res.status(403).json({ message: "Admins can only mark tasks as completed" });
    }

    await pool.execute(
      `
        UPDATE admin_tasks
        SET
          status = ?,
          completed_at = CASE
            WHEN ? = 'completed' THEN NOW()
            WHEN ? = 'open' THEN NULL
            ELSE completed_at
          END
        WHERE id = ?
      `,
      [status, status, status, Number(id)]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "update_task",
      entityType: "task",
      entityId: Number(id),
      description: `${req.user.fullName} marked task "${task.title}" as ${formatStatusLabel(status)}.`,
      metadata: {
        status,
        assignedToName: task.appliesToAllAdmins
          ? "All admins"
          : task.assignedToName || null
      }
    });

    res.status(200).json({ message: "Task updated successfully" });
  } catch (error) {
    console.error("Admin task update error:", error.message);
    res.status(500).json({ message: "Unable to update task" });
  }
};

export const getAdminAudits = async (_req, res) => {
  try {
    const pool = getDbPool();
    const [rows] = await pool.query(
      `
        SELECT
          audit_logs.id,
          audit_logs.action_type AS actionType,
          audit_logs.entity_type AS entityType,
          audit_logs.entity_id AS entityId,
          audit_logs.description,
          audit_logs.metadata_json AS metadataJson,
          audit_logs.created_at AS createdAt,
          users.id AS actorId,
          users.full_name AS actorName,
          users.email AS actorEmail,
          users.role AS actorRole
        FROM audit_logs
        INNER JOIN users ON users.id = audit_logs.actor_user_id
        WHERE users.role IN ('admin', 'owner')
        ORDER BY audit_logs.created_at DESC
        LIMIT 200
      `
    );

    res.status(200).json({
      audits: rows.map((row) => ({
        ...row,
        metadata: row.metadataJson ? parseJsonValue(row.metadataJson) : null
      }))
    });
  } catch (error) {
    console.error("Admin audit error:", error.message);
    res.status(500).json({ message: "Unable to load audits" });
  }
};

export const createAdminAccount = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      phone = "",
      companyName = "Sparkline",
      designation = "Admin",
      role = "admin"
    } = req.body;

    const normalizedRole = String(role || "")
      .trim()
      .toLowerCase();

    if (!fullName || !email || !phone || !companyName || !designation || !password) {
      return res
        .status(400)
        .json({
          message:
            "Full name, email, phone number, company name, designation, and password are required"
        });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (phone && !isValidPhone(normalizePhone(phone))) {
      return res.status(400).json({ message: "Enter a valid 10-digit phone number" });
    }

    if (!["admin", "owner"].includes(normalizedRole)) {
      return res.status(400).json({ message: "Select either admin or owner access" });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const pool = getDbPool();
    const existingUser = await loadAdminByEmail(pool, normalizedEmail);

    if (existingUser) {
      return res.status(409).json({ message: "An account already exists for this email" });
    }

    const [result] = await pool.execute(
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
        String(fullName).trim(),
        normalizedEmail,
        normalizedPhone,
        String(companyName || "").trim(),
        String(designation || "").trim(),
        hashPassword(password),
        normalizedRole
      ]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "create_admin_account",
      entityType: "user",
      entityId: result.insertId,
      description: `${req.user.fullName} created ${normalizedRole} account ${normalizedEmail}.`,
      metadata: {
        email: normalizedEmail,
        role: normalizedRole
      }
    });

    res.status(201).json({
      message: `${
        normalizedRole === "owner" ? "Owner" : "Admin"
      } account created successfully`
    });
  } catch (error) {
    console.error("Admin account create error:", error.message);
    res.status(500).json({ message: "Unable to create admin account" });
  }
};

export const getAdminGallery = async (_req, res) => {
  try {
    const pool = getDbPool();
    const items = await loadAdminGalleryItems(pool);

    res.status(200).json({ items });
  } catch (error) {
    console.error("Admin gallery error:", error.message);
    res.status(500).json({ message: "Unable to load gallery items" });
  }
};

export const createAdminGalleryItem = async (req, res) => {
  try {
    const { mediaType, description, mediaUpload } = req.body;

    if (!["image", "video"].includes(mediaType)) {
      return res.status(400).json({ message: "Choose image or video for the gallery" });
    }

    if (!String(description || "").trim()) {
      return res.status(400).json({ message: "Add a description for the gallery item" });
    }

    if (!mediaUpload) {
      return res.status(400).json({ message: "Select a local file to upload" });
    }

    const pool = getDbPool();
    const savedMedia = await saveGalleryMediaUpload(
      slugify(description || mediaType),
      mediaType,
      mediaUpload
    );

    const [result] = await pool.execute(
      `
        INSERT INTO gallery_items (
          media_type,
          media_path,
          description,
          original_file_name,
          mime_type,
          file_size_bytes,
          created_by_user_id,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
      `,
      [
        mediaType,
        savedMedia.mediaPath,
        String(description).trim(),
        savedMedia.originalFileName,
        savedMedia.mimeType,
        savedMedia.fileSizeBytes,
        req.user.id
      ]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "create_gallery_item",
      entityType: "gallery_item",
      entityId: result.insertId,
      description: `${req.user.fullName} added a gallery ${mediaType}.`,
      metadata: {
        mediaType,
        mediaPath: savedMedia.mediaPath,
        description: String(description).trim()
      }
    });

    res.status(201).json({ message: "Gallery item added successfully" });
  } catch (error) {
    console.error("Admin gallery create error:", error.message);

    const statusCode = /image|video|gallery|upload/i.test(error.message) ? 400 : 500;
    res.status(statusCode).json({
      message: statusCode === 400 ? error.message : "Unable to add gallery item"
    });
  }
};

export const deleteAdminGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getDbPool();
    const [rows] = await pool.execute(
      `
        SELECT
          id,
          media_type AS mediaType,
          media_path AS mediaPath,
          description
        FROM gallery_items
        WHERE id = ?
          AND is_active = TRUE
        LIMIT 1
      `,
      [Number(id)]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Gallery item not found" });
    }

    const galleryItem = rows[0];

    await pool.execute(
      `
        UPDATE gallery_items
        SET is_active = FALSE
        WHERE id = ?
      `,
      [Number(id)]
    );

    await deleteGalleryMediaFile(galleryItem.mediaPath);

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "delete_gallery_item",
      entityType: "gallery_item",
      entityId: Number(id),
      description: `${req.user.fullName} removed a gallery ${galleryItem.mediaType}.`,
      metadata: {
        mediaType: galleryItem.mediaType,
        mediaPath: galleryItem.mediaPath,
        description: galleryItem.description
      }
    });

    res.status(200).json({ message: "Gallery item deleted successfully" });
  } catch (error) {
    console.error("Admin gallery delete error:", error.message);
    res.status(500).json({ message: "Unable to delete gallery item" });
  }
};

export const getAdminCatalog = async (_req, res) => {
  try {
    const pool = getDbPool();
    const categories = await loadAdminCategories(pool);
    const products = await loadAdminProducts(pool, categories);

    res.status(200).json({
      categories,
      products
    });
  } catch (error) {
    console.error("Admin catalog error:", error.message);
    res.status(500).json({ message: "Unable to load admin catalog" });
  }
};

export const getAdminSpareParts = async (_req, res) => {
  try {
    const pool = getDbPool();
    const spareParts = await loadAdminSpareParts(pool);

    res.status(200).json({
      spareParts
    });
  } catch (error) {
    console.error("Admin spare parts error:", error.message);
    res.status(500).json({ message: "Unable to load spare parts inventory" });
  }
};

export const createAdminCategory = async (req, res) => {
  try {
    const {
      parentSlug,
      name,
      slug = "",
      shortDescription,
      fullDescription,
      imageUploads = [],
      brochureUpload = null,
      sortOrder
    } = req.body;

    if (!parentSlug || !name || !shortDescription || !fullDescription) {
      return res.status(400).json({
        message: "Parent, name, short description, and full description are required"
      });
    }

    if (!Array.isArray(imageUploads) || imageUploads.length === 0) {
      return res.status(400).json({
        message: "At least one category image is required"
      });
    }

    const pool = getDbPool();
    const [parentRows] = await pool.execute(
      `
        SELECT id, name
        FROM catalog_categories
        WHERE slug = ?
          AND is_active = TRUE
        LIMIT 1
      `,
      [parentSlug]
    );

    if (parentRows.length === 0) {
      return res.status(404).json({ message: "Parent category not found" });
    }

    const categorySlug = slugify(slug || name);
    const savedImagePaths = await saveCategoryImageUploads(categorySlug, imageUploads);
    const brochureFileName = brochureUpload
      ? await saveBrochureUpload(categorySlug, brochureUpload)
      : null;

    const [sortRows] = await pool.execute(
      `
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSortOrder
        FROM catalog_categories
        WHERE parent_id = ?
      `,
      [parentRows[0].id]
    );

    const [result] = await pool.execute(
      `
        INSERT INTO catalog_categories (
          parent_id,
          name,
          slug,
          short_description,
          full_description,
          image,
          image_gallery_json,
          brochure_file_name,
          sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        parentRows[0].id,
        String(name).trim(),
        categorySlug,
        String(shortDescription).trim(),
        String(fullDescription).trim(),
        savedImagePaths[0],
        JSON.stringify(savedImagePaths),
        brochureFileName,
        sortOrder ? Number(sortOrder) : sortRows[0].nextSortOrder
      ]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "create_category",
      entityType: "category",
      entityId: result.insertId,
      description: `${req.user.fullName} added category ${String(name).trim()} under ${parentRows[0].name}.`,
      metadata: {
        parentSlug,
        slug: categorySlug,
        imageCount: savedImagePaths.length,
        brochureFileName
      }
    });

    res.status(201).json({
      message: "Category added successfully",
      categoryId: result.insertId
    });
  } catch (error) {
    console.error("Admin category create error:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Category slug already exists" });
    }

    const statusCode = /pdf|brochure|image/i.test(error.message) ? 400 : 500;
    res
      .status(statusCode)
      .json({ message: statusCode === 400 ? error.message : "Unable to create category" });
  }
};

export const updateAdminCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      parentSlug,
      name,
      slug = "",
      shortDescription,
      fullDescription,
      imageUploads = [],
      brochureUpload = null,
      sortOrder
    } = req.body;

    if (!parentSlug || !name || !shortDescription || !fullDescription) {
      return res.status(400).json({
        message: "Parent, name, short description, and full description are required"
      });
    }

    const pool = getDbPool();
    const existingCategory = await loadCategoryById(pool, Number(id));

    if (!existingCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    const [parentRows] = await pool.execute(
      `
        SELECT id, name
        FROM catalog_categories
        WHERE slug = ?
          AND is_active = TRUE
        LIMIT 1
      `,
      [parentSlug]
    );

    if (parentRows.length === 0) {
      return res.status(404).json({ message: "Parent category not found" });
    }

    if (Number(parentRows[0].id) === Number(id)) {
      return res.status(400).json({ message: "A category cannot be its own parent" });
    }

    const categorySlug = slugify(slug || name);
    const nextImagePaths =
      Array.isArray(imageUploads) && imageUploads.length
        ? await saveCategoryImageUploads(categorySlug, imageUploads)
        : existingCategory.imageGallery;
    const brochureFileName = brochureUpload
      ? await saveBrochureUpload(categorySlug, brochureUpload)
      : existingCategory.brochureFileName;

    await pool.execute(
      `
        UPDATE catalog_categories
        SET
          parent_id = ?,
          name = ?,
          slug = ?,
          short_description = ?,
          full_description = ?,
          image = ?,
          image_gallery_json = ?,
          brochure_file_name = ?,
          sort_order = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        Number(parentRows[0].id),
        String(name).trim(),
        categorySlug,
        String(shortDescription).trim(),
        String(fullDescription).trim(),
        nextImagePaths[0] || existingCategory.image,
        JSON.stringify(nextImagePaths),
        brochureFileName,
        sortOrder ? Number(sortOrder) : Number(existingCategory.sortOrder || 0),
        Number(id)
      ]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "update_category",
      entityType: "category",
      entityId: Number(id),
      description: `${req.user.fullName} updated category ${String(name).trim()}.`,
      metadata: {
        parentSlug,
        slug: categorySlug,
        previousSlug: existingCategory.slug,
        previousName: existingCategory.name,
        imageCount: nextImagePaths.length,
        brochureFileName
      }
    });

    res.status(200).json({
      message: "Category updated successfully",
      categoryId: Number(id)
    });
  } catch (error) {
    console.error("Admin category update error:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Category slug already exists" });
    }

    const statusCode = /pdf|brochure|image/i.test(error.message) ? 400 : 500;
    res
      .status(statusCode)
      .json({
        message:
          statusCode === 400 ? error.message : "Unable to update category"
      });
  }
};

export const updateAdminCategoryBrochure = async (req, res) => {
  try {
    const { id } = req.params;
    const { brochureUpload } = req.body;

    if (!brochureUpload) {
      return res.status(400).json({ message: "A brochure PDF is required" });
    }

    const pool = getDbPool();
    const [rows] = await pool.execute(
      `
        SELECT
          id,
          name,
          slug,
          brochure_file_name AS brochureFileName
        FROM catalog_categories
        WHERE id = ?
          AND is_active = TRUE
        LIMIT 1
      `,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    const category = rows[0];
    const brochureFileName = await saveBrochureUpload(category.slug, brochureUpload);

    await pool.execute(
      `
        UPDATE catalog_categories
        SET
          brochure_file_name = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [brochureFileName, Number(id)]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "update_category_brochure",
      entityType: "category",
      entityId: Number(id),
      description: `${req.user.fullName} uploaded brochure ${brochureFileName} for category ${category.name}.`,
      metadata: {
        slug: category.slug,
        previousBrochureFileName: category.brochureFileName,
        brochureFileName
      }
    });

    res.status(200).json({
      message: "Category brochure uploaded successfully",
      brochureFileName
    });
  } catch (error) {
    console.error("Admin category brochure update error:", error.message);
    const statusCode = /pdf|brochure/i.test(error.message) ? 400 : 500;
    res
      .status(statusCode)
      .json({
        message:
          statusCode === 400 ? error.message : "Unable to upload brochure"
      });
  }
};

export const createAdminProduct = async (req, res) => {
  try {
    const {
      categoryId,
      name,
      slug = "",
      shortDescription,
      fullDescription,
      imageUpload = null,
      brochureFileName = "SPARKLINE-8.pdf",
      features = [],
      applications = [],
      specifications = []
    } = req.body;

    if (!categoryId || !name || !shortDescription || !fullDescription) {
      return res.status(400).json({
        message: "Category, name, short description, and full description are required"
      });
    }

    const pool = getDbPool();
    const [categoryRows] = await pool.execute(
      `
        SELECT id, name
        FROM catalog_categories
        WHERE id = ?
          AND is_active = TRUE
        LIMIT 1
      `,
      [Number(categoryId)]
    );

    if (categoryRows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    const productSlug = slugify(slug || name);
    const productImage = await saveProductImageUpload(productSlug, imageUpload);
    const normalizedFeatures = parseLineArray(features);
    const normalizedApplications = parseLineArray(applications);
    const normalizedSpecifications = parseSpecifications(specifications);

    const [result] = await pool.execute(
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
        Number(categoryId),
        String(name).trim(),
        productSlug,
        String(shortDescription).trim(),
        String(fullDescription).trim(),
        productImage,
        String(brochureFileName || "").trim() || "SPARKLINE-8.pdf",
        JSON.stringify(normalizedFeatures),
        JSON.stringify(normalizedApplications)
      ]
    );

    await replaceProductSpecifications(pool, result.insertId, normalizedSpecifications);

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "create_product",
      entityType: "product",
      entityId: result.insertId,
      description: `${req.user.fullName} added product ${String(name).trim()} in ${categoryRows[0].name}.`,
      metadata: {
        categoryId: Number(categoryId),
        slug: productSlug,
        image: productImage
      }
    });

    res.status(201).json({
      message: "Product added successfully",
      productId: result.insertId
    });
  } catch (error) {
    console.error("Admin product create error:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Product slug already exists" });
    }

    const statusCode = /image|related models/i.test(error.message) ? 400 : 500;
    res
      .status(statusCode)
      .json({
        message:
          statusCode === 400 ? error.message : "Unable to create product"
      });
  }
};

export const createAdminSparePart = async (req, res) => {
  try {
    const {
      name,
      slug = "",
      shortDescription,
      fullDescription,
      imageUpload = null,
      features = [],
      applications = [],
      specifications = [],
      relatedProductIds = []
    } = req.body;

    if (!name || !shortDescription || !fullDescription) {
      return res.status(400).json({
        message: "Name, short description, and full description are required"
      });
    }

    if (!imageUpload) {
      return res.status(400).json({ message: "A spare part image is required" });
    }

    const pool = getDbPool();
    const sparePartSlug = slugify(slug || name);
    const sparePartImage = await saveProductImageUpload(sparePartSlug, imageUpload);
    const normalizedFeatures = parseLineArray(features);
    const normalizedApplications = parseLineArray(applications);
    const normalizedSpecifications = parseSpecifications(specifications);
    const normalizedRelatedProductIds = await normalizeRelatedProductIds(
      pool,
      relatedProductIds
    );

    const [result] = await pool.execute(
      `
        INSERT INTO spare_parts_inventory (
          name,
          slug,
          short_description,
          full_description,
          image,
          key_features_json,
          applications_json,
          specifications_json,
          related_product_ids_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(name).trim(),
        sparePartSlug,
        String(shortDescription).trim(),
        String(fullDescription).trim(),
        sparePartImage,
        JSON.stringify(normalizedFeatures),
        JSON.stringify(normalizedApplications),
        JSON.stringify(normalizedSpecifications),
        JSON.stringify(normalizedRelatedProductIds)
      ]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "create_spare_part",
      entityType: "spare_part",
      entityId: result.insertId,
      description: `${req.user.fullName} added spare part ${String(name).trim()} to the private inventory.`,
      metadata: {
        slug: sparePartSlug,
        image: sparePartImage,
        relatedProductIds: normalizedRelatedProductIds
      }
    });

    res.status(201).json({
      message: "Spare part added successfully",
      sparePartId: result.insertId
    });
  } catch (error) {
    console.error("Admin spare part create error:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Spare part slug already exists" });
    }

    const statusCode = /image|related models/i.test(error.message) ? 400 : 500;
    res.status(statusCode).json({
      message: statusCode === 400 ? error.message : "Unable to create spare part"
    });
  }
};

export const updateAdminProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      categoryId,
      name,
      slug = "",
      shortDescription,
      fullDescription,
      imageUpload = null,
      brochureFileName = "SPARKLINE-8.pdf",
      features = [],
      applications = [],
      specifications = []
    } = req.body;

    if (!categoryId || !name || !shortDescription || !fullDescription) {
      return res.status(400).json({
        message: "Category, name, short description, and full description are required"
      });
    }

    const pool = getDbPool();
    const existingProduct = await loadProductById(pool, Number(id));

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [categoryRows] = await pool.execute(
      `
        SELECT id, name
        FROM catalog_categories
        WHERE id = ?
          AND is_active = TRUE
        LIMIT 1
      `,
      [Number(categoryId)]
    );

    if (categoryRows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    const productSlug = slugify(slug || name);
    const productImage = imageUpload
      ? await saveProductImageUpload(productSlug, imageUpload)
      : existingProduct.image;
    const normalizedFeatures = parseLineArray(features);
    const normalizedApplications = parseLineArray(applications);
    const normalizedSpecifications = parseSpecifications(specifications);

    await pool.execute(
      `
        UPDATE catalog_products
        SET
          category_id = ?,
          name = ?,
          slug = ?,
          short_description = ?,
          full_description = ?,
          image = ?,
          brochure_file_name = ?,
          key_features_json = ?,
          applications_json = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        Number(categoryId),
        String(name).trim(),
        productSlug,
        String(shortDescription).trim(),
        String(fullDescription).trim(),
        productImage,
        String(brochureFileName || "").trim() || "SPARKLINE-8.pdf",
        JSON.stringify(normalizedFeatures),
        JSON.stringify(normalizedApplications),
        Number(id)
      ]
    );

    await replaceProductSpecifications(pool, Number(id), normalizedSpecifications);

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "update_product",
      entityType: "product",
      entityId: Number(id),
      description: `${req.user.fullName} updated product ${String(name).trim()}.`,
      metadata: {
        previousName: existingProduct.name,
        categoryId: Number(categoryId),
        slug: productSlug,
        imageUpdated: Boolean(imageUpload)
      }
    });

    res.status(200).json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Admin product update error:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Product slug already exists" });
    }

    const statusCode = /image/i.test(error.message) ? 400 : 500;
    res
      .status(statusCode)
      .json({
        message:
          statusCode === 400 ? error.message : "Unable to update product"
      });
  }
};

export const updateAdminSparePart = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug = "",
      shortDescription,
      fullDescription,
      imageUpload = null,
      features = [],
      applications = [],
      specifications = [],
      relatedProductIds = []
    } = req.body;

    if (!name || !shortDescription || !fullDescription) {
      return res.status(400).json({
        message: "Name, short description, and full description are required"
      });
    }

    const pool = getDbPool();
    const existingSparePart = await loadSparePartById(pool, Number(id));

    if (!existingSparePart) {
      return res.status(404).json({ message: "Spare part not found" });
    }

    const sparePartSlug = slugify(slug || name);
    const sparePartImage = imageUpload
      ? await saveProductImageUpload(sparePartSlug, imageUpload)
      : existingSparePart.image;
    const normalizedFeatures = parseLineArray(features);
    const normalizedApplications = parseLineArray(applications);
    const normalizedSpecifications = parseSpecifications(specifications);
    const normalizedRelatedProductIds = await normalizeRelatedProductIds(
      pool,
      relatedProductIds
    );

    await pool.execute(
      `
        UPDATE spare_parts_inventory
        SET
          name = ?,
          slug = ?,
          short_description = ?,
          full_description = ?,
          image = ?,
          key_features_json = ?,
          applications_json = ?,
          specifications_json = ?,
          related_product_ids_json = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        String(name).trim(),
        sparePartSlug,
        String(shortDescription).trim(),
        String(fullDescription).trim(),
        sparePartImage,
        JSON.stringify(normalizedFeatures),
        JSON.stringify(normalizedApplications),
        JSON.stringify(normalizedSpecifications),
        JSON.stringify(normalizedRelatedProductIds),
        Number(id)
      ]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "update_spare_part",
      entityType: "spare_part",
      entityId: Number(id),
      description: `${req.user.fullName} updated spare part ${String(name).trim()}.`,
      metadata: {
        previousName: existingSparePart.name,
        previousSlug: existingSparePart.slug,
        slug: sparePartSlug,
        imageUpdated: Boolean(imageUpload),
        relatedProductIds: normalizedRelatedProductIds
      }
    });

    res.status(200).json({ message: "Spare part updated successfully" });
  } catch (error) {
    console.error("Admin spare part update error:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Spare part slug already exists" });
    }

    const statusCode = /image/i.test(error.message) ? 400 : 500;
    res.status(statusCode).json({
      message: statusCode === 400 ? error.message : "Unable to update spare part"
    });
  }
};

export const deleteAdminProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getDbPool();
    const existingProduct = await loadProductById(pool, Number(id));

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    await pool.execute(
      `
        DELETE FROM catalog_products
        WHERE id = ?
      `,
      [Number(id)]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "delete_product",
      entityType: "product",
      entityId: Number(id),
      description: `${req.user.fullName} deleted product ${existingProduct.name}.`,
      metadata: {
        slug: existingProduct.slug
      }
    });

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Admin product delete error:", error.message);
    res.status(500).json({ message: "Unable to delete product" });
  }
};

export const deleteAdminSparePart = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getDbPool();
    const existingSparePart = await loadSparePartById(pool, Number(id));

    if (!existingSparePart) {
      return res.status(404).json({ message: "Spare part not found" });
    }

    await pool.execute(
      `
        DELETE FROM spare_parts_inventory
        WHERE id = ?
      `,
      [Number(id)]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "delete_spare_part",
      entityType: "spare_part",
      entityId: Number(id),
      description: `${req.user.fullName} deleted spare part ${existingSparePart.name}.`,
      metadata: {
        slug: existingSparePart.slug
      }
    });

    res.status(200).json({ message: "Spare part deleted successfully" });
  } catch (error) {
    console.error("Admin spare part delete error:", error.message);
    res.status(500).json({ message: "Unable to delete spare part" });
  }
};

export const deleteAdminCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getDbPool();
    const [rows] = await pool.execute(
      `
        SELECT
          id,
          parent_id AS parentId,
          name,
          slug
        FROM catalog_categories
        WHERE id = ?
          AND is_active = TRUE
        LIMIT 1
      `,
      [Number(id)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (!rows[0].parentId) {
      return res.status(400).json({ message: "Root sections cannot be deleted" });
    }

    await pool.execute(
      `
        DELETE FROM catalog_categories
        WHERE id = ?
      `,
      [Number(id)]
    );

    await recordAuditLog(pool, {
      actorUserId: req.user.id,
      actionType: "delete_category",
      entityType: "category",
      entityId: Number(id),
      description: `${req.user.fullName} deleted category ${rows[0].name}.`,
      metadata: {
        slug: rows[0].slug
      }
    });

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Admin category delete error:", error.message);
    res.status(500).json({ message: "Unable to delete category" });
  }
};
