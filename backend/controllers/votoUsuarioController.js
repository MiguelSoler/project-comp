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
    SELECT id, nombre, apellidos, rol, foto_perfil_url
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

async function canViewCurrentProfile(req, targetUserId) {
  const requesterId = Number(req.user?.id);
  const requesterRol = req.user?.rol;

  if (!Number.isFinite(requesterId)) return false;
  if (requesterRol === "admin") return true;
  if (requesterId === Number(targetUserId)) return true;

  const q = await pool.query(
    `
    SELECT 1
    FROM usuario_habitacion uh_requester
    JOIN habitacion h_requester ON h_requester.id = uh_requester.habitacion_id
    JOIN usuario_habitacion uh_target ON uh_target.usuario_id = $2
    JOIN habitacion h_target ON h_target.id = uh_target.habitacion_id
    WHERE uh_requester.usuario_id = $1
      AND uh_requester.fecha_salida IS NULL
      AND uh_requester.estado = 'active'
      AND uh_target.fecha_salida IS NULL
      AND uh_target.estado = 'active'
      AND h_requester.piso_id = h_target.piso_id
    LIMIT 1
    `,
    [requesterId, targetUserId]
  );

  return q.rowCount > 0;
}

// ---------------------------------------------------------
// GET /api/voto-usuario/usuario/:usuarioId/resumen
// Protegido:
// - self
// - conviviente actual del usuario
// - admin
// ---------------------------------------------------------
const getResumenVotosUsuario = async (req, res) => {
  try {
    const usuarioId = toInt(req.params.usuarioId, NaN);
    if (!Number.isFinite(usuarioId)) return badRequest(res, ["usuarioId"]);

    const usuario = await assertPublicUserExists(usuarioId);
    if (!usuario) return notFound(res);

    const allowed = await canViewCurrentProfile(req, usuarioId);
    if (!allowed) {
      return res.status(403).json({ error: "FORBIDDEN_CURRENT_PROFILE" });
    }

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
        rol: usuario.rol,
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
// GET /api/voto-usuario/usuario/:usuarioId/recibidos
// Protegido:
// - self
// - conviviente actual del usuario
// - admin
//
// Devuelve además can_view_profile para cada votante
// ---------------------------------------------------------
const listVotosRecibidosUsuario = async (req, res) => {
  try {
    const requesterId = Number(req.user?.id);
    if (!Number.isFinite(requesterId)) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const usuarioId = toInt(req.params.usuarioId, NaN);
    if (!Number.isFinite(usuarioId)) return badRequest(res, ["usuarioId"]);

    const usuario = await assertPublicUserExists(usuarioId);
    if (!usuario) return notFound(res);

    const allowed = await canViewCurrentProfile(req, usuarioId);
    if (!allowed) {
      return res.status(403).json({ error: "FORBIDDEN_CURRENT_PROFILE" });
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

    const where = ["vu.votado_id = $1"];
    const params = [usuarioId, requesterId];
    let i = 3;

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

        convivencia.fecha_inicio AS convivencia_fecha_inicio,
        convivencia.fecha_fin AS convivencia_fecha_fin,

        EXISTS (
          SELECT 1
          FROM usuario_habitacion uh_target_current
          JOIN habitacion h_target_current ON h_target_current.id = uh_target_current.habitacion_id
          JOIN usuario_habitacion uh_votante_current ON uh_votante_current.usuario_id = vu.votante_id
          JOIN habitacion h_votante_current ON h_votante_current.id = uh_votante_current.habitacion_id
          WHERE uh_target_current.usuario_id = vu.votado_id
            AND uh_target_current.fecha_salida IS NULL
            AND uh_target_current.estado = 'active'
            AND uh_votante_current.fecha_salida IS NULL
            AND uh_votante_current.estado = 'active'
            AND h_target_current.piso_id = vu.piso_id
            AND h_votante_current.piso_id = vu.piso_id
        ) AS is_current_cohabitant,

        EXISTS (
          SELECT 1
          FROM usuario_habitacion uh_requester
          JOIN habitacion h_requester ON h_requester.id = uh_requester.habitacion_id
          JOIN usuario_habitacion uh_votante ON uh_votante.usuario_id = vu.votante_id
          JOIN habitacion h_votante ON h_votante.id = uh_votante.habitacion_id
          WHERE uh_requester.usuario_id = $2
            AND uh_requester.fecha_salida IS NULL
            AND uh_requester.estado = 'active'
            AND uh_votante.fecha_salida IS NULL
            AND uh_votante.estado = 'active'
            AND h_requester.piso_id = h_votante.piso_id
        ) AS can_view_profile,

        COUNT(*) OVER() AS total_count
      FROM voto_usuario vu
      JOIN usuario u ON u.id = vu.votante_id
      JOIN piso p ON p.id = vu.piso_id
      LEFT JOIN LATERAL (
        SELECT
          GREATEST(uh_votante.fecha_entrada, uh_votado.fecha_entrada) AS fecha_inicio,
          CASE
            WHEN uh_votante.fecha_salida IS NULL AND uh_votado.fecha_salida IS NULL THEN NULL
            WHEN uh_votante.fecha_salida IS NULL THEN uh_votado.fecha_salida
            WHEN uh_votado.fecha_salida IS NULL THEN uh_votante.fecha_salida
            ELSE LEAST(uh_votante.fecha_salida, uh_votado.fecha_salida)
          END AS fecha_fin
        FROM usuario_habitacion uh_votante
        JOIN habitacion h_votante ON h_votante.id = uh_votante.habitacion_id
        JOIN usuario_habitacion uh_votado ON uh_votado.usuario_id = vu.votado_id
        JOIN habitacion h_votado ON h_votado.id = uh_votado.habitacion_id
        WHERE uh_votante.usuario_id = vu.votante_id
          AND h_votante.piso_id = vu.piso_id
          AND h_votado.piso_id = vu.piso_id
          AND uh_votante.fecha_entrada <= COALESCE(uh_votado.fecha_salida, 'infinity'::timestamptz)
          AND uh_votado.fecha_entrada <= COALESCE(uh_votante.fecha_salida, 'infinity'::timestamptz)
        ORDER BY GREATEST(uh_votante.fecha_entrada, uh_votado.fecha_entrada) DESC
        LIMIT 1
      ) convivencia ON true
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
        can_view_profile: Boolean(row.can_view_profile),
        is_current_cohabitant: Boolean(row.is_current_cohabitant),
        convivencia_fecha_inicio: row.convivencia_fecha_inicio,
        convivencia_fecha_fin: row.convivencia_fecha_fin,
        fecha_inicio_convivencia: row.convivencia_fecha_inicio,
        fecha_fin_convivencia: row.convivencia_fecha_fin,
        convivencia: {
          fecha_inicio: row.convivencia_fecha_inicio,
          fecha_fin: row.convivencia_fecha_fin,
        },
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
      }))
      .map((row) => {
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
