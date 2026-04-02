const fs = require("fs");
const path = require("path");
const pool = require("../db/pool");
const bcrypt = require("bcrypt");

const BCRYPT_ROUNDS = 10;

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function deleteUploadedFileByUrl(url) {
  try {
    const cleanUrl = typeof url === "string" ? url.trim() : "";
    if (!cleanUrl || !cleanUrl.startsWith("/uploads/")) return;

    const absolutePath = path.resolve(
      __dirname,
      "..",
      "..",
      cleanUrl.replace(/^\/+/, "")
    );

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (error) {
    console.error("deleteUploadedFileByUrl error:", error);
  }
}

const listUsers = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const rol = (req.query.rol || "").trim();
    const activo = req.query.activo;
    const sort = String(req.query.sort || "newest").trim().toLowerCase();

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 20)));
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where.push(
        `(LOWER(nombre) LIKE $${params.length}
          OR LOWER(apellidos) LIKE $${params.length}
          OR LOWER(email) LIKE $${params.length}
          OR LOWER(nombre || ' ' || apellidos) LIKE $${params.length})`
      );
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

    let orderBySql = "fecha_registro DESC";
    if (sort === "updated") {
      orderBySql = "updated_at DESC";
    } else if (sort === "oldest") {
      orderBySql = "fecha_registro ASC";
    }

    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM usuario ${whereSql}`,
      params
    );

    params.push(limit, offset);

    const dataResult = await pool.query(
      `SELECT id, nombre, apellidos, email, rol, telefono, foto_perfil_url, activo, token_version, fecha_registro
       FROM usuario
       ${whereSql}
       ORDER BY ${orderBySql}
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
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const userResult = await pool.query(
      `SELECT id, nombre, apellidos, email, rol, telefono, foto_perfil_url, activo, token_version, fecha_registro
       FROM usuario
       WHERE id = $1`,
      [id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    const stayResult = await pool.query(
      `SELECT
         uh.id,
         uh.usuario_id,
         uh.habitacion_id,
         uh.fecha_entrada,
         uh.fecha_salida,
         uh.estado,
         h.titulo AS habitacion_titulo,
         p.id AS piso_id,
         p.ciudad,
         p.direccion
       FROM usuario_habitacion uh
       JOIN habitacion h ON h.id = uh.habitacion_id
       JOIN piso p ON p.id = h.piso_id
       WHERE uh.usuario_id = $1
         AND uh.fecha_salida IS NULL
       LIMIT 1`,
      [id]
    );

    return res.json({
      user: userResult.rows[0],
      stay: stayResult.rows[0] || null,
    });
  } catch (error) {
    console.error("Admin getUserById error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

const patchUserById = async (req, res) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const nombre =
      typeof req.body?.nombre === "string" ? req.body.nombre.trim() : undefined;

    const apellidos =
      typeof req.body?.apellidos === "string"
        ? req.body.apellidos.trim()
        : undefined;

    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : undefined;

    const telefono =
      req.body?.telefono === null
        ? null
        : typeof req.body?.telefono === "string"
          ? req.body.telefono.trim()
          : req.body?.telefono !== undefined
            ? String(req.body.telefono).trim()
            : undefined;

    const rol =
      typeof req.body?.rol === "string" ? req.body.rol.trim() : undefined;

    const activo =
      typeof req.body?.activo === "boolean" ? req.body.activo : undefined;

    const updates = [];
    const params = [];
    let idx = 1;

    if (nombre !== undefined) {
      if (!nombre) {
        return res.status(400).json({ error: "INVALID_NOMBRE" });
      }
      params.push(nombre);
      updates.push(`nombre = $${idx++}`);
    }

    if (apellidos !== undefined) {
      if (!apellidos) {
        return res.status(400).json({ error: "INVALID_APELLIDOS" });
      }
      params.push(apellidos);
      updates.push(`apellidos = $${idx++}`);
    }

    if (email !== undefined) {
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "INVALID_EMAIL" });
      }
      params.push(email);
      updates.push(`email = $${idx++}`);
    }

    if (telefono !== undefined) {
      params.push(telefono);
      updates.push(`telefono = $${idx++}`);
    }

    if (rol !== undefined) {
      const allowed = new Set(["user", "advertiser", "admin"]);
      if (!allowed.has(rol)) {
        return res.status(400).json({ error: "INVALID_ROL" });
      }
      params.push(rol);
      updates.push(`rol = $${idx++}`);
    }

    if (activo !== undefined) {
      params.push(activo);
      updates.push(`activo = $${idx++}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "NO_FIELDS_TO_UPDATE" });
    }

    params.push(id);

    const result = await pool.query(
      `UPDATE usuario
       SET ${updates.join(", ")}
       WHERE id = $${idx}
       RETURNING id, nombre, apellidos, email, rol, telefono, foto_perfil_url, activo, token_version, fecha_registro`,
      params
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "DUPLICATE_EMAIL" });
    }
    console.error("Admin patchUserById error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// PATCH /api/admin/usuario/:id/foto
const updateUserFotoById = async (req, res) => {
  const client = await pool.connect();
  let nextFotoUrl = null;

  try {
    const id = toInt(req.params.id, NaN);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: ["foto"] });
    }

    nextFotoUrl = `/uploads/perfiles/${req.file.filename}`;

    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT id, foto_perfil_url
       FROM usuario
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      deleteUploadedFileByUrl(nextFotoUrl);
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    const previousFotoUrl = currentResult.rows[0].foto_perfil_url;

    const updateResult = await client.query(
      `UPDATE usuario
       SET foto_perfil_url = $1
       WHERE id = $2
       RETURNING id, nombre, apellidos, email, rol, telefono, foto_perfil_url, activo, token_version, fecha_registro`,
      [nextFotoUrl, id]
    );

    await client.query("COMMIT");

    if (previousFotoUrl && previousFotoUrl !== nextFotoUrl) {
      deleteUploadedFileByUrl(previousFotoUrl);
    }

    return res.status(200).json({ user: updateResult.rows[0] });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    if (nextFotoUrl) {
      deleteUploadedFileByUrl(nextFotoUrl);
    }

    console.error("Admin updateUserFotoById error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

// DELETE /api/admin/usuario/:id/foto
const deleteUserFotoById = async (req, res) => {
  const client = await pool.connect();

  try {
    const id = toInt(req.params.id, NaN);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT id, foto_perfil_url
       FROM usuario
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [id]
    );

    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    const previousFotoUrl = currentResult.rows[0].foto_perfil_url;

    await client.query(
      `UPDATE usuario
       SET foto_perfil_url = NULL
       WHERE id = $1`,
      [id]
    );

    await client.query("COMMIT");

    if (previousFotoUrl) {
      deleteUploadedFileByUrl(previousFotoUrl);
    }

    return res.status(200).json({ deleted: true });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    console.error("Admin deleteUserFotoById error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

const changeUserPasswordById = async (req, res) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const password = req.body?.password || "";
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "INVALID_PASSWORD" });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await pool.query(
      `UPDATE usuario
       SET password_hash = $1,
           token_version = token_version + 1
       WHERE id = $2
       RETURNING id`,
      [hash, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("Admin changeUserPasswordById error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

const deactivateUserById = async (req, res) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "INVALID_ID" });
    }

    const result = await pool.query(
      `UPDATE usuario
       SET activo = false,
           token_version = token_version + 1
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

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
  updateUserFotoById,
  deleteUserFotoById,
  changeUserPasswordById,
  deactivateUserById,
};