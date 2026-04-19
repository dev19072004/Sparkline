export const PHONE_DIGIT_LIMIT = 10;
export const PHONE_PATTERN = "^\\d{10}$";
export const EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

export const normalizePhoneInput = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, PHONE_DIGIT_LIMIT);

export const isValidPhone = (value) =>
  new RegExp(PHONE_PATTERN).test(String(value || "").trim());

export const isValidEmail = (value) =>
  new RegExp(EMAIL_PATTERN).test(String(value || "").trim());
