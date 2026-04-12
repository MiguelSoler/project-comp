const pool = require("../db/pool");
const fs = require("fs");
const path = require("path");

// =========================================================
// Helpers
// =========================================================
async function getPisoForAdminFoto(client, pisoId) {
    const q = await client.query(
      `
      SELECT id, manager_usuario_id, activo
      FROM piso
      WHERE id = $1
      LIMIT 1
      `,
      [pisoId]
      );

    return q.rowCount ? q.rows[0] : null;
}

function toInt(value, fallback) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
}

function deleteUploadedFileByUrl(url) {
  if (!url || typeof url !== "string") return;

  const normalized = url.startsWith("/") ? url.slice(1) : url;
  const absolutePath = path.resolve(__dirname, "..", "..", normalized);

  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (error) {
    console.error("deleteUploadedFileByUrl error:", error);
  }
}

// =========================================================
// GET /api/admin/piso
// - Admin: lista todos los pisos
// - Advertiser/Manager: lista solo sus pisos
// Query: page, limit, activo=all|true|false, ciudad, sort=newest|updated|oldest
//
// Extra que devolvemos ahora por cada piso:
// - convivientes_actuales_count
// - reputacion_actual_media
// - reputacion_actual_total_votos
//
// Regla de reputación actual:
// - solo cuenta a convivientes con estancia activa ahora mismo
// - la media se calcula con votos del mismo piso recibidos por esos convivientes actuales
// =========================================================
const listPisosAdmin = async (req, res) => {
  try {
    const requesterId = req.user?.id;
    const requesterRol = req.user?.rol;

    if (requesterRol !== "admin" && requesterRol !== "advertiser") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 10)));
    const offset = (page - 1) * limit;

    const activoRaw = String(req.query.activo || "all").toLowerCase(); // all|true|false
    const ciudad = (req.query.ciudad || "").trim();
    const direccion = (req.query.direccion || "").trim();
    const codigoPostal = (req.query.codigo_postal || "").trim();
    const descripcion = (req.query.descripcion || "").trim();

    const sort = String(req.query.sort || "newest");
    const sortMap = {
      newest: "p.created_at DESC, p.id DESC",
      updated: "p.updated_at DESC, p.id DESC",
      oldest: "p.created_at ASC, p.id ASC",
    };
    const orderBy = sortMap[sort] || sortMap.newest;

    const where = [];
    const params = [];
    let i = 1;

    // Manager: solo sus pisos
    if (requesterRol !== "admin") {
      params.push(requesterId);
      where.push(`p.manager_usuario_id = $${i++}`);
    }

    // Filtro activo
    if (activoRaw !== "all") {
      if (activoRaw !== "true" && activoRaw !== "false") {
        return res
          .status(400)
          .json({ error: "VALIDATION_ERROR", details: ["activo"] });
      }

      params.push(activoRaw === "true");
      where.push(`p.activo = $${i++}`);
    }

    // Filtros extra
    if (ciudad) {
      params.push(ciudad);
      where.push(`LOWER(p.ciudad) = LOWER($${i++})`);
    }

    if (direccion) {
      params.push(`%${direccion}%`);
      where.push(`p.direccion ILIKE $${i++}`);
    }

    if (codigoPostal) {
      params.push(codigoPostal);
      where.push(`p.codigo_postal = $${i++}`);
    }

    if (descripcion) {
      params.push(`%${descripcion}%`);
      where.push(`COALESCE(p.descripcion, '') ILIKE $${i++}`);
    }

    params.push(limit);
    params.push(offset);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const q = await pool.query(
      `
      SELECT
        p.id,
        p.direccion,
        p.ciudad,
        p.codigo_postal,
        p.descripcion,
        p.manager_usuario_id,
        p.activo,
        p.created_at,
        p.updated_at,

        u.nombre AS manager_nombre,
        u.apellidos AS manager_apellidos,
        u.email AS manager_email,

        cover.cover_foto_piso_url,

        stats.convivientes_actuales_count,
        stats.reputacion_actual_media,
        stats.reputacion_actual_total_votos,

        COUNT(*) OVER() AS total_count
      FROM piso p
      JOIN usuario u ON u.id = p.manager_usuario_id

      -- Foto de portada del piso
      LEFT JOIN LATERAL (
        SELECT fp.url AS cover_foto_piso_url
        FROM foto_piso fp
        WHERE fp.piso_id = p.id
        ORDER BY fp.orden ASC, fp.id ASC
        LIMIT 1
      ) cover ON true

      -- Resumen de convivencia actual del piso
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT uh.usuario_id)::int AS convivientes_actuales_count,

          COUNT(vu.id)::int AS reputacion_actual_total_votos,

          ROUND(
            AVG(
              (
                vu.limpieza +
                vu.ruido +
                vu.puntualidad_pagos
              )::numeric / 3
            ),
            2
          ) AS reputacion_actual_media
        FROM usuario_habitacion uh
        JOIN habitacion h ON h.id = uh.habitacion_id
        LEFT JOIN voto_usuario vu
          ON vu.piso_id = p.id
         AND vu.votado_id = uh.usuario_id
        WHERE h.piso_id = p.id
          AND uh.fecha_salida IS NULL
          AND uh.estado = 'active'
      ) stats ON true

      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT $${i++} OFFSET $${i++}
      `,
      params
    );

    const total = q.rowCount ? Number(q.rows[0].total_count) : 0;
    const totalPages = total ? Math.ceil(total / limit) : 0;

    const items = q.rows.map(
      ({
        total_count,
        manager_nombre,
        manager_apellidos,
        manager_email,
        ...row
      }) => ({
        ...row,
        manager: {
          id: row.manager_usuario_id,
          nombre: manager_nombre,
          apellidos: manager_apellidos,
          email: manager_email,
        },
      })
    );

    return res.json({ page, limit, total, totalPages, items });
  } catch (error) {
    console.error("listPisosAdmin error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// =========================================================
// GET /api/admin/piso/:pisoId
// - Admin: puede ver cualquier piso (activo o no)
// - Advertiser/Manager: solo puede ver sus pisos
// =========================================================
const getPisoAdminById = async (req, res) => {
    try {
        const requesterId = req.user?.id;
        const requesterRol = req.user?.rol;

        if (requesterRol !== "admin" && requesterRol !== "advertiser") {
            return res.status(403).json({ error: "FORBIDDEN" });
        }

        const pisoId = toInt(req.params.pisoId, NaN);
        if (!Number.isFinite(pisoId)) {
            return res.status(400).json({ error: "VALIDATION_ERROR", details: ["pisoId"] });
        }

        const q = await pool.query(
            `
      SELECT
        p.id,
        p.direccion,
        p.ciudad,
        p.codigo_postal,
        p.descripcion,
        p.manager_usuario_id,
        p.activo,
        p.created_at,
        p.updated_at,
        u.nombre AS manager_nombre,
        u.apellidos AS manager_apellidos,
        (SELECT fp.url
         FROM foto_piso fp
         WHERE fp.piso_id = p.id
         ORDER BY fp.orden ASC, fp.id ASC
         LIMIT 1) AS cover_foto_piso_url,
        (SELECT COUNT(*)::int FROM habitacion h WHERE h.piso_id = p.id) AS habitaciones_total,
        (SELECT COUNT(*)::int FROM habitacion h WHERE h.piso_id = p.id AND h.activo = true) AS habitaciones_activas,
        (SELECT COUNT(*)::int FROM habitacion h WHERE h.piso_id = p.id AND h.activo = true AND h.disponible = true) AS habitaciones_disponibles
      FROM piso p
      JOIN usuario u ON u.id = p.manager_usuario_id
      WHERE p.id = $1
      LIMIT 1
      `,
            [pisoId]
        );

        if (q.rowCount === 0) {
            return res.status(404).json({ error: "NOT_FOUND" });
        }

        const piso = q.rows[0];

        // Si no es admin, solo puede acceder a sus pisos
        if (requesterRol !== "admin" && Number(piso.manager_usuario_id) !== Number(requesterId)) {
            return res.status(403).json({ error: "FORBIDDEN" });
        }

        const fotosQ = await pool.query(
          `
          SELECT id, piso_id, url, orden, created_at
          FROM foto_piso
          WHERE piso_id = $1
          ORDER BY orden ASC, id ASC
          `,
            [pisoId]
        );

        return res.json({
            piso: {
                ...piso,
                manager: {
                    id: piso.manager_usuario_id,
                    nombre: piso.manager_nombre,
                    apellidos: piso.manager_apellidos,
                },
            },
            fotos: fotosQ.rows,
        });
    } catch (error) {
        console.error("getPisoAdminById error:", error);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
};

// =========================================================
// GET /api/admin/piso/:pisoId/habitaciones
// - Admin: puede ver cualquier piso
// - Advertiser/Manager: solo sus pisos
// Devuelve habitaciones del piso (todas), con filtros opcionales
// Query: page, limit, activo=all|true|false, disponible=all|true|false, sort
// sort: precio_asc|precio_desc|newest|updated
// =========================================================
const listHabitacionesAdminByPiso = async (req, res) => {
    try {
        const requesterId = req.user?.id;
        const requesterRol = req.user?.rol;

        if (requesterRol !== "admin" && requesterRol !== "advertiser") {
            return res.status(403).json({ error: "FORBIDDEN" });
        }

        const pisoId = toInt(req.params.pisoId, NaN);
        if (!Number.isFinite(pisoId)) {
            return res.status(400).json({ error: "VALIDATION_ERROR", details: ["pisoId"] });
        }

        // Verificamos piso + permisos (admin o manager del piso)
        const p = await pool.query(
            `
      SELECT id, manager_usuario_id, activo, ciudad, direccion
      FROM piso
      WHERE id = $1
      LIMIT 1
      `,
            [pisoId]
        );

        if (p.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });

        const piso = p.rows[0];

        if (requesterRol !== "admin" && Number(piso.manager_usuario_id) !== Number(requesterId)) {
            return res.status(403).json({ error: "FORBIDDEN" });
        }

        const page = Math.max(1, toInt(req.query.page, 1));
        const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 20)));
        const offset = (page - 1) * limit;

        const activoRaw = String(req.query.activo || "all").toLowerCase(); // all|true|false
        const disponibleRaw = String(req.query.disponible || "all").toLowerCase(); // all|true|false

        const sort = String(req.query.sort || "newest");
        const sortMap = {
            precio_asc: "h.precio_mensual ASC, h.id ASC",
            precio_desc: "h.precio_mensual DESC, h.id DESC",
            newest: "h.created_at DESC, h.id DESC",
            updated: "h.updated_at DESC, h.id DESC",
        };
        const orderBy = sortMap[sort] || sortMap.newest;

        const where = ["h.piso_id = $1"];
        const params = [pisoId];
        let i = 2;

        if (activoRaw !== "all") {
            if (activoRaw !== "true" && activoRaw !== "false") {
                return res.status(400).json({ error: "VALIDATION_ERROR", details: ["activo"] });
            }
            params.push(activoRaw === "true");
            where.push(`h.activo = $${i++}`);
        }

        if (disponibleRaw !== "all") {
            if (disponibleRaw !== "true" && disponibleRaw !== "false") {
                return res.status(400).json({ error: "VALIDATION_ERROR", details: ["disponible"] });
            }
            params.push(disponibleRaw === "true");
            where.push(`h.disponible = $${i++}`);
        }

        params.push(limit);
        params.push(offset);

        const q = await pool.query(
            `
      SELECT
        h.id,
        h.piso_id,
        h.titulo,
        h.descripcion,
        h.precio_mensual,
        h.disponible,
        h.activo,
        h.tamano_m2,
        h.amueblada,
        h.bano,
        h.balcon,
        h.created_at,
        h.updated_at,
        EXISTS (
          SELECT 1
          FROM usuario_habitacion uh
          WHERE uh.habitacion_id = h.id
            AND uh.fecha_salida IS NULL
        ) AS ocupada,
        (SELECT fh.url
         FROM foto_habitacion fh
         WHERE fh.habitacion_id = h.id
         ORDER BY fh.orden ASC, fh.id ASC
         LIMIT 1) AS cover_foto_habitacion_url,
        COUNT(*) OVER() AS total_count
      FROM habitacion h
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT $${i++} OFFSET $${i++}
      `,
            params
        );

        const total = q.rowCount ? Number(q.rows[0].total_count) : 0;
        const totalPages = total ? Math.ceil(total / limit) : 0;

        const items = q.rows.map(({ total_count, ...row }) => row);

        return res.json({
            piso: {
                id: piso.id,
                ciudad: piso.ciudad,
                direccion: piso.direccion,
                activo: piso.activo,
            },
            page,
            limit,
            total,
            totalPages,
            items,
        });
    } catch (error) {
        console.error("listHabitacionesAdminByPiso error:", error);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
};

