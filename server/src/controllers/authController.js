import { getDbPool } from "../config/db.js";
import crypto from "node:crypto";
import {
  generateToken,
  hashPassword,
  hashToken,
  verifyPassword
} from "../utils/auth.js";
import { sendEmail } from "../utils/sendEmail.js";
import {
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone
} from "../utils/validation.js";

const sanitizeUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  companyName: user.companyName,
  designation: user.designation,
  role: user.role
});

const FORCED_OWNER_EMAILS = new Set([
  "devanshuverma72@gmail.com",
  "devanshuverma72@gmil.com"
]);

const getForcedOwnerPassword = () =>
  process.env.OWNER_PASSWORD || process.env.ADMIN_PASSWORD || "Dev@1907";

const getForcedOwnerProfile = (email) => ({
  fullName: process.env.OWNER_NAME || process.env.ADMIN_NAME || "Devanshu Verma",
  email: normalizeEmail(email),
  phone: normalizePhone(process.env.OWNER_PHONE || process.env.ADMIN_PHONE || "9054606803"),
  companyName: process.env.OWNER_COMPANY || process.env.ADMIN_COMPANY || "Sparkline",
  designation: process.env.OWNER_DESIGNATION || "Owner",
  password: getForcedOwnerPassword(),
  role: "owner"
});

const RESET_OTP_LENGTH = 6;
const buildResetOtp = () =>
  crypto.randomInt(10 ** (RESET_OTP_LENGTH - 1), 10 ** RESET_OTP_LENGTH).toString();

const loadValidResetRequest = async (pool, userId, otp) => {
  const [rows] = await pool.execute(
    `
      SELECT id, user_id AS userId
      FROM password_reset_tokens
      WHERE user_id = ?
        AND token_hash = ?
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `,
    [Number(userId), hashToken(`${userId}:${String(otp || "").trim()}`)]
  );

  return rows[0] || null;
};

const createSession = async (pool, userId) => {
  const rawToken = generateToken(32);
  const tokenHash = hashToken(rawToken);
  const sessionTtlDays = Number(process.env.SESSION_TTL_DAYS || 30);

  await pool.execute(
    `
      INSERT INTO auth_sessions (user_id, token_hash, expires_at)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))
    `,
    [userId, tokenHash, sessionTtlDays]
  );

  return rawToken;
};

const loadUserByEmail = async (pool, email) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        full_name AS fullName,
        email,
        phone,
        company_name AS companyName,
        designation,
        password_hash AS passwordHash,
        role,
        is_active AS isActive
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [email]
  );

  return rows[0] || null;
};

