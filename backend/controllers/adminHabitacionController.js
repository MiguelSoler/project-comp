// backend/controllers/adminHabitacionController.js
// Controllers PRIVADOS de Habitacion (gestión: admin o manager del piso)

const pool = require("../db/pool");

function toInt(value, fallback = NaN) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;

  const v = String(value).trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
}

const badRequest = (res, details = []) =>
  res.status(400).json({ error: "VALIDATION_ERROR", details });

const notFound = (res) => res.status(404).json({ error: "NOT_FOUND" });
const forbidden = (res) => res.status(403).json({ error: "FORBIDDEN" });

async function assertPisoManagerOrAdmin(client, requesterId, requesterRol, pisoId) {
  const q = await client.query(
    `
    SELECT id, manager_usuario_id, activo
    FROM piso
    WHERE id = $1
    `,
    [pisoId]
  );

  if (q.rowCount === 0) return { ok: false, code: "NOT_FOUND" };

  const piso = q.rows[0];
  const isAdmin = requesterRol === "admin";
  const isManager = Number(piso.manager_usuario_id) === Number(requesterId);

  if (!isAdmin && !isManager) return { ok: false, code: "FORBIDDEN" };

  return { ok: true, piso };
}

async function assertHabitacionManagerOrAdmin(
  client,
  requesterId,
  requesterRol,
  habitacionId
) {
  const q = await client.query(
    `
    SELECT
      h.id AS habitacion_id,
      h.piso_id,
      h.activo AS habitacion_activa,
      h.disponible,
      p.manager_usuario_id,
      p.activo AS piso_activo
    FROM habitacion h
    JOIN piso p ON p.id = h.piso_id
    WHERE h.id = $1
    `,
    [habitacionId]
  );

  if (q.rowCount === 0) return { ok: false, code: "NOT_FOUND" };

  const row = q.rows[0];
  const isAdmin = requesterRol === "admin";
  const isManager = Number(row.manager_usuario_id) === Number(requesterId);

  if (!isAdmin && !isManager) return { ok: false, code: "FORBIDDEN" };

  return { ok: true, data: row };
}

async function hasActiveOccupancy(client, habitacionId) {
  const q = await client.query(
    `
    SELECT 1
    FROM usuario_habitacion
    WHERE habitacion_id = $1
      AND fecha_salida IS NULL
    LIMIT 1
    `,
    [habitacionId]
  );
  return q.rowCount > 0;
}

