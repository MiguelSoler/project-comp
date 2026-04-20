// backend/controllers/votoUsuarioAuthController.js
// Controllers PRIVADOS de voto_usuario (usuario autenticado)

const pool = require("../db/pool");

function toInt(value, fallback = NaN) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

const badRequest = (res, details = []) =>
  res.status(400).json({ error: "VALIDATION_ERROR", details });

const notFound = (res) => res.status(404).json({ error: "NOT_FOUND" });

async function getPublicUserById(client, usuarioId) {
  const q = await client.query(
    `
    SELECT id, nombre, apellidos, foto_perfil_url, activo
    FROM usuario
    WHERE id = $1
    LIMIT 1
    `,
    [usuarioId]
  );
  return q.rowCount ? q.rows[0] : null;
}

async function getPisoById(client, pisoId) {
  const q = await client.query(
    `
    SELECT id, activo
    FROM piso
    WHERE id = $1
    LIMIT 1
    `,
    [pisoId]
  );
  return q.rowCount ? q.rows[0] : null;
}

/**
 * Comprueba si votante y votado conviven AHORA MISMO
 * en el mismo piso indicado.
 *
 * Reglas:
 * - ambos deben tener estancia activa
 * - ambos deben estar activos en habitaciones de ese piso
 *
 * Esto bloquea la edición de votos históricos.
 */
async function hasCurrentCohabitationInPiso(client, { pisoId, votanteId, votadoId }) {
  const q = await client.query(
    `
    SELECT 1
    FROM usuario_habitacion uh_votante
    JOIN habitacion h_votante ON h_votante.id = uh_votante.habitacion_id
    JOIN usuario_habitacion uh_votado ON uh_votado.usuario_id = $2
    JOIN habitacion h_votado ON h_votado.id = uh_votado.habitacion_id
    WHERE uh_votante.usuario_id = $1
      AND uh_votante.fecha_salida IS NULL
      AND uh_votante.estado = 'active'
      AND uh_votado.fecha_salida IS NULL
      AND uh_votado.estado = 'active'
      AND h_votante.piso_id = $3
      AND h_votado.piso_id = $3
    LIMIT 1
    `,
    [votanteId, votadoId, pisoId]
  );

  return q.rowCount > 0;
}