// POST /api/piso  (solo advertiser/admin por routes)
// manager_usuario_id lo asigna el sistema
const createPiso = async (req, res) => {
    try {
        const direccion = (req.body?.direccion || "").trim();
        const ciudad = (req.body?.ciudad || "").trim();
        const codigo_postal = req.body?.codigo_postal ? String(req.body.codigo_postal).trim() : null;
        const descripcion = req.body?.descripcion ? String(req.body.descripcion).trim() : null;

        if (!direccion) return res.status(400).json({ error: "INVALID_DIRECCION" });
        if (!ciudad) return res.status(400).json({ error: "INVALID_CIUDAD" });

        const managerId = req.user.id;

        const result = await pool.query(
            `INSERT INTO piso (direccion, ciudad, codigo_postal, descripcion, manager_usuario_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, direccion, ciudad, codigo_postal, descripcion, manager_usuario_id, activo, created_at`,
            [direccion, ciudad, codigo_postal, descripcion, managerId]
        );

        return res.status(201).json({ piso: result.rows[0] });
    } catch (err) {
        console.error("createPiso error:", err);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
};

// PATCH /api/piso/:id  (routes ya restringen advertiser/admin)
// Aquí validamos: admin o manager_usuario_id
const updatePiso = async (req, res) => {
  try {
    const pisoId = toInt(req.params.pisoId, NaN);
    if (!Number.isFinite(pisoId)) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: ["pisoId"] });
    }

    const current = await pool.query(
      `
      SELECT id, manager_usuario_id, activo
      FROM piso
      WHERE id = $1
      `,
      [pisoId]
    );

    if (current.rowCount === 0) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    const piso = current.rows[0];
    const isAdmin = req.user?.rol === "admin";
    const isManager = Number(piso.manager_usuario_id) === Number(req.user?.id);

    if (!isAdmin && !isManager) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const direccion =
      typeof req.body?.direccion === "string" ? req.body.direccion.trim() : undefined;

    const ciudad =
      typeof req.body?.ciudad === "string" ? req.body.ciudad.trim() : undefined;

    const codigo_postal =
      req.body?.codigo_postal === null
        ? null
        : typeof req.body?.codigo_postal === "string"
          ? req.body.codigo_postal.trim()
          : req.body?.codigo_postal !== undefined
            ? String(req.body.codigo_postal).trim()
            : undefined;

    const descripcion =
      req.body?.descripcion === null
        ? null
        : typeof req.body?.descripcion === "string"
          ? req.body.descripcion.trim()
          : undefined;

    const activo =
      typeof req.body?.activo === "boolean" ? req.body.activo : undefined;

    const updates = [];
    const params = [];
    let idx = 1;

    if (direccion !== undefined) {
      if (!direccion) {
        return res.status(400).json({ error: "VALIDATION_ERROR", details: ["direccion"] });
      }
      params.push(direccion);
      updates.push(`direccion = $${idx++}`);
    }

    if (ciudad !== undefined) {
      if (!ciudad) {
        return res.status(400).json({ error: "VALIDATION_ERROR", details: ["ciudad"] });
      }
      params.push(ciudad);
      updates.push(`ciudad = $${idx++}`);
    }

    if (codigo_postal !== undefined) {
      params.push(codigo_postal);
      updates.push(`codigo_postal = $${idx++}`);
    }

    if (descripcion !== undefined) {
      params.push(descripcion);
      updates.push(`descripcion = $${idx++}`);
    }

    if (activo !== undefined) {
      params.push(activo);
      updates.push(`activo = $${idx++}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "NO_FIELDS_TO_UPDATE" });
    }

    params.push(pisoId);

    const result = await pool.query(
      `
      UPDATE piso
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${idx}
      RETURNING id, direccion, ciudad, codigo_postal, descripcion, manager_usuario_id, activo, created_at, updated_at
      `,
      params
    );

    return res.json({ piso: result.rows[0] });
  } catch (err) {
    console.error("updatePiso error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// DELETE /api/piso/:id  (soft delete)
const deletePiso = async (req, res) => {
  try {
    const pisoId = toInt(req.params.pisoId, NaN);
    if (!Number.isFinite(pisoId)) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: ["pisoId"] });
    }

    const current = await pool.query(
      `
      SELECT id, manager_usuario_id
      FROM piso
      WHERE id = $1
      `,
      [pisoId]
    );

    if (current.rowCount === 0) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    const piso = current.rows[0];
    const isAdmin = req.user?.rol === "admin";
    const isManager = Number(piso.manager_usuario_id) === Number(req.user?.id);

    if (!isAdmin && !isManager) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const result = await pool.query(
      `
      UPDATE piso
      SET activo = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
      `,
      [pisoId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("deletePiso error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// =========================================================
// POST /api/admin/piso/:pisoId/fotos
// - Si NO viene "orden", asigna automáticamente next_orden = max(orden)+1
// =========================================================
const addFotoPiso = async (req, res) => {
    const requesterId = req.user?.id;
    const requesterRol = req.user?.rol;

    const pisoId = toInt(req.params.pisoId, NaN);

    const ordenProvided = Object.prototype.hasOwnProperty.call(req.body || {}, "orden");
    let orden = ordenProvided ? toInt(req.body.orden, NaN) : undefined;

    const invalid = [];
    if (!Number.isFinite(pisoId)) invalid.push("pisoId");
    if (!req.file) invalid.push("foto");
    if (ordenProvided && (!Number.isFinite(orden) || orden < 0)) invalid.push("orden");

    if (invalid.length) {
        return res.status(400).json({ error: "VALIDATION_ERROR", details: invalid });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const piso = await getPisoForAdminFoto(client, pisoId);
        if (!piso) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "NOT_FOUND" });
        }

        const isAdmin = requesterRol === "admin";
        const isManager = Number(piso.manager_usuario_id) === Number(requesterId);

        if (!isAdmin && !isManager) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "FORBIDDEN" });
        }

        if (!piso.activo) {
            await client.query("ROLLBACK");
            return res.status(409).json({ error: "PISO_INACTIVE" });
        }

        if (!ordenProvided) {
            const next = await client.query(
                `
                SELECT COALESCE(MAX(orden), -1) + 1 AS next_orden
                FROM foto_piso
                WHERE piso_id = $1
                `,
                [pisoId]
            );
            orden = Number(next.rows[0].next_orden);
        }

        const url = `/uploads/pisos/${pisoId}/${req.file.filename}`;

        const q = await client.query(
            `
            INSERT INTO foto_piso (piso_id, url, orden)
            VALUES ($1, $2, $3)
            RETURNING id, piso_id, url, orden, created_at
            `,
            [pisoId, url, orden]
        );

        await client.query("COMMIT");

        return res.status(201).json({ foto: q.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");

        if (error?.code === "23505") {
            return res.status(409).json({ error: "ORDER_CONFLICT" });
        }

        console.error("addFotoPiso error:", error);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    } finally {
        client.release();
    }
};

// =========================================================
// PATCH /api/admin/piso/:pisoId/fotos/:fotoId
// =========================================================
const updateFotoPiso = async (req, res) => {
    const requesterId = req.user?.id;
    const requesterRol = req.user?.rol;

    const pisoId = toInt(req.params.pisoId, NaN);
    const fotoId = toInt(req.params.fotoId, NaN);

    const hasUrl = Object.prototype.hasOwnProperty.call(req.body || {}, "url");
    const hasOrden = Object.prototype.hasOwnProperty.call(req.body || {}, "orden");

    const invalid = [];
    if (!Number.isFinite(pisoId)) invalid.push("pisoId");
    if (!Number.isFinite(fotoId)) invalid.push("fotoId");

    let url;
    if (hasUrl) {
        url = String(req.body.url || "").trim();
        if (!url) invalid.push("url");
    }

    let orden;
    if (hasOrden) {
        orden = toInt(req.body.orden, NaN);
        if (!Number.isFinite(orden) || orden < 0) invalid.push("orden");
    }

    if (!hasUrl && !hasOrden) invalid.push("body");

    if (invalid.length) {
        return res.status(400).json({ error: "VALIDATION_ERROR", details: invalid });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const piso = await getPisoForAdminFoto(client, pisoId);
        if (!piso) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "NOT_FOUND" });
        }

        const isAdmin = requesterRol === "admin";
        const isManager = Number(piso.manager_usuario_id) === Number(requesterId);

        if (!isAdmin && !isManager) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "FORBIDDEN" });
        }

        if (!piso.activo) {
            await client.query("ROLLBACK");
            return res.status(409).json({ error: "PISO_INACTIVE" });
        }

        const sets = [];
        const params = [];
        let i = 1;

        if (hasUrl) {
            sets.push(`url = $${i++}`);
            params.push(url);
        }
        if (hasOrden) {
            sets.push(`orden = $${i++}`);
            params.push(orden);
        }

        params.push(fotoId);
        params.push(pisoId);

        const q = await client.query(
            `
      UPDATE foto_piso
      SET ${sets.join(", ")}
      WHERE id = $${i++}
        AND piso_id = $${i++}
      RETURNING id, piso_id, url, orden, created_at
      `,
            params
        );

        if (q.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "NOT_FOUND" });
        }

        await client.query("COMMIT");

        return res.json({ foto: q.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");

        if (error?.code === "23505") {
            return res.status(409).json({ error: "ORDER_CONFLICT" });
        }

        console.error("updateFotoPiso error:", error);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    } finally {
        client.release();
    }
};

// =========================================================
// DELETE /api/admin/piso/:pisoId/fotos/:fotoId
// =========================================================
const deleteFotoPiso = async (req, res) => {
    const requesterId = req.user?.id;
    const requesterRol = req.user?.rol;

    const pisoId = toInt(req.params.pisoId, NaN);
    const fotoId = toInt(req.params.fotoId, NaN);

    const invalid = [];
    if (!Number.isFinite(pisoId)) invalid.push("pisoId");
    if (!Number.isFinite(fotoId)) invalid.push("fotoId");

    if (invalid.length) {
        return res.status(400).json({ error: "VALIDATION_ERROR", details: invalid });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const piso = await getPisoForAdminFoto(client, pisoId);
        if (!piso) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "NOT_FOUND" });
        }

        const isAdmin = requesterRol === "admin";
        const isManager = Number(piso.manager_usuario_id) === Number(requesterId);

        if (!isAdmin && !isManager) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "FORBIDDEN" });
        }

        const q = await client.query(
          `
          DELETE FROM foto_piso
          WHERE id = $1
            AND piso_id = $2
          RETURNING id, url
          `,
          [fotoId, pisoId]
        );
        
        if (q.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ error: "NOT_FOUND" });
        }
        
        await client.query("COMMIT");
        
        deleteUploadedFileByUrl(q.rows[0].url);
        
        return res.json({ deleted: true });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("deleteFotoPiso error:", error);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    } finally {
        client.release();
    }
};

module.exports = {
    listPisosAdmin,
    getPisoAdminById,
    listHabitacionesAdminByPiso,
    createPiso,
    updatePiso,
    deletePiso,
    addFotoPiso,
    updateFotoPiso,
    deleteFotoPiso
};