// ---------------------------------------------------------
// GET /api/admin/habitacion
// - Admin: ve todas las habitaciones
// - Advertiser/Manager: solo habitaciones de sus pisos
// Query: page, limit, activo=all|true|false, disponible=all|true|false,
//        pisoId, ciudad, q, sort=precio_asc|precio_desc|newest|updated
// ---------------------------------------------------------
const listHabitacionesAdmin = async (req, res) => {
  try {
    const requesterId = req.user?.id;
    const requesterRol = req.user?.rol;

    if (requesterRol !== "admin" && requesterRol !== "advertiser") {
      return forbidden(res);
    }

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 10)));
    const offset = (page - 1) * limit;

    const activoRaw = String(req.query.activo || "all").toLowerCase(); // all|true|false
    const disponibleRaw = String(req.query.disponible || "all").toLowerCase(); // all|true|false
    const ciudad = (req.query.ciudad || "").trim();
    const qText = (req.query.q || "").trim();

    const pisoId =
      req.query.pisoId !== undefined ? toInt(req.query.pisoId, NaN) : undefined;
    if (req.query.pisoId !== undefined && !Number.isFinite(pisoId)) {
      return badRequest(res, ["pisoId"]);
    }

    const sort = String(req.query.sort || "newest");
    const sortMap = {
      precio_asc: "h.precio_mensual ASC, h.id ASC",
      precio_desc: "h.precio_mensual DESC, h.id DESC",
      newest: "h.created_at DESC, h.id DESC",
      updated: "h.updated_at DESC, h.id DESC",
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

    // Filtro activo (habitacion)
    if (activoRaw !== "all") {
      if (activoRaw !== "true" && activoRaw !== "false") {
        return badRequest(res, ["activo"]);
      }
      params.push(activoRaw === "true");
      where.push(`h.activo = $${i++}`);
    }

    // Filtro disponible (habitacion)
    if (disponibleRaw !== "all") {
      if (disponibleRaw !== "true" && disponibleRaw !== "false") {
        return badRequest(res, ["disponible"]);
      }
      params.push(disponibleRaw === "true");
      where.push(`h.disponible = $${i++}`);
    }

    if (Number.isFinite(pisoId)) {
      params.push(pisoId);
      where.push(`h.piso_id = $${i++}`);
    }

    if (ciudad) {
      params.push(ciudad);
      where.push(`p.ciudad = $${i++}`);
    }

    if (qText) {
      params.push(qText);
      where.push(
        `to_tsvector('spanish', coalesce(h.titulo,'') || ' ' || coalesce(h.descripcion,'')) @@ plainto_tsquery('spanish', $${i++})`
      );
    }

    params.push(limit);
    params.push(offset);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
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

        p.ciudad,
        p.direccion,
        p.codigo_postal,
        p.activo AS piso_activo,
        p.manager_usuario_id,

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
      JOIN piso p ON p.id = h.piso_id
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT $${i++} OFFSET $${i++}
    `;

    const r = await pool.query(sql, params);

    const total = r.rowCount ? Number(r.rows[0].total_count) : 0;
    const totalPages = total ? Math.ceil(total / limit) : 0;

    const items = r.rows.map(({ total_count, ...row }) => row);

    return res.json({ page, limit, total, totalPages, items });
  } catch (error) {
    console.error("listHabitacionesAdmin error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// ---------------------------------------------------------
// POST /api/admin/habitacion
// ---------------------------------------------------------
const createHabitacion = async (req, res) => {
  const requesterId = req.user?.id;
  const requesterRol = req.user?.rol;

  const piso_id = toInt(req.body?.piso_id, NaN);
  const titulo = String(req.body?.titulo || "").trim();
  const descripcion =
    req.body?.descripcion === undefined ? null : req.body.descripcion === null ? null : String(req.body.descripcion);
  const precio_mensual = toInt(req.body?.precio_mensual, NaN);

  const disponibleRaw = req.body?.disponible;
  const disponible =
    disponibleRaw === undefined ? true : toBool(disponibleRaw);

  const tamano_m2 =
    req.body?.tamano_m2 === undefined || req.body?.tamano_m2 === null
      ? null
      : toInt(req.body.tamano_m2, NaN);

  const amuebladaRaw = req.body?.amueblada;
  const amuebladaParsed = amuebladaRaw === undefined ? false : toBool(amuebladaRaw);

  const banoRaw = req.body?.bano;
  const banoParsed = banoRaw === undefined ? false : toBool(banoRaw);

  const balconRaw = req.body?.balcon;
  const balconParsed = balconRaw === undefined ? false : toBool(balconRaw);

  const invalid = [];
  if (!Number.isFinite(piso_id)) invalid.push("piso_id");
  if (!titulo) invalid.push("titulo");
  if (!Number.isFinite(precio_mensual) || precio_mensual < 0) invalid.push("precio_mensual");
  if (disponible === undefined) invalid.push("disponible");
  if (tamano_m2 !== null && (!Number.isFinite(tamano_m2) || tamano_m2 <= 0)) invalid.push("tamano_m2");
  if (amuebladaParsed === undefined) invalid.push("amueblada");
  if (banoParsed === undefined) invalid.push("bano");
  if (balconParsed === undefined) invalid.push("balcon");

  if (invalid.length) return badRequest(res, invalid);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const authz = await assertPisoManagerOrAdmin(client, requesterId, requesterRol, piso_id);
    if (!authz.ok) {
      await client.query("ROLLBACK");
      return authz.code === "NOT_FOUND" ? notFound(res) : forbidden(res);
    }

    if (!authz.piso.activo) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "PISO_INACTIVE" });
    }

    const ins = await client.query(
      `
      INSERT INTO habitacion (
        piso_id,
        titulo,
        descripcion,
        precio_mensual,
        disponible,
        activo,
        tamano_m2,
        amueblada,
        bano,
        balcon
      )
      VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        piso_id,
        titulo,
        descripcion,
        precio_mensual,
        disponible,
        tamano_m2,
        amuebladaParsed,
        banoParsed,
        balconParsed,
      ]
    );

    await client.query("COMMIT");
    return res.status(201).json({ habitacion: ins.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("createHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// PATCH /api/admin/habitacion/:habitacionId
// ---------------------------------------------------------
const updateHabitacion = async (req, res) => {
  const requesterId = req.user?.id;
  const requesterRol = req.user?.rol;

  const habitacionId = toInt(req.params.habitacionId, NaN);
  if (!Number.isFinite(habitacionId)) return badRequest(res, ["habitacionId"]);

  const fields = {};
  const invalid = [];

  if (req.body?.titulo !== undefined) {
    fields.titulo = String(req.body.titulo).trim();
    if (!fields.titulo) invalid.push("titulo");
  }

  if (req.body?.descripcion !== undefined) {
    fields.descripcion = req.body.descripcion === null ? null : String(req.body.descripcion);
  }

  if (req.body?.precio_mensual !== undefined) {
    fields.precio_mensual = toInt(req.body.precio_mensual, NaN);
    if (!Number.isFinite(fields.precio_mensual) || fields.precio_mensual < 0) {
      invalid.push("precio_mensual");
    }
  }

  if (req.body?.disponible !== undefined) {
    fields.disponible = toBool(req.body.disponible);
    if (fields.disponible === undefined) invalid.push("disponible");
  }

  if (req.body?.tamano_m2 !== undefined) {
    fields.tamano_m2 =
      req.body.tamano_m2 === null ? null : toInt(req.body.tamano_m2, NaN);

    if (
      fields.tamano_m2 !== null &&
      (!Number.isFinite(fields.tamano_m2) || fields.tamano_m2 <= 0)
    ) {
      invalid.push("tamano_m2");
    }
  }

  if (req.body?.amueblada !== undefined) {
    fields.amueblada = toBool(req.body.amueblada);
    if (fields.amueblada === undefined) invalid.push("amueblada");
  }

  if (req.body?.bano !== undefined) {
    fields.bano = toBool(req.body.bano);
    if (fields.bano === undefined) invalid.push("bano");
  }

  if (req.body?.balcon !== undefined) {
    fields.balcon = toBool(req.body.balcon);
    if (fields.balcon === undefined) invalid.push("balcon");
  }

  if (invalid.length) return badRequest(res, invalid);
  if (Object.keys(fields).length === 0) return badRequest(res, ["body"]);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const authz = await assertHabitacionManagerOrAdmin(
      client,
      requesterId,
      requesterRol,
      habitacionId
    );
    if (!authz.ok) {
      await client.query("ROLLBACK");
      return authz.code === "NOT_FOUND" ? notFound(res) : forbidden(res);
    }

    if (!authz.data.piso_activo) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "PISO_INACTIVE" });
    }

    // Evita inconsistencias: no marcar disponible=true si ya hay ocupación activa
    if (fields.disponible === true) {
      const occupied = await hasActiveOccupancy(client, habitacionId);
      if (occupied) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "ROOM_OCCUPIED" });
      }
    }

    const setClauses = [];
    const params = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      params.push(value);
      setClauses.push(`${key} = $${idx++}`);
    }

    params.push(habitacionId);

    const upd = await client.query(
      `
      UPDATE habitacion
      SET ${setClauses.join(", ")}
      WHERE id = $${idx}
      RETURNING *
      `,
      params
    );

    if (upd.rowCount === 0) {
      await client.query("ROLLBACK");
      return notFound(res);
    }

    await client.query("COMMIT");
    return res.json({ habitacion: upd.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("updateHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// DELETE /api/admin/habitacion/:habitacionId/deactivate
// ---------------------------------------------------------
const deactivateHabitacion = async (req, res) => {
  const requesterId = req.user?.id;
  const requesterRol = req.user?.rol;

  const habitacionId = toInt(req.params.habitacionId, NaN);
  if (!Number.isFinite(habitacionId)) return badRequest(res, ["habitacionId"]);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const authz = await assertHabitacionManagerOrAdmin(
      client,
      requesterId,
      requesterRol,
      habitacionId
    );
    if (!authz.ok) {
      await client.query("ROLLBACK");
      return authz.code === "NOT_FOUND" ? notFound(res) : forbidden(res);
    }

    const upd = await client.query(
      `
      UPDATE habitacion
      SET activo = false
      WHERE id = $1
      RETURNING *
      `,
      [habitacionId]
    );

    if (upd.rowCount === 0) {
      await client.query("ROLLBACK");
      return notFound(res);
    }

    await client.query("COMMIT");
    return res.json({ habitacion: upd.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("deactivateHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// POST /api/admin/habitacion/:habitacionId/fotos
// Body: { url, orden? }
// - Si NO viene "orden", asigna automáticamente next_orden = max(orden)+1
// ---------------------------------------------------------
const addFotoHabitacion = async (req, res) => {
  const requesterId = req.user?.id;
  const requesterRol = req.user?.rol;

  const habitacionId = toInt(req.params.habitacionId, NaN);

  const ordenProvided = Object.prototype.hasOwnProperty.call(req.body || {}, "orden");
  let orden = ordenProvided ? toInt(req.body.orden, NaN) : undefined;

  const invalid = [];
  if (!Number.isFinite(habitacionId)) invalid.push("habitacionId");
  if (!req.file) invalid.push("foto");
  if (ordenProvided && (!Number.isFinite(orden) || orden < 0)) invalid.push("orden");
  if (invalid.length) return badRequest(res, invalid);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const authz = await assertHabitacionManagerOrAdmin(
      client,
      requesterId,
      requesterRol,
      habitacionId
    );

    if (!authz.ok) {
      await client.query("ROLLBACK");
      return authz.code === "NOT_FOUND" ? notFound(res) : forbidden(res);
    }

    // Si no viene orden, calcula el siguiente (max + 1)
    if (!ordenProvided) {
      const next = await client.query(
        `
        SELECT COALESCE(MAX(orden), -1) + 1 AS next_orden
        FROM foto_habitacion
        WHERE habitacion_id = $1
        `,
        [habitacionId]
      );
      orden = Number(next.rows[0].next_orden);
    }

    const url = `/uploads/habitaciones/${habitacionId}/${req.file.filename}`;

    const ins = await client.query(
      `
      INSERT INTO foto_habitacion (habitacion_id, url, orden)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [habitacionId, url, orden]
    );

    await client.query("COMMIT");
    return res.status(201).json({ foto: ins.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error?.code === "23505") {
      return res.status(409).json({ error: "ORDER_CONFLICT" });
    }

    console.error("addFotoHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// PATCH /api/admin/habitacion/:habitacionId/fotos/:fotoId
// Body: { url?, orden? }
// ---------------------------------------------------------
const updateFotoHabitacion = async (req, res) => {
  const requesterId = req.user?.id;
  const requesterRol = req.user?.rol;

  const habitacionId = toInt(req.params.habitacionId, NaN);
  const fotoId = toInt(req.params.fotoId, NaN);

  const invalid = [];
  if (!Number.isFinite(habitacionId)) invalid.push("habitacionId");
  if (!Number.isFinite(fotoId)) invalid.push("fotoId");

  const fields = {};

  if (req.body?.url !== undefined) {
    fields.url = String(req.body.url).trim();
    if (!fields.url) invalid.push("url");
  }

  if (req.body?.orden !== undefined) {
    fields.orden = toInt(req.body.orden, NaN);
    if (!Number.isFinite(fields.orden) || fields.orden < 0) invalid.push("orden");
  }

  if (invalid.length) return badRequest(res, invalid);
  if (Object.keys(fields).length === 0) return badRequest(res, ["body"]);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const authz = await assertHabitacionManagerOrAdmin(
      client,
      requesterId,
      requesterRol,
      habitacionId
    );
    if (!authz.ok) {
      await client.query("ROLLBACK");
      return authz.code === "NOT_FOUND" ? notFound(res) : forbidden(res);
    }

    const setClauses = [];
    const params = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      params.push(value);
      setClauses.push(`${key} = $${idx++}`);
    }

    params.push(fotoId);
    params.push(habitacionId);

    const upd = await client.query(
      `
      UPDATE foto_habitacion
      SET ${setClauses.join(", ")}
      WHERE id = $${idx++}
        AND habitacion_id = $${idx}
      RETURNING *
      `,
      params
    );

    if (upd.rowCount === 0) {
      await client.query("ROLLBACK");
      return notFound(res);
    }

    await client.query("COMMIT");
    return res.json({ foto: upd.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error?.code === "23505") {
      return res.status(409).json({ error: "ORDER_CONFLICT" });
    }

    console.error("updateFotoHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// DELETE /api/admin/habitacion/:habitacionId/fotos/:fotoId
// ---------------------------------------------------------
const deleteFotoHabitacion = async (req, res) => {
  const requesterId = req.user?.id;
  const requesterRol = req.user?.rol;

  const habitacionId = toInt(req.params.habitacionId, NaN);
  const fotoId = toInt(req.params.fotoId, NaN);

  const invalid = [];
  if (!Number.isFinite(habitacionId)) invalid.push("habitacionId");
  if (!Number.isFinite(fotoId)) invalid.push("fotoId");
  if (invalid.length) return badRequest(res, invalid);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const authz = await assertHabitacionManagerOrAdmin(
      client,
      requesterId,
      requesterRol,
      habitacionId
    );
    if (!authz.ok) {
      await client.query("ROLLBACK");
      return authz.code === "NOT_FOUND" ? notFound(res) : forbidden(res);
    }

    const del = await client.query(
      `
      DELETE FROM foto_habitacion
      WHERE id = $1
        AND habitacion_id = $2
      RETURNING id
      `,
      [fotoId, habitacionId]
    );

    if (del.rowCount === 0) {
      await client.query("ROLLBACK");
      return notFound(res);
    }

    await client.query("COMMIT");
    return res.json({ deleted: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("deleteFotoHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// GET /api/admin/habitacion/:habitacionId
// - Admin: puede ver cualquier habitación
// - Advertiser/Manager: solo habitaciones de sus pisos
// ---------------------------------------------------------
const getHabitacionAdminById = async (req, res) => {
  const requesterId = req.user?.id;
  const requesterRol = req.user?.rol;

  const habitacionId = toInt(req.params.habitacionId, NaN);
  if (!Number.isFinite(habitacionId)) return badRequest(res, ["habitacionId"]);

  try {
    if (requesterRol !== "admin" && requesterRol !== "advertiser") {
      return forbidden(res);
    }

    const authz = await assertHabitacionManagerOrAdmin(
      pool,
      requesterId,
      requesterRol,
      habitacionId
    );

    if (!authz.ok) {
      return authz.code === "NOT_FOUND" ? notFound(res) : forbidden(res);
    }

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

        p.ciudad,
        p.direccion,
        p.codigo_postal,
        p.activo AS piso_activo,
        p.manager_usuario_id,

        EXISTS (
          SELECT 1
          FROM usuario_habitacion uh
          WHERE uh.habitacion_id = h.id
            AND uh.fecha_salida IS NULL
        ) AS ocupada
      FROM habitacion h
      JOIN piso p ON p.id = h.piso_id
      WHERE h.id = $1
      LIMIT 1
      `,
      [habitacionId]
    );

    if (q.rowCount === 0) return notFound(res);

    const fotos = await pool.query(
      `
      SELECT id, habitacion_id, url, orden, created_at
      FROM foto_habitacion
      WHERE habitacion_id = $1
      ORDER BY orden ASC, id ASC
      `,
      [habitacionId]
    );

    return res.json({
      habitacion: q.rows[0],
      fotos: fotos.rows,
    });
  } catch (error) {
    console.error("getHabitacionAdminById error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// ---------------------------------------------------------
// PATCH /api/admin/habitacion/:habitacionId/reactivate
// ---------------------------------------------------------
const reactivateHabitacion = async (req, res) => {
  const requesterId = req.user?.id;
  const requesterRol = req.user?.rol;

  const habitacionId = toInt(req.params.habitacionId, NaN);
  if (!Number.isFinite(habitacionId)) return badRequest(res, ["habitacionId"]);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const authz = await assertHabitacionManagerOrAdmin(
      client,
      requesterId,
      requesterRol,
      habitacionId
    );

    if (!authz.ok) {
      await client.query("ROLLBACK");
      return authz.code === "NOT_FOUND" ? notFound(res) : forbidden(res);
    }

    if (!authz.data.piso_activo) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "PISO_INACTIVE" });
    }

    const upd = await client.query(
      `
      UPDATE habitacion
      SET activo = true
      WHERE id = $1
      RETURNING *
      `,
      [habitacionId]
    );

    if (upd.rowCount === 0) {
      await client.query("ROLLBACK");
      return notFound(res);
    }

    await client.query("COMMIT");
    return res.json({ habitacion: upd.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("reactivateHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

module.exports = {
  listHabitacionesAdmin,
  createHabitacion,
  updateHabitacion,
  deactivateHabitacion,
  addFotoHabitacion,
  updateFotoHabitacion,
  deleteFotoHabitacion,
  getHabitacionAdminById,
  reactivateHabitacion
};
