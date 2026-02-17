// backend/controllers/usuarioHabitacionController.js

const pool = require("../db/pool");

function toInt(value, fallback = NaN) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function normEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isAdmin(req) {
  return req.user?.rol === "admin";
}

function isAdvertiser(req) {
  return req.user?.rol === "advertiser";
}

async function getUserByIdOrEmail(client, { usuarioId, email }) {
  if (Number.isFinite(usuarioId)) {
    const q = await client.query(
      `SELECT id, rol, activo FROM usuario WHERE id = $1`,
      [usuarioId]
    );
    return q.rows[0] || null;
  }

  if (email) {
    const q = await client.query(
      `SELECT id, rol, activo FROM usuario WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    return q.rows[0] || null;
  }

  return null;
}

/**
 * POST /api/usuario-habitacion/join
 * (MVP) El manager/admin da de alta a un usuario en una habitación (sin invitaciones).
 *
 * body: { habitacionId, usuarioId }  o  { habitacionId, email }
 *
 * Reglas:
 * - Solo admin o advertiser (manager del piso) puede dar de alta.
 * - El usuario debe existir y estar activo.
 * - El usuario no puede tener estancia activa.
 * - La habitación no puede estar ocupada.
 * - Se inserta usuario_habitacion como active y la habitación pasa a no disponible.
 */
async function joinHabitacion(req, res) {
  const requesterId = req.user?.id;
  const habitacionId = toInt(req.body?.habitacionId);

  const usuarioId = req.body?.usuarioId !== undefined ? toInt(req.body.usuarioId) : NaN;
  const email = req.body?.email ? normEmail(req.body.email) : "";

  if (!Number.isFinite(habitacionId)) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: ["habitacionId"] });
  }
  if (!Number.isFinite(usuarioId) && !email) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: ["usuarioId|email"] });
  }

  // Solo admin o advertiser
  if (!isAdmin(req) && !isAdvertiser(req)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Habitación + piso (y validar ownership si advertiser)
    const roomQ = await client.query(
      `SELECT
         h.id AS habitacion_id,
         h.piso_id,
         h.disponible,
         h.activo AS habitacion_activo,
         p.activo AS piso_activo,
         p.manager_usuario_id
       FROM habitacion h
       JOIN piso p ON p.id = h.piso_id
       WHERE h.id = $1`,
      [habitacionId]
    );

    if (roomQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "HABITACION_NOT_FOUND" });
    }

    const room = roomQ.rows[0];

    if (!room.piso_activo) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "PISO_INACTIVE" });
    }
    if (!room.habitacion_activo) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "HABITACION_INACTIVE" });
    }

    if (isAdvertiser(req) && room.manager_usuario_id !== requesterId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "FORBIDDEN_NOT_OWNER" });
    }

    // 2) Usuario objetivo debe existir y estar activo
    const targetUser = await getUserByIdOrEmail(client, {
      usuarioId: Number.isFinite(usuarioId) ? usuarioId : NaN,
      email: email || "",
    });

    if (!targetUser) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    if (!targetUser.activo) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "USER_INACTIVE" });
    }

    // Si quieres impedir que advertiser/admin "convivan", activa esto:
    if (targetUser.rol !== "user") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "ROLE_NOT_ALLOWED_FOR_STAY" });
    }

    // 3) Usuario no puede tener estancia activa
    const activeStayQ = await client.query(
      `SELECT id
       FROM usuario_habitacion
       WHERE usuario_id = $1 AND fecha_salida IS NULL
       LIMIT 1`,
      [targetUser.id]
    );
    if (activeStayQ.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "USER_ALREADY_HAS_ACTIVE_STAY" });
    }

    // 4) La habitación no puede estar ocupada (estancia activa)
    const roomOccupiedQ = await client.query(
      `SELECT id
       FROM usuario_habitacion
       WHERE habitacion_id = $1 AND fecha_salida IS NULL
       LIMIT 1`,
      [habitacionId]
    );
    if (roomOccupiedQ.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "ROOM_ALREADY_OCCUPIED" });
    }

    // 5) Insertar estancia activa
    const insQ = await client.query(
      `INSERT INTO usuario_habitacion (usuario_id, habitacion_id, fecha_entrada, fecha_salida, estado)
       VALUES ($1, $2, CURRENT_TIMESTAMP, NULL, 'active')
       RETURNING id, usuario_id, habitacion_id, fecha_entrada, fecha_salida, estado, created_at, updated_at`,
      [targetUser.id, habitacionId]
    );

    // 6) Marcar habitación como no disponible (bloqueo de anuncio)
    await client.query(`UPDATE habitacion SET disponible = false WHERE id = $1`, [habitacionId]);

    await client.query("COMMIT");

    return res.status(201).json({
      stay: insQ.rows[0],
      piso_id: room.piso_id,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    // Conflictos por índices únicos (usuario o habitación con estancia activa)
    if (error.code === "23505") {
      return res.status(409).json({ error: "CONFLICT_ACTIVE_STAY_OR_OCCUPANCY" });
    }

    console.error("joinHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/usuario-habitacion/leave
 * El usuario cierra su estancia activa.
 */
async function leaveHabitacion(req, res) {
  const userId = req.user?.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updQ = await client.query(
      `UPDATE usuario_habitacion
       SET fecha_salida = CURRENT_TIMESTAMP,
           estado = 'left'
       WHERE usuario_id = $1 AND fecha_salida IS NULL
       RETURNING id, usuario_id, habitacion_id, fecha_entrada, fecha_salida, estado`,
      [userId]
    );

    if (updQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "NO_ACTIVE_STAY" });
    }

    const habitacionId = updQ.rows[0].habitacion_id;

    // Liberar anuncio (para MVP: vuelve a disponible automáticamente)
    await client.query(`UPDATE habitacion SET disponible = true WHERE id = $1`, [habitacionId]);

    await client.query("COMMIT");
    return res.status(200).json({ stay: updQ.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("leaveHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/usuario-habitacion/kick/:usuarioHabitacionId
 * Admin o manager del piso puede expulsar (cierra estancia activa).
 */
async function kickFromHabitacion(req, res) {
  const requesterId = req.user?.id;
  const requesterRol = req.user?.rol;
  const usuarioHabitacionId = toInt(req.params.usuarioHabitacionId);

  if (!Number.isFinite(usuarioHabitacionId)) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: ["usuarioHabitacionId"] });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const q = await client.query(
      `SELECT
         uh.id,
         uh.usuario_id,
         uh.habitacion_id,
         uh.fecha_salida,
         h.piso_id,
         p.manager_usuario_id
       FROM usuario_habitacion uh
       JOIN habitacion h ON h.id = uh.habitacion_id
       JOIN piso p ON p.id = h.piso_id
       WHERE uh.id = $1`,
      [usuarioHabitacionId]
    );

    if (q.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "STAY_NOT_FOUND" });
    }

    const row = q.rows[0];

    if (row.fecha_salida !== null) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "STAY_ALREADY_CLOSED" });
    }

    const allowed =
      requesterRol === "admin" || (requesterRol === "advertiser" && row.manager_usuario_id === requesterId);

    if (!allowed) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const upd = await client.query(
      `UPDATE usuario_habitacion
       SET fecha_salida = CURRENT_TIMESTAMP,
           estado = 'kicked'
       WHERE id = $1 AND fecha_salida IS NULL
       RETURNING id, usuario_id, habitacion_id, fecha_entrada, fecha_salida, estado`,
      [usuarioHabitacionId]
    );

    // Liberar anuncio
    await client.query(`UPDATE habitacion SET disponible = true WHERE id = $1`, [row.habitacion_id]);

    await client.query("COMMIT");
    return res.status(200).json({ stay: upd.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("kickFromHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
}

/**
 * GET /api/usuario-habitacion/my
 * Devuelve la estancia activa del usuario (o null si no tiene).
 */
async function getMyStay(req, res) {
  const userId = req.user?.id;

  try {
    const q = await pool.query(
      `SELECT
         uh.id, uh.usuario_id, uh.habitacion_id, uh.fecha_entrada, uh.fecha_salida, uh.estado,
         h.titulo AS habitacion_titulo, h.piso_id,
         p.ciudad, p.direccion
       FROM usuario_habitacion uh
       JOIN habitacion h ON h.id = uh.habitacion_id
       JOIN piso p ON p.id = h.piso_id
       WHERE uh.usuario_id = $1 AND uh.fecha_salida IS NULL
       LIMIT 1`,
      [userId]
    );

    return res.status(200).json({ stay: q.rows[0] || null });
  } catch (error) {
    console.error("getMyStay error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}

/**
 * GET /api/usuario-habitacion/piso/:pisoId/convivientes
 * Lista convivientes actuales de un piso.
 *
 * Permisos (MVP seguro):
 * - admin: OK
 * - advertiser: solo si es manager del piso
 * - user: solo si tiene estancia activa en ese piso
 */
async function getConvivientesByPiso(req, res) {
  const pisoId = toInt(req.params.pisoId);
  if (!Number.isFinite(pisoId)) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: ["pisoId"] });
  }

  try {
    // 1) Piso existe + manager
    const pisoQ = await pool.query(
      `SELECT id, manager_usuario_id, activo
       FROM piso
       WHERE id = $1`,
      [pisoId]
    );

    if (pisoQ.rowCount === 0) {
      return res.status(404).json({ error: "PISO_NOT_FOUND" });
    }

    const piso = pisoQ.rows[0];

    if (!piso.activo) {
      return res.status(409).json({ error: "PISO_INACTIVE" });
    }

    // 2) Permisos
    if (isAdmin(req)) {
      // ok
    } else if (isAdvertiser(req)) {
      if (piso.manager_usuario_id !== req.user.id) {
        return res.status(403).json({ error: "FORBIDDEN_NOT_OWNER" });
      }
    } else {
      // user normal: debe convivir en ese piso
      const memberQ = await pool.query(
        `SELECT 1
         FROM usuario_habitacion uh
         JOIN habitacion h ON h.id = uh.habitacion_id
         WHERE uh.usuario_id = $1
           AND uh.fecha_salida IS NULL
           AND uh.estado = 'active'
           AND h.piso_id = $2
         LIMIT 1`,
        [req.user.id, pisoId]
      );

      if (memberQ.rowCount === 0) {
        return res.status(403).json({ error: "FORBIDDEN_NOT_ROOMMATE" });
      }
    }

    // 3) Convivientes actuales del piso
    const q = await pool.query(
      `SELECT
         u.id, u.nombre, u.apellidos, u.foto_perfil_url,
         uh.habitacion_id, uh.fecha_entrada
       FROM usuario_habitacion uh
       JOIN habitacion h ON h.id = uh.habitacion_id
       JOIN usuario u ON u.id = uh.usuario_id
       WHERE h.piso_id = $1
         AND uh.fecha_salida IS NULL
         AND uh.estado = 'active'
         AND u.activo = true
       ORDER BY uh.fecha_entrada ASC`,
      [pisoId]
    );

    return res.status(200).json({ convivientes: q.rows });
  } catch (error) {
    console.error("getConvivientesByPiso error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}

module.exports = {
  joinHabitacion,
  leaveHabitacion,
  kickFromHabitacion,
  getMyStay,
  getConvivientesByPiso,
};
