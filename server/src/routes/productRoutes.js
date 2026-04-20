import express from "express";
import {
  getAllProducts,
  getCatalogNavigation,
  getCategoryBySlug,
  getSingleProductBySlug
} from "../controllers/productController.js";

const router = express.Router();

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

router.get("/navigation", getCatalogNavigation);
router.get("/categories/:slug", getCategoryBySlug);
router.get("/items/:slug", getSingleProductBySlug);
router.get("/", getAllProducts);

export default router;
