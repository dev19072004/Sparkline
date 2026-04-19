import crypto from "node:crypto";

const HASH_SEPARATOR = ".";

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");

  return `${salt}${HASH_SEPARATOR}${derivedKey}`;
};

export const verifyPassword = (password, storedHash) => {
  if (!storedHash || !storedHash.includes(HASH_SEPARATOR)) {
    return false;
  }

  const [salt, originalKey] = storedHash.split(HASH_SEPARATOR);
  const derivedKey = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(derivedKey, "hex"),
    Buffer.from(originalKey, "hex")
  );
};

export const generateToken = (size = 32) =>
  crypto.randomBytes(size).toString("hex");

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
