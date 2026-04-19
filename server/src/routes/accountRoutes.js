import express from "express";

import { getCurrentUserQueries } from "../controllers/accountController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/queries", requireAuth, getCurrentUserQueries);

export default router;
