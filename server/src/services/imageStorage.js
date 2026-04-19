import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const categoryImageDirectoryPath = path.resolve(
  __dirname,
  "../../../public/images/categories"
);
const productImageDirectoryPath = path.resolve(
  __dirname,
  "../../../public/images/products"
);

const IMAGE_MIME_TO_EXTENSION = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};
const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_EXTENSIONS = new Set(
  Object.values(IMAGE_MIME_TO_EXTENSION)
);

const sanitizeSegment = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const resolveImageExtension = (fileName, mimeType) => {
  const extension = String(path.extname(fileName || "") || "").toLowerCase();

  if (ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }

  return IMAGE_MIME_TO_EXTENSION[String(mimeType || "").trim().toLowerCase()] || "";
};

const isValidImageBuffer = (fileBuffer, extension) => {
  if (!fileBuffer.length) {
    return false;
  }

  if (extension === ".png") {
    return (
      fileBuffer.length >= 8 &&
      fileBuffer[0] === 0x89 &&
      fileBuffer[1] === 0x50 &&
      fileBuffer[2] === 0x4e &&
      fileBuffer[3] === 0x47
    );
  }

  if (extension === ".jpg") {
    return (
      fileBuffer.length >= 3 &&
      fileBuffer[0] === 0xff &&
      fileBuffer[1] === 0xd8 &&
      fileBuffer[2] === 0xff
    );
  }

  if (extension === ".gif") {
    return fileBuffer.length >= 4 && fileBuffer.subarray(0, 4).toString() === "GIF8";
  }

  if (extension === ".webp") {
    return (
      fileBuffer.length >= 12 &&
      fileBuffer.subarray(0, 4).toString() === "RIFF" &&
      fileBuffer.subarray(8, 12).toString() === "WEBP"
    );
  }

  return false;
};

const normalizeImageUpload = (imageUpload) => {
  const fileName = String(imageUpload?.fileName || "").trim();
  const mimeType = String(imageUpload?.mimeType || "").trim();
  const dataBase64 = String(imageUpload?.dataBase64 || "").trim();

  if (!fileName || !dataBase64) {
    throw new Error("Image details are incomplete");
  }

  const extension = resolveImageExtension(fileName, mimeType);

  if (!extension) {
    throw new Error("Only JPG, PNG, WEBP, or GIF image files are allowed");
  }

  const fileBuffer = Buffer.from(dataBase64, "base64");

  if (fileBuffer.length > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Each uploaded image must be 5 MB or smaller");
  }

  if (!isValidImageBuffer(fileBuffer, extension)) {
    throw new Error("The uploaded image must be a valid image file");
  }

  return {
    extension,
    fileBuffer,
    originalName: sanitizeSegment(path.parse(fileName).name) || "image"
  };
};

export const saveCategoryImageUploads = async (categorySlug, imageUploads) => {
  if (!Array.isArray(imageUploads) || imageUploads.length === 0) {
    throw new Error("At least one category image is required");
  }

  await fs.mkdir(categoryImageDirectoryPath, { recursive: true });

  const safeCategorySlug = sanitizeSegment(categorySlug) || "category";
  const timestamp = Date.now();
  const savedImagePaths = [];

  for (const [index, imageUpload] of imageUploads.entries()) {
    const { extension, fileBuffer, originalName } = normalizeImageUpload(imageUpload);
    const finalFileName = `${safeCategorySlug}-${originalName}-${timestamp}-${index + 1}${extension}`;

    await fs.writeFile(
      path.join(categoryImageDirectoryPath, finalFileName),
      fileBuffer
    );

    savedImagePaths.push(`/images/categories/${finalFileName}`);
  }

  return savedImagePaths;
};

export const saveProductImageUpload = async (productSlug, imageUpload) => {
  if (!imageUpload) {
    throw new Error("A product image is required");
  }

  await fs.mkdir(productImageDirectoryPath, { recursive: true });

  const safeProductSlug = sanitizeSegment(productSlug) || "product";
  const timestamp = Date.now();
  const { extension, fileBuffer, originalName } = normalizeImageUpload(imageUpload);
  const finalFileName = `${safeProductSlug}-${originalName}-${timestamp}${extension}`;

  await fs.writeFile(path.join(productImageDirectoryPath, finalFileName), fileBuffer);

  return `/images/products/${finalFileName}`;
};
