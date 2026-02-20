// Controllers PÚBLICOS de Habitacion (catálogo)
// Nota: GET /api/habitacion/:habitacionId devuelve detalle + fotos

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

// ---------------------------------------------------------
// GET /api/habitacion (public)
// Filtros: ciudad, precioMax, disponible, bano, balcon, amueblada,
//         tamanoMin, tamanoMax, q
// Paginación: page, limit
// Orden: sort=precio_asc|precio_desc|newest|tamano_desc
// ---------------------------------------------------------
const listHabitaciones = async (req, res) => {
  try {
    const ciudad = (req.query.ciudad || "").trim();
    const qText = (req.query.q || "").trim();

    const precioMax =
      req.query.precioMax !== undefined ? toInt(req.query.precioMax, NaN) : NaN;
    const tamanoMin =
      req.query.tamanoMin !== undefined ? toInt(req.query.tamanoMin, NaN) : NaN;
    const tamanoMax =
      req.query.tamanoMax !== undefined ? toInt(req.query.tamanoMax, NaN) : NaN;

    const disponible = toBool(req.query.disponible);
    const bano = toBool(req.query.bano);
    const balcon = toBool(req.query.balcon);
    const amueblada = toBool(req.query.amueblada);

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 10)));
    const offset = (page - 1) * limit;

    const sort = String(req.query.sort || "precio_asc");
    const sortMap = {
      precio_asc: "h.precio_mensual ASC, h.id ASC",
      precio_desc: "h.precio_mensual DESC, h.id DESC",
      newest: "h.created_at DESC, h.id DESC",
      tamano_desc: "h.tamano_m2 DESC NULLS LAST, h.precio_mensual ASC, h.id ASC",
    };
    const orderBy = sortMap[sort] || sortMap.precio_asc;

    const where = [];
    const params = [];
    let i = 1;

    // Visible para público: piso activo + habitación activa
    where.push("p.activo = true");
    where.push("h.activo = true");

    if (ciudad) {
      params.push(ciudad);
      where.push(`p.ciudad = $${i++}`);
    }

    if (Number.isFinite(precioMax)) {
      params.push(precioMax);
      where.push(`h.precio_mensual <= $${i++}`);
    }

    // Default catálogo: solo disponibles si no se especifica
    if (disponible !== undefined) {
      params.push(disponible);
      where.push(`h.disponible = $${i++}`);
    } else {
      where.push("h.disponible = true");
    }

    if (bano !== undefined) {
      params.push(bano);
      where.push(`h.bano = $${i++}`);
    }
    if (balcon !== undefined) {
      params.push(balcon);
      where.push(`h.balcon = $${i++}`);
    }
    if (amueblada !== undefined) {
      params.push(amueblada);
      where.push(`h.amueblada = $${i++}`);
    }

    if (Number.isFinite(tamanoMin)) {
      params.push(tamanoMin);
      where.push(`h.tamano_m2 >= $${i++}`);
    }
    if (Number.isFinite(tamanoMax)) {
      params.push(tamanoMax);
      where.push(`h.tamano_m2 <= $${i++}`);
    }

    if (qText) {
      params.push(qText);
      where.push(
        `to_tsvector('spanish', coalesce(h.titulo,'') || ' ' || coalesce(h.descripcion,'')) @@ plainto_tsquery('spanish', $${i++})`
      );
    }

    params.push(limit);
    params.push(offset);

    const whereSql = `WHERE ${where.join(" AND ")}`;

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
        (SELECT fp.url
         FROM foto_piso fp
         WHERE fp.piso_id = p.id
         ORDER BY fp.orden ASC, fp.id ASC
         LIMIT 1) AS cover_foto_piso_url,
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

    const items = r.rows.map(({ total_count, ...rest }) => rest);

    return res.json({ page, limit, total, totalPages, items });
  } catch (error) {
    console.error("listHabitaciones error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// ---------------------------------------------------------
// GET /api/habitacion/piso/:pisoId (public, visibles)
// ---------------------------------------------------------
const listHabitacionesByPiso = async (req, res) => {
  try {
    const pisoId = toInt(req.params.pisoId, NaN);
    if (!Number.isFinite(pisoId)) return badRequest(res, ["pisoId"]);

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 20)));
    const offset = (page - 1) * limit;

    const sort = String(req.query.sort || "precio_asc");
    const sortMap = {
      precio_asc: "h.precio_mensual ASC, h.id ASC",
      precio_desc: "h.precio_mensual DESC, h.id DESC",
      newest: "h.created_at DESC, h.id DESC",
    };
    const orderBy = sortMap[sort] || sortMap.precio_asc;

    const sql = `
      SELECT
        h.*,
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
      WHERE h.piso_id = $1
        AND p.activo = true
        AND h.activo = true
        AND h.disponible = true
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `;

    const r = await pool.query(sql, [pisoId, limit, offset]);

    const total = r.rowCount ? Number(r.rows[0].total_count) : 0;
    const totalPages = total ? Math.ceil(total / limit) : 0;

    const items = r.rows.map(({ total_count, ...rest }) => rest);

    return res.json({ page, limit, total, totalPages, items });
  } catch (error) {
    console.error("listHabitacionesByPiso error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// ---------------------------------------------------------
// GET /api/habitacion/:habitacionId (public detalle + fotos)
// ---------------------------------------------------------
const getHabitacionById = async (req, res) => {
  try {
    const habitacionId = toInt(req.params.habitacionId, NaN);
    if (!Number.isFinite(habitacionId)) return badRequest(res, ["habitacionId"]);

    const q = await pool.query(
      `
      SELECT
        h.*,
        p.ciudad,
        p.direccion,
        p.codigo_postal,
        p.descripcion AS piso_descripcion,
        p.manager_usuario_id,
        p.activo AS piso_activo,
        EXISTS (
          SELECT 1
          FROM usuario_habitacion uh
          WHERE uh.habitacion_id = h.id
            AND uh.fecha_salida IS NULL
        ) AS ocupada
      FROM habitacion h
      JOIN piso p ON p.id = h.piso_id
      WHERE h.id = $1
      `,
      [habitacionId]
    );

    if (q.rowCount === 0) return notFound(res);

    const habitacion = q.rows[0];

    // Público: ocultar si piso o habitación están inactivos
    if (!habitacion.piso_activo || !habitacion.activo) return notFound(res);

    const fotos = await pool.query(
      `
      SELECT id, habitacion_id, url, orden, created_at
      FROM foto_habitacion
      WHERE habitacion_id = $1
      ORDER BY orden ASC, id ASC
      `,
      [habitacionId]
    );

    return res.json({ habitacion, fotos: fotos.rows });
  } catch (error) {
    console.error("getHabitacionById error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// ---------------------------------------------------------
// GET /api/habitacion/:habitacionId/fotos (public)
// (se mantiene por si quieres cargar por separado o reutilizar)
// ---------------------------------------------------------
const listFotosHabitacion = async (req, res) => {
  try {
    const habitacionId = toInt(req.params.habitacionId, NaN);
    if (!Number.isFinite(habitacionId)) return badRequest(res, ["habitacionId"]);

    // Público: si piso o habitación están inactivos -> 404
    const check = await pool.query(
      `
      SELECT h.id
      FROM habitacion h
      JOIN piso p ON p.id = h.piso_id
      WHERE h.id = $1
        AND h.activo = true
        AND p.activo = true
      `,
      [habitacionId]
    );
    if (check.rowCount === 0) return notFound(res);

    const fotos = await pool.query(
      `
      SELECT id, habitacion_id, url, orden, created_at
      FROM foto_habitacion
      WHERE habitacion_id = $1
      ORDER BY orden ASC, id ASC
      `,
      [habitacionId]
    );

    return res.json({ fotos: fotos.rows });
  } catch (error) {
    console.error("listFotosHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

module.exports = {
  listHabitaciones,
  listHabitacionesByPiso,
  getHabitacionById,
  listFotosHabitacion,
};
