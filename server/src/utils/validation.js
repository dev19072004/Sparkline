export const PHONE_DIGIT_LIMIT = 10;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

export const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export const normalizePhone = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, PHONE_DIGIT_LIMIT);

export const isValidEmail = (value) => EMAIL_REGEX.test(String(value || "").trim());

export const isValidPhone = (value) => PHONE_REGEX.test(String(value || "").trim());
