// backend/controllers/votoUsuarioController.js
// Controllers PÚBLICOS de voto_usuario (reputación)

const pool = require("../db/pool");

function toInt(value, fallback = NaN) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

const badRequest = (res, details = []) =>
  res.status(400).json({ error: "VALIDATION_ERROR", details });

const notFound = (res) => res.status(404).json({ error: "NOT_FOUND" });

async function assertPublicUserExists(usuarioId) {
  const q = await pool.query(
    `
    SELECT id, nombre, apellidos, foto_perfil_url
    FROM usuario
    WHERE id = $1
      AND activo = true
    LIMIT 1
    `,
    [usuarioId]
  );

  if (q.rowCount === 0) return null;
  return q.rows[0];
}

// ---------------------------------------------------------
// GET /api/voto-usuario/usuario/:usuarioId/resumen (public)
// ---------------------------------------------------------
const getResumenVotosUsuario = async (req, res) => {
  try {
    const usuarioId = toInt(req.params.usuarioId, NaN);
    if (!Number.isFinite(usuarioId)) return badRequest(res, ["usuarioId"]);

    const usuario = await assertPublicUserExists(usuarioId);
    if (!usuario) return notFound(res);

    const q = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_votos,

        ROUND(AVG(vu.limpieza)::numeric, 2) AS media_limpieza,
        ROUND(AVG(vu.ruido)::numeric, 2) AS media_ruido,
        ROUND(AVG(vu.puntualidad_pagos)::numeric, 2) AS media_puntualidad_pagos,

        COUNT(*) FILTER (WHERE vu.limpieza = 1)::int AS limpieza_1,
        COUNT(*) FILTER (WHERE vu.limpieza = 2)::int AS limpieza_2,
        COUNT(*) FILTER (WHERE vu.limpieza = 3)::int AS limpieza_3,
        COUNT(*) FILTER (WHERE vu.limpieza = 4)::int AS limpieza_4,
        COUNT(*) FILTER (WHERE vu.limpieza = 5)::int AS limpieza_5,

        COUNT(*) FILTER (WHERE vu.ruido = 1)::int AS ruido_1,
        COUNT(*) FILTER (WHERE vu.ruido = 2)::int AS ruido_2,
        COUNT(*) FILTER (WHERE vu.ruido = 3)::int AS ruido_3,
        COUNT(*) FILTER (WHERE vu.ruido = 4)::int AS ruido_4,
        COUNT(*) FILTER (WHERE vu.ruido = 5)::int AS ruido_5,

        COUNT(*) FILTER (WHERE vu.puntualidad_pagos = 1)::int AS pagos_1,
        COUNT(*) FILTER (WHERE vu.puntualidad_pagos = 2)::int AS pagos_2,
        COUNT(*) FILTER (WHERE vu.puntualidad_pagos = 3)::int AS pagos_3,
        COUNT(*) FILTER (WHERE vu.puntualidad_pagos = 4)::int AS pagos_4,
        COUNT(*) FILTER (WHERE vu.puntualidad_pagos = 5)::int AS pagos_5
      FROM voto_usuario vu
      WHERE vu.votado_id = $1
      `,
      [usuarioId]
    );

    const row = q.rows[0];

    return res.json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        foto_perfil_url: usuario.foto_perfil_url,
      },
      resumen: {
        total_votos: row.total_votos,
        medias: {
          limpieza: row.media_limpieza !== null ? Number(row.media_limpieza) : null,
          ruido: row.media_ruido !== null ? Number(row.media_ruido) : null,
          puntualidad_pagos:
            row.media_puntualidad_pagos !== null
              ? Number(row.media_puntualidad_pagos)
              : null,
        },
        distribucion: {
          limpieza: {
            1: row.limpieza_1,
            2: row.limpieza_2,
            3: row.limpieza_3,
            4: row.limpieza_4,
            5: row.limpieza_5,
          },
          ruido: {
            1: row.ruido_1,
            2: row.ruido_2,
            3: row.ruido_3,
            4: row.ruido_4,
            5: row.ruido_5,
          },
          puntualidad_pagos: {
            1: row.pagos_1,
            2: row.pagos_2,
            3: row.pagos_3,
            4: row.pagos_4,
            5: row.pagos_5,
          },
        },
      },
    });
  } catch (error) {
    console.error("getResumenVotosUsuario error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// ---------------------------------------------------------
// GET /api/voto-usuario/usuario/:usuarioId/recibidos (public)
// Query params: page, limit, sort=newest|oldest, pisoId(optional)
// ---------------------------------------------------------
const listVotosRecibidosUsuario = async (req, res) => {
  try {
    const usuarioId = toInt(req.params.usuarioId, NaN);
    if (!Number.isFinite(usuarioId)) return badRequest(res, ["usuarioId"]);

    const usuario = await assertPublicUserExists(usuarioId);
    if (!usuario) return notFound(res);

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

    const where = ["vu.votado_id = $1"];
    const params = [usuarioId];
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

        u.nombre AS votante_nombre,
        u.apellidos AS votante_apellidos,
        u.foto_perfil_url AS votante_foto_perfil_url,

        p.ciudad,
        p.direccion,
        p.activo AS piso_activo,

        COUNT(*) OVER() AS total_count
      FROM voto_usuario vu
      JOIN usuario u ON u.id = vu.votante_id
      JOIN piso p ON p.id = vu.piso_id
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT $${i++} OFFSET $${i++}
    `;

    const q = await pool.query(sql, params);

    const total = q.rowCount ? Number(q.rows[0].total_count) : 0;
    const totalPages = total ? Math.ceil(total / limit) : 0;

    const items = q.rows.map(({ total_count, ...row }) => ({
      ...row,
      votante: {
        id: row.votante_id,
        nombre: row.votante_nombre,
        apellidos: row.votante_apellidos,
        foto_perfil_url: row.votante_foto_perfil_url,
      },
      piso: {
        id: row.piso_id,
        ciudad: row.ciudad,
        direccion: row.direccion,
        activo: row.piso_activo,
      },
    })).map((row) => {
      // limpiamos campos duplicados ya anidados
      const {
        votante_nombre,
        votante_apellidos,
        votante_foto_perfil_url,
        ciudad,
        direccion,
        piso_activo,
        ...clean
      } = row;
      return clean;
    });

    return res.json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        foto_perfil_url: usuario.foto_perfil_url,
      },
      page,
      limit,
      total,
      totalPages,
      items,
    });
  } catch (error) {
    console.error("listVotosRecibidosUsuario error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

module.exports = {
  getResumenVotosUsuario,
  listVotosRecibidosUsuario,
};
