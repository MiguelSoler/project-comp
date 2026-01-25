// backend/controllers/authController.js

const pool = require("../db/pool");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const sanitizeUser = (row) => ({
  id: row.id,
  nombre: row.nombre,
  email: row.email,
  rol: row.rol,
  telefono: row.telefono,
  foto_perfil_url: row.foto_perfil_url,
  activo: row.activo,
  fecha_registro: row.fecha_registro,
});

const signToken = (user) => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  return jwt.sign({ id: user.id, rol: user.rol }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// POST /auth/register
const register = async (req, res) => {
  try {
    const nombre = (req.body?.nombre || "").trim();
    const email = (req.body?.email || "").trim().toLowerCase();
    const password = req.body?.password || "";
    const telefono = req.body?.telefono != null ? String(req.body.telefono).trim() : null;


    // Validación mínima (MVP)
    const invalidFields = [];
    if (!nombre) invalidFields.push("nombre");
    if (!email || !email.includes("@")) invalidFields.push("email");
    if (!password || password.length < 8) invalidFields.push("password");

    if (invalidFields.length > 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: invalidFields,
      });
    }

    // 1) Comprobar email existente (case-insensitive)
    const existing = await pool.query(
      `SELECT id FROM usuario WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    }

    // 2) Hash password
    if (Number.isNaN(SALT_ROUNDS) || SALT_ROUNDS < 4) {
      // 4 es un mínimo razonable para evitar configuración absurda
      return res.status(500).json({ error: "INVALID_SERVER_CONFIG" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 3) Insert usuario y devolverlo (sin password_hash)
    const inserted = await pool.query(
      `INSERT INTO usuario (nombre, email, password_hash, telefono)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, telefono, foto_perfil_url, activo, fecha_registro`,
      [nombre, email, passwordHash, telefono]
    );

    const userRow = inserted.rows[0];

    // 4) Token (autologin)
    const token = signToken(userRow);

    return res.status(201).json({
      token,
      user: sanitizeUser(userRow),
    });
  } catch (error) {
    console.error("Register error:", error);

    // Si por lo que sea se coló un duplicado (race condition), el índice único lo detecta:
    // uq_usuario_email_lower
    if (error.code === "23505") {
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    }

    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

/// POST /auth/login
const login = async (req, res) => {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();
    const password = req.body?.password || "";

    const invalidFields = [];
    if (!email || !email.includes("@")) invalidFields.push("email");
    if (!password) invalidFields.push("password");

    if (invalidFields.length > 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: invalidFields,
      });
    }

    // 1) Buscar usuario por email (case-insensitive)
    const result = await pool.query(
      `SELECT id, nombre, email, rol, telefono, foto_perfil_url, activo, fecha_registro, password_hash
       FROM usuario
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      // No revelamos si el email existe
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const userRow = result.rows[0];

    // 2) Usuario inactivo
    if (!userRow.activo) {
      return res.status(403).json({ error: "USER_INACTIVE" });
    }

    // 3) Comparar password
    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    // 4) Token
    const token = signToken(userRow);

    return res.status(200).json({
      token,
      user: sanitizeUser(userRow),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

module.exports = {
  register,
  login,
};
