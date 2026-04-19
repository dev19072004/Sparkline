import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const brochureDirectoryPath = path.resolve(__dirname, "../../../public/brochure");

const sanitizeSegment = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const isPdfFile = (fileName, mimeType) =>
  String(fileName || "").trim().toLowerCase().endsWith(".pdf") ||
  String(mimeType || "").trim().toLowerCase() === "application/pdf";

export const saveBrochureUpload = async (categorySlug, brochureUpload) => {
  if (!brochureUpload) {
    return null;
  }

  const fileName = String(brochureUpload.fileName || "").trim();
  const mimeType = String(brochureUpload.mimeType || "").trim();
  const dataBase64 = String(brochureUpload.dataBase64 || "").trim();

  if (!fileName || !dataBase64) {
    throw new Error("Brochure PDF details are incomplete");
  }

  if (!isPdfFile(fileName, mimeType)) {
    throw new Error("Only PDF brochures can be uploaded");
  }

  const fileBuffer = Buffer.from(dataBase64, "base64");

  if (!fileBuffer.length || fileBuffer.subarray(0, 4).toString() !== "%PDF") {
    throw new Error("The uploaded brochure must be a valid PDF file");
  }

  await fs.mkdir(brochureDirectoryPath, { recursive: true });

  const safeCategorySlug = sanitizeSegment(categorySlug) || "brochure";
  const originalFileName = sanitizeSegment(path.parse(fileName).name) || "document";
  const finalFileName = `${safeCategorySlug}-${originalFileName}-${Date.now()}.pdf`;

  await fs.writeFile(path.join(brochureDirectoryPath, finalFileName), fileBuffer);

  return finalFileName;
};
