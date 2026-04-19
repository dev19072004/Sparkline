import express from "express";
import { getGalleryItems } from "../controllers/galleryController.js";

const router = express.Router();

router.get("/", getGalleryItems);

export default router;
