import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const galleryImageDirectoryPath = path.resolve(
  __dirname,
  "../../../public/gallery/images"
);
const galleryVideoDirectoryPath = path.resolve(
  __dirname,
  "../../../public/gallery/videos"
);

const IMAGE_MIME_TO_EXTENSION = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

const VIDEO_MIME_TO_EXTENSION = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/ogg": ".ogv",
  "video/x-m4v": ".m4v"
};

const MAX_GALLERY_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_GALLERY_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

const ALLOWED_IMAGE_EXTENSIONS = new Set(
  Object.values(IMAGE_MIME_TO_EXTENSION)
);
const ALLOWED_VIDEO_EXTENSIONS = new Set(
  Object.values(VIDEO_MIME_TO_EXTENSION)
);

const sanitizeSegment = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const resolveExtension = (fileName, mimeType, allowedExtensions, mimeToExtension) => {
  const extension = String(path.extname(fileName || "") || "").toLowerCase();

  if (allowedExtensions.has(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }

  return mimeToExtension[String(mimeType || "").trim().toLowerCase()] || "";
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

const isValidVideoBuffer = (fileBuffer, extension) => {
  if (!fileBuffer.length) {
    return false;
  }

  if ([".mp4", ".mov", ".m4v"].includes(extension)) {
    return fileBuffer.length >= 8 && fileBuffer.subarray(4, 8).toString() === "ftyp";
  }

  if (extension === ".webm") {
    return (
      fileBuffer.length >= 4 &&
      fileBuffer[0] === 0x1a &&
      fileBuffer[1] === 0x45 &&
      fileBuffer[2] === 0xdf &&
      fileBuffer[3] === 0xa3
    );
  }

  if (extension === ".ogv") {
    return fileBuffer.length >= 4 && fileBuffer.subarray(0, 4).toString() === "OggS";
  }

  return false;
};

const normalizeGalleryUpload = (mediaType, mediaUpload) => {
  const fileName = String(mediaUpload?.fileName || "").trim();
  const mimeType = String(mediaUpload?.mimeType || "").trim();
  const dataBase64 = String(mediaUpload?.dataBase64 || "").trim();

  if (!fileName || !dataBase64) {
    throw new Error("Upload details are incomplete");
  }

  const isImage = mediaType === "image";
  const extension = resolveExtension(
    fileName,
    mimeType,
    isImage ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_VIDEO_EXTENSIONS,
    isImage ? IMAGE_MIME_TO_EXTENSION : VIDEO_MIME_TO_EXTENSION
  );

  if (!extension) {
    throw new Error(
      isImage
        ? "Only JPG, PNG, WEBP, or GIF image files are allowed"
        : "Only MP4, MOV, WEBM, M4V, or OGV video files are allowed"
    );
  }

  const fileBuffer = Buffer.from(dataBase64, "base64");
  const maxBytes = isImage
    ? MAX_GALLERY_IMAGE_UPLOAD_BYTES
    : MAX_GALLERY_VIDEO_UPLOAD_BYTES;

  if (fileBuffer.length > maxBytes) {
    throw new Error(
      isImage
        ? "Each gallery image must be 10 MB or smaller"
        : "Each gallery video must be 100 MB or smaller"
    );
  }

  const isValidFile = isImage
    ? isValidImageBuffer(fileBuffer, extension)
    : isValidVideoBuffer(fileBuffer, extension);

  if (!isValidFile) {
    throw new Error(
      isImage
        ? "The uploaded file must be a valid image"
        : "The uploaded file must be a valid video"
    );
  }

  return {
    extension,
    fileBuffer,
    originalName: sanitizeSegment(path.parse(fileName).name) || mediaType,
    mimeType:
      mimeType || (isImage ? "image/jpeg" : extension === ".webm" ? "video/webm" : "video/mp4")
  };
};

export const saveGalleryMediaUpload = async (entrySlug, mediaType, mediaUpload) => {
  if (!["image", "video"].includes(mediaType)) {
    throw new Error("Invalid gallery media type");
  }

  if (!mediaUpload) {
    throw new Error("A gallery file is required");
  }

  const directoryPath =
    mediaType === "image" ? galleryImageDirectoryPath : galleryVideoDirectoryPath;

  await fs.mkdir(directoryPath, { recursive: true });

  const safeEntrySlug = sanitizeSegment(entrySlug) || mediaType;
  const timestamp = Date.now();
  const { extension, fileBuffer, originalName, mimeType } = normalizeGalleryUpload(
    mediaType,
    mediaUpload
  );
  const finalFileName = `${safeEntrySlug}-${originalName}-${timestamp}${extension}`;

  await fs.writeFile(path.join(directoryPath, finalFileName), fileBuffer);

  return {
    mediaPath:
      mediaType === "image"
        ? `/gallery/images/${finalFileName}`
        : `/gallery/videos/${finalFileName}`,
    mimeType,
    fileSizeBytes: fileBuffer.length,
    originalFileName: mediaUpload.fileName
  };
};

export const deleteGalleryMediaFile = async (mediaPath) => {
  const normalizedPath = String(mediaPath || "").trim();

  if (!normalizedPath.startsWith("/gallery/")) {
    return;
  }

  const resolvedFilePath = path.resolve(__dirname, "../../../public", `.${normalizedPath}`);
  const publicRootPath = path.resolve(__dirname, "../../../public");

  if (!resolvedFilePath.startsWith(publicRootPath)) {
    return;
  }

  try {
    await fs.unlink(resolvedFilePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
};
