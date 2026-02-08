const pool = require("../db/pool");
const bcrypt = require("bcrypt");

const BCRYPT_ROUNDS = 10;

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

const listUsers = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();              // nombre/email
    const rol = (req.query.rol || "").trim();          // user|advertiser|admin
    const activo = req.query.activo;                   // "true"|"false"|undefined

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 20)));
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where.push(`(LOWER(nombre) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`);
    }

    if (rol) {
      params.push(rol);
      where.push(`rol = $${params.length}`);
    }

    if (activo === "true" || activo === "false") {
      params.push(activo === "true");
      where.push(`activo = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM usuario ${whereSql}`,
      params
    );

    params.push(limit, offset);

    const dataResult = await pool.query(
      `SELECT id, nombre, email, rol, telefono, foto_perfil_url, activo, token_version, fecha_registro
       FROM usuario
       ${whereSql}
       ORDER BY fecha_registro DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      page,
      limit,
      total: totalResult.rows[0].total,
      users: dataResult.rows,
    });
  } catch (error) {
    console.error("Admin listUsers error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

const getUserById = async (req, res) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "INVALID_ID" });

    const result = await pool.query(
      `SELECT id, nombre, email, rol, telefono, foto_perfil_url, activo, token_version, fecha_registro
       FROM usuario
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("Admin getUserById error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

const patchUserById = async (req, res) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "INVALID_ID" });

    const nombre = typeof req.body?.nombre === "string" ? req.body.nombre.trim() : undefined;
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : undefined;
    const telefono =
      req.body?.telefono === null ? null :
      typeof req.body?.telefono === "string" ? req.body.telefono.trim() :
      req.body?.telefono !== undefined ? String(req.body.telefono).trim() :
      undefined;

    const foto_perfil_url =
      req.body?.foto_perfil_url === null ? null :
      typeof req.body?.foto_perfil_url === "string" ? req.body.foto_perfil_url.trim() :
      undefined;

    const rol = typeof req.body?.rol === "string" ? req.body.rol.trim() : undefined;
    const activo = typeof req.body?.activo === "boolean" ? req.body.activo : undefined;

    const updates = [];
    const params = [];
    let idx = 1;

    if (nombre !== undefined) {
      if (!nombre) return res.status(400).json({ error: "INVALID_NOMBRE" });
      params.push(nombre);
      updates.push(`nombre = $${idx++}`);
    }

    if (email !== undefined) {
      if (!email || !email.includes("@")) return res.status(400).json({ error: "INVALID_EMAIL" });
      params.push(email);
      updates.push(`email = $${idx++}`);
    }

    if (telefono !== undefined) {
      params.push(telefono);
      updates.push(`telefono = $${idx++}`);
    }

    if (foto_perfil_url !== undefined) {
      params.push(foto_perfil_url);
      updates.push(`foto_perfil_url = $${idx++}`);
    }

    if (rol !== undefined) {
      const allowed = new Set(["user", "advertiser", "admin"]);
      if (!allowed.has(rol)) return res.status(400).json({ error: "INVALID_ROL" });
      params.push(rol);
      updates.push(`rol = $${idx++}`);
    }

    if (activo !== undefined) {
      params.push(activo);
      updates.push(`activo = $${idx++}`);
    }

    if (updates.length === 0) return res.status(400).json({ error: "NO_FIELDS_TO_UPDATE" });

    params.push(id);

    const result = await pool.query(
      `UPDATE usuario
       SET ${updates.join(", ")}
       WHERE id = $${idx}
       RETURNING id, nombre, email, rol, telefono, foto_perfil_url, activo, token_version, fecha_registro`,
      params
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });

    return res.json({ user: result.rows[0] });
  } catch (error) {
    if (error?.code === "23505") return res.status(409).json({ error: "DUPLICATE_EMAIL" });
    console.error("Admin patchUserById error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

const changeUserPasswordById = async (req, res) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "INVALID_ID" });

    const password = req.body?.password || "";
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "INVALID_PASSWORD" });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // CLAVE: incrementamos token_version para invalidar JWTs existentes
    const result = await pool.query(
      `UPDATE usuario
       SET password_hash = $1,
           token_version = token_version + 1
       WHERE id = $2
       RETURNING id`,
      [hash, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });

    return res.json({ ok: true });
  } catch (error) {
    console.error("Admin changeUserPasswordById error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

const deactivateUserById = async (req, res) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "INVALID_ID" });

    // Desactivar + invalidar tokens existentes
    const result = await pool.query(
      `UPDATE usuario
       SET activo = false,
           token_version = token_version + 1
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });

    return res.json({ ok: true });
  } catch (error) {
    console.error("Admin deactivateUserById error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

module.exports = {
  listUsers,
  getUserById,
  patchUserById,
  changeUserPasswordById,
  deactivateUserById,
};
