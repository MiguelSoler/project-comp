// Controllers PÚBLICOS de habitacion (catálogo)
// Nota: GET /api/habitacion/:habitacionId devuelve detalle + fotos + convivencia actual

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
// SQL reutilizable: resumen de convivencia actual de un piso
// - Selecciona solo ocupantes actuales del piso
// - Calcula la reputación media GLOBAL de cada ocupante
// - Después resume el piso a partir de esos ocupantes actuales
//
// Nota importante de producto:
// - Solo contamos convivientes actuales del piso
// - La reputación de cada conviviente sale de sus votos recibidos
// ---------------------------------------------------------
const CURRENT_OCCUPANTS_SUMMARY_SQL = `
  WITH current_occupants AS (
    SELECT DISTINCT u.id
    FROM usuario_habitacion uh2
    JOIN habitacion h2 ON h2.id = uh2.habitacion_id
    JOIN usuario u ON u.id = uh2.usuario_id
    WHERE h2.piso_id = p.id
      AND uh2.fecha_salida IS NULL
      AND uh2.estado = 'active'
      AND u.activo = true
  ),
  occupant_scores AS (
    SELECT
      co.id AS usuario_id,
      COUNT(vu.id)::int AS total_votos,
      ROUND(
        AVG(
          ((vu.limpieza + vu.ruido + vu.puntualidad_pagos)::numeric / 3)
        ),
        2
      ) AS media_global,
      ROUND(AVG(vu.limpieza)::numeric, 2) AS media_limpieza,
      ROUND(AVG(vu.ruido)::numeric, 2) AS media_ruido,
      ROUND(AVG(vu.puntualidad_pagos)::numeric, 2) AS media_puntualidad_pagos
    FROM current_occupants co
    LEFT JOIN voto_usuario vu ON vu.votado_id = co.id
    GROUP BY co.id
  )
  SELECT
    COUNT(*)::int AS convivientes_actuales,
    COUNT(*) FILTER (WHERE os.total_votos > 0)::int AS convivientes_con_votos,
    ROUND(AVG(os.media_global) FILTER (WHERE os.total_votos > 0), 2) AS media_global,
    ROUND(AVG(os.media_limpieza) FILTER (WHERE os.total_votos > 0), 2) AS media_limpieza,
    ROUND(AVG(os.media_ruido) FILTER (WHERE os.total_votos > 0), 2) AS media_ruido,
    ROUND(
      AVG(os.media_puntualidad_pagos) FILTER (WHERE os.total_votos > 0),
      2
    ) AS media_puntualidad_pagos
  FROM current_occupants co
  LEFT JOIN occupant_scores os ON os.usuario_id = co.id
`;

