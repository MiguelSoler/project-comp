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

// ---------------------------------------------------------
// POST /api/voto-usuario (private)
// Body: { piso_id, votado_id, limpieza, ruido, puntualidad_pagos }
// Upsert por (piso_id, votante_id, votado_id)
// - INSERT => num_cambios = 0
// - UPDATE => num_cambios = num_cambios + 1
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

    // Validaciones de existencia legibles (evita depender solo de FK)
    const piso = await getPisoById(client, piso_id);
    if (!piso) {
      await client.query("ROLLBACK");
      return notFound(res);
    }

    const votado = await getPublicUserById(client, votado_id);
    if (!votado || !votado.activo) {
      await client.query("ROLLBACK");
      return notFound(res);
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

    // En insert num_cambios = 0; en update siempre >= 1
    const created = Number(voto.num_cambios) === 0;

    return res.status(created ? 201 : 200).json({
      action: created ? "created" : "updated",
      voto,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    // Trigger validar_convivencia_voto()
    if (
      error?.code === "P0001" &&
      typeof error.message === "string" &&
      error.message.toLowerCase().includes("no se puede votar")
    ) {
      return res.status(409).json({ error: "NO_COHABITATION" });
    }

    // FK o checks (fallback por si se nos escapa alguna validación)
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
