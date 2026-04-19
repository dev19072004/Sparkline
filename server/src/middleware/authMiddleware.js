import { getDbPool } from "../config/db.js";
import { hashToken } from "../utils/auth.js";

const loadAuthenticatedUser = async (authorizationHeader) => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawToken = authorizationHeader.replace("Bearer ", "").trim();

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const pool = getDbPool();

  const [rows] = await pool.execute(
    `
      SELECT
        auth_sessions.id AS sessionId,
        users.id,
        users.full_name AS fullName,
        users.email,
        users.phone,
        users.company_name AS companyName,
        users.designation,
        users.role,
        users.is_active AS isActive
      FROM auth_sessions
      INNER JOIN users ON users.id = auth_sessions.user_id
      WHERE auth_sessions.token_hash = ?
        AND auth_sessions.expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash]
  );

  if (rows.length === 0 || !rows[0].isActive) {
    return null;
  }

  return rows[0];
};

export const requireAuth = async (req, res, next) => {
  try {
    const authenticatedUser = await loadAuthenticatedUser(
      req.headers.authorization
    );

    if (!authenticatedUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    req.user = authenticatedUser;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    res.status(500).json({ message: "Authentication check failed" });
  }
};

export const optionalAuth = async (req, _res, next) => {
  try {
    const authenticatedUser = await loadAuthenticatedUser(
      req.headers.authorization
    );

    if (authenticatedUser) {
      req.user = authenticatedUser;
    }

    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error.message);
    next();
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || !["admin", "owner"].includes(req.user.role)) {
    return res.status(403).json({ message: "Admin or owner access required" });
  }

  next();
};

export const requireOwner = (req, res, next) => {
  if (!req.user || req.user.role !== "owner") {
    return res.status(403).json({ message: "Owner access required" });
  }

  next();
};