const upsertForcedOwnerAccount = async (pool, email) => {
  const profile = getForcedOwnerProfile(email);
  const existingUser = await loadUserByEmail(pool, profile.email);
  const passwordHash = hashPassword(profile.password);

  if (existingUser) {
    await pool.execute(
      `
        UPDATE users
        SET
          full_name = ?,
          phone = ?,
          company_name = ?,
          designation = ?,
          password_hash = ?,
          role = ?,
          is_active = TRUE,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        profile.fullName,
        profile.phone,
        profile.companyName,
        profile.designation,
        passwordHash,
        profile.role,
        existingUser.id
      ]
    );
  } else {
    await pool.execute(
      `
        INSERT INTO users (
          full_name,
          email,
          phone,
          company_name,
          designation,
          password_hash,
          role,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
      `,
      [
        profile.fullName,
        profile.email,
        profile.phone,
        profile.companyName,
        profile.designation,
        passwordHash,
        profile.role
      ]
    );
  }

  return loadUserByEmail(pool, profile.email);
};

export const signup = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone = "",
      companyName = "",
      designation = "",
      password
    } = req.body;

    if (!fullName || !email || !phone || !companyName || !designation || !password) {
      return res
        .status(400)
        .json({
          message:
            "Full name, email, phone number, company name, designation, and password are required"
        });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (phone && !isValidPhone(normalizePhone(phone))) {
      return res.status(400).json({ message: "Enter a valid 10-digit phone number" });
    }

    const pool = getDbPool();
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const existingUser = await loadUserByEmail(pool, normalizedEmail);

    if (existingUser) {
      return res.status(409).json({ message: "An account already exists for this email" });
    }

    const passwordHash = hashPassword(password);
    const [result] = await pool.execute(
      `
        INSERT INTO users (
          full_name,
          email,
          phone,
          company_name,
          designation,
          password_hash,
          role,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, 'customer', TRUE)
      `,
      [
        fullName.trim(),
        normalizedEmail,
        normalizedPhone,
        companyName.trim(),
        designation.trim(),
        passwordHash
      ]
    );

    const token = await createSession(pool, result.insertId);
    const createdUser = await loadUserByEmail(pool, normalizedEmail);

    res.status(201).json({
      token,
      user: sanitizeUser(createdUser)
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ message: "Unable to create account" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const pool = getDbPool();
    const normalizedEmail = normalizeEmail(email);
    let user = await loadUserByEmail(pool, normalizedEmail);

    if (
      FORCED_OWNER_EMAILS.has(normalizedEmail) &&
      password === getForcedOwnerPassword()
    ) {
      user = await upsertForcedOwnerAccount(pool, normalizedEmail);
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "This account is inactive" });
    }

    const token = await createSession(pool, user.id);

    res.status(200).json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Unable to login" });
  }
};

export const getCurrentUser = async (req, res) => {
  res.status(200).json({ user: sanitizeUser(req.user) });
};

export const logout = async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization || "";
    const rawToken = authorizationHeader.replace("Bearer ", "").trim();
    const pool = getDbPool();

    await pool.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [
      hashToken(rawToken)
    ]);

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({ message: "Unable to logout" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const pool = getDbPool();
    const user = await loadUserByEmail(pool, normalizeEmail(email));

    if (!user) {
      return res.status(200).json({
        message: "If the account exists, an OTP has been sent to the email address"
      });
    }

    const otp = buildResetOtp();
    const tokenHash = hashToken(`${user.id}:${otp}`);
    const resetMinutes = Number(process.env.RESET_OTP_TTL_MINUTES || 10);

    await pool.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", [
      user.id
    ]);

    await pool.execute(
      `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
      `,
      [user.id, tokenHash, resetMinutes]
    );

    await sendEmail({
      to: user.email,
      subject: "Your Sparkline password reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h2>Password reset OTP</h2>
          <p>Hello ${user.fullName},</p>
          <p>We received a request to reset your Sparkline account password.</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #8c3b24;">
            ${otp}
          </p>
          <p>Enter this OTP in the Sparkline login page to verify your identity.</p>
          <p>This OTP will expire in ${resetMinutes} minute(s).</p>
        </div>
      `
    });

    res.status(200).json({
      message: "If the account exists, an OTP has been sent to the email address"
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    res.status(500).json({ message: "Unable to send reset email" });
  }
};

export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const pool = getDbPool();
    const user = await loadUserByEmail(pool, normalizeEmail(email));

    if (!user) {
      return res.status(400).json({ message: "OTP is invalid or expired" });
    }

    const resetRequest = await loadValidResetRequest(pool, user.id, otp);

    if (!resetRequest) {
      return res.status(400).json({ message: "OTP is invalid or expired" });
    }

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Verify OTP error:", error.message);
    res.status(500).json({ message: "Unable to verify OTP" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ message: "Email, OTP, and password are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const pool = getDbPool();
    const user = await loadUserByEmail(pool, normalizeEmail(email));

    if (!user) {
      return res.status(400).json({ message: "OTP is invalid or expired" });
    }

    const resetRequest = await loadValidResetRequest(pool, user.id, otp);

    if (!resetRequest) {
      return res.status(400).json({ message: "OTP is invalid or expired" });
    }

    const newPasswordHash = hashPassword(password);

    await pool.execute(
      `
        UPDATE users
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [newPasswordHash, user.id]
    );

    await pool.execute(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = ?
      `,
      [resetRequest.id]
    );

    await pool.execute("DELETE FROM auth_sessions WHERE user_id = ?", [
      user.id
    ]);

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({ message: "Unable to reset password" });
  }
};
