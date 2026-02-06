// backend/controllers/authController.js

const pool = require("../db/pool");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const getJwtSecret = () => process.env.JWT_SECRET;
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
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return jwt.sign({ id: user.id, rol: user.rol }, secret, {expiresIn: JWT_EXPIRES_IN,});
};

// POST /auth/register  (crea o reactiva si estaba inactivo)
const register = async (req, res) => {
  const client = await pool.connect();

  try {
    const nombre = (req.body?.nombre || "").trim();
    const email = (req.body?.email || "").trim().toLowerCase();
    const password = req.body?.password || "";
    const telefono = req.body?.telefono ? String(req.body.telefono).trim() : null;

    const invalidFields = [];
    if (!nombre) invalidFields.push("nombre");
    if (!email || !email.includes("@")) invalidFields.push("email");
    if (!password || password.length < 8) invalidFields.push("password");

    if (invalidFields.length > 0) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: invalidFields });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await client.query("BEGIN");

    // Bloquea la fila si existe (evita usuarios con el mismo email)
    const existing = await client.query(
      `SELECT id, activo
       FROM usuario
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1
       FOR UPDATE`,
      [email]
    );

    // 1) No existe -> INSERT
    if (existing.rows.length === 0) {
      const inserted = await client.query(
        `INSERT INTO usuario (nombre, email, password_hash, rol, telefono, activo)
         VALUES ($1, $2, $3, 'user', $4, true)
         RETURNING id, nombre, email, rol, telefono, foto_perfil_url, activo, fecha_registro`,
        [nombre, email, passwordHash, telefono]
      );

      await client.query("COMMIT");

      const user = inserted.rows[0];
      const token = signToken(user);

      return res.status(201).json({ token, user: sanitizeUser(user) });
    }

    const { id, activo } = existing.rows[0];

    // 2) Existe y está activo -> conflicto
    if (activo) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    }

    // 3) Existe pero está inactivo -> reactivar + reset password (+ actualizar nombre/telefono)
    const updated = await client.query(
      `UPDATE usuario
       SET activo = true,
           password_hash = $1,
           nombre = $2,
           telefono = $3
       WHERE id = $4
       RETURNING id, nombre, email, rol, telefono, foto_perfil_url, activo, fecha_registro`,
      [passwordHash, nombre, telefono, id]
    );

    await client.query("COMMIT");

    const user = updated.rows[0];
    const token = signToken(user);

    return res.status(200).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // noop
    }
    console.error("Register error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
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
