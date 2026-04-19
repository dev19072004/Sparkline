import express from "express";
import { createBrochureLead } from "../controllers/brochureController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", requireAuth, createBrochureLead);

export default router;
