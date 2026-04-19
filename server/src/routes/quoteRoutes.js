import express from "express";
import {
  createQuoteEnquiry,
  createSparePartsEnquiry
} from "../controllers/quoteController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, createQuoteEnquiry);
router.post("/spare-parts", requireAuth, createSparePartsEnquiry);

export default router;
