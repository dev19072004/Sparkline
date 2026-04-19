import express from "express";
import {
  createAdminAccount,
  createAdminCategory,
  createAdminGalleryItem,
  createAdminProduct,
  createAdminSparePart,
  createAdminTask,
  deleteAdminGalleryItem,
  deleteAdminCategory,
  deleteAdminProduct,
  deleteAdminSparePart,
  getAdminAudits,
  getAdminCatalog,
  getAdminGallery,
  getAdminInquiries,
  getAdminOverview,
  getAdminSpareParts,
  getAdminTasks,
  getAdminUsers,
  updateAdminCategory,
  updateAdminCategoryBrochure,
  updateAdminProduct,
  updateAdminSparePart,
  updateAdminTask,
  updateAdminInquiry
} from "../controllers/adminController.js";
import { requireAdmin, requireAuth, requireOwner } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/overview", requireAuth, requireAdmin, getAdminOverview);
router.get("/inquiries", requireAuth, requireAdmin, getAdminInquiries);
router.get("/users", requireAuth, requireAdmin, getAdminUsers);
router.get("/tasks", requireAuth, requireAdmin, getAdminTasks);
router.patch("/tasks/:id", requireAuth, requireAdmin, updateAdminTask);
router.patch("/inquiries/:inquiryType/:id", requireAuth, requireAdmin, updateAdminInquiry);
router.get("/catalog", requireAuth, requireAdmin, getAdminCatalog);
router.get("/spare-parts", requireAuth, requireAdmin, getAdminSpareParts);
router.get("/gallery", requireAuth, requireAdmin, getAdminGallery);
router.post("/gallery", requireAuth, requireAdmin, createAdminGalleryItem);
router.delete("/gallery/:id", requireAuth, requireAdmin, deleteAdminGalleryItem);
router.post("/categories", requireAuth, requireAdmin, createAdminCategory);
router.patch("/categories/:id", requireAuth, requireAdmin, updateAdminCategory);
router.patch("/categories/:id/brochure", requireAuth, requireAdmin, updateAdminCategoryBrochure);
router.post("/products", requireAuth, requireAdmin, createAdminProduct);
router.patch("/products/:id", requireAuth, requireAdmin, updateAdminProduct);
router.delete("/products/:id", requireAuth, requireOwner, deleteAdminProduct);
router.post("/spare-parts", requireAuth, requireAdmin, createAdminSparePart);
router.patch("/spare-parts/:id", requireAuth, requireAdmin, updateAdminSparePart);
router.delete("/spare-parts/:id", requireAuth, requireAdmin, deleteAdminSparePart);
router.delete("/categories/:id", requireAuth, requireOwner, deleteAdminCategory);
router.post("/tasks", requireAuth, requireOwner, createAdminTask);
router.get("/audits", requireAuth, requireOwner, getAdminAudits);
router.post("/admin-accounts", requireAuth, requireOwner, createAdminAccount);

export default router;