// ---------------------------------------------------------
// POST /api/voto-usuario (private)
// Body: { piso_id, votado_id, limpieza, ruido, puntualidad_pagos }
// Upsert por (piso_id, votante_id, votado_id)
//
// Regla importante:
// - SOLO se puede crear/editar si la convivencia es ACTUAL
//   en ese piso. Los votos históricos se siguen viendo,
//   pero ya no se pueden editar.
// ---------------------------------------------------------
const upsertVotoUsuario = async (req, res) => {
  const votanteId = req.user?.id;

  const piso_id = toInt(req.body?.piso_id, NaN);
  const votado_id = toInt(req.body?.votado_id, NaN);
  const limpieza = toInt(req.body?.limpieza, NaN);
  const ruido = toInt(req.body?.ruido, NaN);
  const puntualidad_pagos = toInt(req.body?.puntualidad_pagos, NaN);

  const invalid = [];
  if (!Number.isFinite(piso_id)) invalid.push("piso_id");
  if (!Number.isFinite(votado_id)) invalid.push("votado_id");
  if (!Number.isFinite(limpieza) || limpieza < 1 || limpieza > 5) invalid.push("limpieza");
  if (!Number.isFinite(ruido) || ruido < 1 || ruido > 5) invalid.push("ruido");
  if (
    !Number.isFinite(puntualidad_pagos) ||
    puntualidad_pagos < 1 ||
    puntualidad_pagos > 5
  ) {
    invalid.push("puntualidad_pagos");
  }

  if (invalid.length) return badRequest(res, invalid);

  if (Number(votanteId) === Number(votado_id)) {
    return res.status(400).json({ error: "SELF_VOTE_NOT_ALLOWED" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Validaciones de existencia legibles
    const piso = await getPisoById(client, piso_id);
    if (!piso) {
      await client.query("ROLLBACK");
      return notFound(res);
    }

    if (!piso.activo) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "PISO_INACTIVE" });
    }

    const votado = await getPublicUserById(client, votado_id);
    if (!votado || !votado.activo) {
      await client.query("ROLLBACK");
      return notFound(res);
    }

    // Regla crítica:
    // solo se puede votar/editar si ambos conviven ACTUALMENTE
    // en el piso indicado.
    const hasCurrentCohabitation = await hasCurrentCohabitationInPiso(client, {
      pisoId: piso_id,
      votanteId,
      votadoId: votado_id,
    });

    if (!hasCurrentCohabitation) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "VOTE_CLOSED_NO_CURRENT_COHABITATION" });
    }

    // UPSERT atómico
    const q = await client.query(
      `
      INSERT INTO voto_usuario (
        piso_id,
        votante_id,
        votado_id,
        limpieza,
        ruido,
        puntualidad_pagos
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (piso_id, votante_id, votado_id)
      DO UPDATE SET
        limpieza = EXCLUDED.limpieza,
        ruido = EXCLUDED.ruido,
        puntualidad_pagos = EXCLUDED.puntualidad_pagos,
        num_cambios = voto_usuario.num_cambios + 1
      RETURNING *
      `,
      [piso_id, votanteId, votado_id, limpieza, ruido, puntualidad_pagos]
    );

    const voto = q.rows[0];

    await client.query("COMMIT");

    const created = Number(voto.num_cambios) === 0;

    return res.status(created ? 201 : 200).json({
      action: created ? "created" : "updated",
      voto,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    // Trigger antiguo de convivencia histórica
    if (
      error?.code === "P0001" &&
      typeof error.message === "string" &&
      error.message.toLowerCase().includes("no se puede votar")
    ) {
      return res.status(409).json({ error: "NO_COHABITATION" });
    }

    if (error?.code === "23503") {
      return notFound(res);
    }

    if (error?.code === "23514") {
      return res.status(400).json({ error: "VALIDATION_ERROR" });
    }

    console.error("upsertVotoUsuario error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

// ---------------------------------------------------------
// GET /api/voto-usuario/mis-votos (private)
// Query params: page, limit, sort=newest|oldest, pisoId(optional)
//
// Devuelve además:
// - can_edit: true solo si siguen conviviendo actualmente
//   en el mismo piso del voto
// ---------------------------------------------------------
const listMisVotosEmitidos = async (req, res) => {
  try {
    const votanteId = Number(req.user?.id);
    if (!Number.isFinite(votanteId)) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 10)));
    const offset = (page - 1) * limit;

    const pisoId =
      req.query.pisoId !== undefined ? toInt(req.query.pisoId, NaN) : undefined;
    if (req.query.pisoId !== undefined && !Number.isFinite(pisoId)) {
      return badRequest(res, ["pisoId"]);
    }

    const sort = String(req.query.sort || "newest");
    const orderBy =
      sort === "oldest"
        ? "vu.created_at ASC, vu.id ASC"
        : "vu.created_at DESC, vu.id DESC";

    const where = ["vu.votante_id = $1"];
    const params = [votanteId];
    let i = 2;

    if (Number.isFinite(pisoId)) {
      where.push(`vu.piso_id = $${i++}`);
      params.push(pisoId);
    }

    params.push(limit);
    params.push(offset);

    const sql = `
      SELECT
        vu.id,
        vu.piso_id,
        vu.votante_id,
        vu.votado_id,
        vu.limpieza,
        vu.ruido,
        vu.puntualidad_pagos,
        vu.num_cambios,
        vu.created_at,
        vu.updated_at,

        u.id AS votado_id_ref,
        u.nombre AS votado_nombre,
        u.apellidos AS votado_apellidos,
        u.foto_perfil_url AS votado_foto_perfil_url,
        u.activo AS votado_activo,

        p.ciudad,
        p.direccion,
        p.activo AS piso_activo,

        EXISTS (
          SELECT 1
          FROM usuario_habitacion uh_votante
          JOIN habitacion h_votante ON h_votante.id = uh_votante.habitacion_id
          JOIN usuario_habitacion uh_votado ON uh_votado.usuario_id = vu.votado_id
          JOIN habitacion h_votado ON h_votado.id = uh_votado.habitacion_id
          WHERE uh_votante.usuario_id = vu.votante_id
            AND uh_votante.fecha_salida IS NULL
            AND uh_votante.estado = 'active'
            AND uh_votado.fecha_salida IS NULL
            AND uh_votado.estado = 'active'
            AND h_votante.piso_id = vu.piso_id
            AND h_votado.piso_id = vu.piso_id
        ) AS can_edit,

        EXISTS (
          SELECT 1
          FROM usuario_habitacion uh_votante_current
          JOIN habitacion h_votante_current ON h_votante_current.id = uh_votante_current.habitacion_id
          JOIN usuario_habitacion uh_votado_current ON uh_votado_current.usuario_id = vu.votado_id
          JOIN habitacion h_votado_current ON h_votado_current.id = uh_votado_current.habitacion_id
          WHERE uh_votante_current.usuario_id = vu.votante_id
            AND uh_votante_current.fecha_salida IS NULL
            AND uh_votante_current.estado = 'active'
            AND uh_votado_current.fecha_salida IS NULL
            AND uh_votado_current.estado = 'active'
            AND h_votante_current.piso_id = h_votado_current.piso_id
        ) AS can_view_profile,

        COUNT(*) OVER() AS total_count
      FROM voto_usuario vu
      JOIN usuario u ON u.id = vu.votado_id
      JOIN piso p ON p.id = vu.piso_id
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT $${i++} OFFSET $${i++}
    `;

    const q = await pool.query(sql, params);

    const total = q.rowCount ? Number(q.rows[0].total_count) : 0;
    const totalPages = total ? Math.ceil(total / limit) : 0;

    const items = q.rows
      .map(({ total_count, ...row }) => ({
        ...row,
        can_edit: Boolean(row.can_edit),
        can_view_profile: Boolean(row.can_view_profile),
        votado: {
          id: row.votado_id_ref,
          nombre: row.votado_nombre,
          apellidos: row.votado_apellidos,
          foto_perfil_url: row.votado_foto_perfil_url,
          activo: row.votado_activo,
        },
        piso: {
          id: row.piso_id,
          ciudad: row.ciudad,
          direccion: row.direccion,
          activo: row.piso_activo,
        },
      }))
      .map((row) => {
        const {
          votado_id_ref,
          votado_nombre,
          votado_apellidos,
          votado_foto_perfil_url,
          votado_activo,
          ciudad,
          direccion,
          piso_activo,
          ...clean
        } = row;
        return clean;
      });

    return res.json({
      usuario: { id: votanteId },
      page,
      limit,
      total,
      totalPages,
      items,
    });
  } catch (error) {
    console.error("listMisVotosEmitidos error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

module.exports = {
  upsertVotoUsuario,
  listMisVotosEmitidos,
};