// ---------------------------------------------------------
// GET /api/habitacion (public)
// Filtros: ciudad, precioMax, disponible, bano, balcon, amueblada,
//         tamanoMin, tamanoMax, q
// Paginación: page, limit
// Orden: sort=precio_asc|precio_desc|newest|tamano_desc
//
// Devuelve además:
// - media global de convivencia actual del piso
// - número de convivientes actuales
// - número de convivientes con votos
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

    // Público: excluir habitaciones con estancia activa
    where.push(`NOT EXISTS (
      SELECT 1
      FROM usuario_habitacion uh
      WHERE uh.habitacion_id = h.id
        AND uh.fecha_salida IS NULL
    )`);

    if (ciudad) {
      params.push(ciudad);
      where.push(`LOWER(p.ciudad) = LOWER($${i++})`);
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

        convivencia.media_global AS convivencia_media_global,
        convivencia.convivientes_actuales AS convivencia_convivientes_actuales,
        convivencia.convivientes_con_votos AS convivencia_convivientes_con_votos,

        COUNT(*) OVER() AS total_count
      FROM habitacion h
      JOIN piso p ON p.id = h.piso_id
      LEFT JOIN LATERAL (
        ${CURRENT_OCCUPANTS_SUMMARY_SQL}
      ) convivencia ON true
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
        AND NOT EXISTS (
          SELECT 1
          FROM usuario_habitacion uh
          WHERE uh.habitacion_id = h.id
            AND uh.fecha_salida IS NULL
        )
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
//
// Devuelve además:
// - manager del piso (nombre, teléfono, foto)
// - resumen de convivencia actual del piso
// - ocupantes actuales del piso (nombre + foto + habitación + media global)
//
// Nota:
// - Solo exponemos nombre (campo nombre), no apellidos, para ser menos invasivos
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

        m.nombre AS manager_nombre,
        m.telefono AS manager_telefono,
        m.foto_perfil_url AS manager_foto_perfil_url,

        EXISTS (
          SELECT 1
          FROM usuario_habitacion uh
          WHERE uh.habitacion_id = h.id
            AND uh.fecha_salida IS NULL
        ) AS ocupada
      FROM habitacion h
      JOIN piso p ON p.id = h.piso_id
      LEFT JOIN usuario m ON m.id = p.manager_usuario_id
      WHERE h.id = $1
      `,
      [habitacionId]
    );

    if (q.rowCount === 0) return notFound(res);

    const habitacion = q.rows[0];

    // Público: ocultar si piso o habitación están inactivos
    if (!habitacion.piso_activo || !habitacion.activo) return notFound(res);

    // Fotos de la habitación
    const fotosQ = await pool.query(
      `
      SELECT id, habitacion_id, url, orden, created_at
      FROM foto_habitacion
      WHERE habitacion_id = $1
      ORDER BY orden ASC, id ASC
      `,
      [habitacionId]
    );

    // Resumen de convivencia actual del piso
    const convivenciaQ = await pool.query(
      `
      WITH current_occupants AS (
        SELECT DISTINCT u.id
        FROM usuario_habitacion uh2
        JOIN habitacion h2 ON h2.id = uh2.habitacion_id
        JOIN usuario u ON u.id = uh2.usuario_id
        WHERE h2.piso_id = $1
          AND uh2.fecha_salida IS NULL
          AND uh2.estado = 'active'
          AND u.activo = true
      ),
      occupant_scores AS (
        SELECT
          co.id AS usuario_id,
          COUNT(vu.id)::int AS total_votos,
          ROUND(
            AVG(
              ((vu.limpieza + vu.ruido + vu.puntualidad_pagos)::numeric / 3)
            ),
            2
          ) AS media_global,
          ROUND(AVG(vu.limpieza)::numeric, 2) AS media_limpieza,
          ROUND(AVG(vu.ruido)::numeric, 2) AS media_ruido,
          ROUND(AVG(vu.puntualidad_pagos)::numeric, 2) AS media_puntualidad_pagos
        FROM current_occupants co
        LEFT JOIN voto_usuario vu ON vu.votado_id = co.id
        GROUP BY co.id
      )
      SELECT
        COUNT(*)::int AS convivientes_actuales,
        COUNT(*) FILTER (WHERE os.total_votos > 0)::int AS convivientes_con_votos,
        ROUND(AVG(os.media_global) FILTER (WHERE os.total_votos > 0), 2) AS media_global,
        ROUND(AVG(os.media_limpieza) FILTER (WHERE os.total_votos > 0), 2) AS media_limpieza,
        ROUND(AVG(os.media_ruido) FILTER (WHERE os.total_votos > 0), 2) AS media_ruido,
        ROUND(
          AVG(os.media_puntualidad_pagos) FILTER (WHERE os.total_votos > 0),
          2
        ) AS media_puntualidad_pagos
      FROM current_occupants co
      LEFT JOIN occupant_scores os ON os.usuario_id = co.id
      `,
      [habitacion.piso_id]
    );

    // Ocupantes actuales del piso con nombre + foto + media global
    const ocupantesQ = await pool.query(
      `
      WITH current_occupants AS (
        SELECT
          u.id,
          u.nombre,
          u.foto_perfil_url,
          uh.habitacion_id,
          uh.fecha_entrada
        FROM usuario_habitacion uh
        JOIN habitacion h ON h.id = uh.habitacion_id
        JOIN usuario u ON u.id = uh.usuario_id
        WHERE h.piso_id = $1
          AND uh.fecha_salida IS NULL
          AND uh.estado = 'active'
          AND u.activo = true
      ),
      occupant_scores AS (
        SELECT
          co.id AS usuario_id,
          COUNT(vu.id)::int AS total_votos,
          ROUND(
            AVG(
              ((vu.limpieza + vu.ruido + vu.puntualidad_pagos)::numeric / 3)
            ),
            2
          ) AS media_global
        FROM current_occupants co
        LEFT JOIN voto_usuario vu ON vu.votado_id = co.id
        GROUP BY co.id
      )
      SELECT
        co.id,
        co.nombre,
        co.foto_perfil_url,
        co.habitacion_id,
        co.fecha_entrada,
        os.total_votos,
        os.media_global
      FROM current_occupants co
      LEFT JOIN occupant_scores os ON os.usuario_id = co.id
      ORDER BY co.fecha_entrada ASC, co.id ASC
      `,
      [habitacion.piso_id]
    );

    return res.json({
      habitacion,
      fotos: fotosQ.rows,
      manager: {
        id: habitacion.manager_usuario_id,
        nombre: habitacion.manager_nombre,
        telefono: habitacion.manager_telefono,
        foto_perfil_url: habitacion.manager_foto_perfil_url,
      },
      convivencia_actual: convivenciaQ.rows[0] || {
        convivientes_actuales: 0,
        convivientes_con_votos: 0,
        media_global: null,
        media_limpieza: null,
        media_ruido: null,
        media_puntualidad_pagos: null,
      },
      ocupantes_actuales: ocupantesQ.rows,
    });
  } catch (error) {
    console.error("getHabitacionById error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// ---------------------------------------------------------
// GET /api/habitacion/:habitacionId/fotos (public)
// ---------------------------------------------------------
const listFotosHabitacion = async (req, res) => {
  try {
    const habitacionId = toInt(req.params.habitacionId, NaN);
    if (!Number.isFinite(habitacionId)) return badRequest(res, ["habitacionId"]);

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