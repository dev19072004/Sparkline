export const resolveSafeRedirectPath = (value) => {
  const nextValue = String(value || "").trim();

  if (!nextValue.startsWith("/") || nextValue.startsWith("//")) {
    return "/";
  }

  return nextValue;
};

export const buildAuthRedirectPath = (value = "/") =>
  `/auth?redirect=${encodeURIComponent(resolveSafeRedirectPath(value))}`;
