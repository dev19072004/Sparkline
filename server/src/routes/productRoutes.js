import express from "express";
import {
  getAllProducts,
  getCatalogNavigation,
  getCategoryBySlug,
  getSingleProductBySlug
} from "../controllers/productController.js";

const router = express.Router();

router.get("/navigation", getCatalogNavigation);
router.get("/categories/:slug", getCategoryBySlug);
router.get("/items/:slug", getSingleProductBySlug);
router.get("/", getAllProducts);

export default router;
