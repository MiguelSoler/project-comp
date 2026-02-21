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
// ---------------------------------------------------------
const addFotoHabitacion = async (req, res) => {
  const requesterId = req.user?.id;
  const requesterRol = req.user?.rol;

  const habitacionId = toInt(req.params.habitacionId, NaN);
  const url = String(req.body?.url || "").trim();
  const orden = req.body?.orden === undefined ? 0 : toInt(req.body.orden, NaN);

  const invalid = [];
  if (!Number.isFinite(habitacionId)) invalid.push("habitacionId");
  if (!url) invalid.push("url");
  if (!Number.isFinite(orden) || orden < 0) invalid.push("orden");
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

module.exports = {
  createHabitacion,
  updateHabitacion,
  deactivateHabitacion,
  addFotoHabitacion,
  updateFotoHabitacion,
  deleteFotoHabitacion,
};
