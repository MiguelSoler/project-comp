const pool = require("../db/pool");

function toInt(value, fallback = NaN) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * POST /api/usuario-habitacion/join
 * body: { habitacionId }
 */
const joinHabitacion = async (req, res) => {
  const userId = req.user?.id;
  const habitacionId = toInt(req.body?.habitacionId);

  if (!Number.isFinite(habitacionId)) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: ["habitacionId"] });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) La habitación debe existir y estar activa y disponible
    const roomQ = await client.query(
      `SELECT id, piso_id, disponible, activo
       FROM habitacion
       WHERE id = $1`,
      [habitacionId]
    );
    if (roomQ.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "HABITACION_NOT_FOUND" });
    }
    const room = roomQ.rows[0];
    if (!room.activo) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "HABITACION_INACTIVE" });
    }
    if (!room.disponible) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "HABITACION_NOT_AVAILABLE" });
    }

    // 2) El usuario no puede tener estancia activa
    const activeStay = await client.query(
      `SELECT id FROM usuario_habitacion
       WHERE usuario_id = $1 AND fecha_salida IS NULL
       LIMIT 1`,
      [userId]
    );
    if (activeStay.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "USER_ALREADY_HAS_ACTIVE_STAY" });
    }

    // 3) La habitación no puede estar ocupada (el índice único parcial ya lo protege, pero mejor error limpio)
    const roomOccupied = await client.query(
      `SELECT id FROM usuario_habitacion
       WHERE habitacion_id = $1 AND fecha_salida IS NULL
       LIMIT 1`,
      [habitacionId]
    );
    if (roomOccupied.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "ROOM_ALREADY_OCCUPIED" });
    }

    // 4) Crear estancia activa (estado active + fecha_salida NULL)
    const ins = await client.query(
      `INSERT INTO usuario_habitacion (usuario_id, habitacion_id, fecha_entrada, fecha_salida, estado)
       VALUES ($1, $2, CURRENT_TIMESTAMP, NULL, 'active')
       RETURNING id, usuario_id, habitacion_id, fecha_entrada, fecha_salida, estado, created_at, updated_at`,
      [userId, habitacionId]
    );

    // 5) Opcional: marcar habitación como no disponible al ocupar (consistencia UX)
    await client.query(
      `UPDATE habitacion SET disponible = false WHERE id = $1`,
      [habitacionId]
    );

    await client.query("COMMIT");
    return res.status(201).json({ stay: ins.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");

    // Violación del índice único parcial (usuario o habitación)
    if (error.code === "23505") {
      return res.status(409).json({ error: "CONFLICT_ACTIVE_STAY_OR_OCCUPANCY" });
    }

    console.error("joinHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/usuario-habitacion/leave
 * body: { }  (sale de su estancia activa)
 */
const leaveHabitacion = async (req, res) => {
  const userId = req.user?.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Cerrar estancia activa del usuario
    const upd = await client.query(
      `UPDATE usuario_habitacion
       SET fecha_salida = CURRENT_TIMESTAMP,
           estado = 'left'
       WHERE usuario_id = $1 AND fecha_salida IS NULL
       RETURNING id, habitacion_id, fecha_entrada, fecha_salida, estado`,
      [userId]
    );

    if (upd.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "NO_ACTIVE_STAY" });
    }

    const habitacionId = upd.rows[0].habitacion_id;

    // Liberar habitación (disponible = true)
    await client.query(
      `UPDATE habitacion SET disponible = true WHERE id = $1`,
      [habitacionId]
    );

    await client.query("COMMIT");
    return res.status(200).json({ stay: upd.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("leaveHabitacion error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/usuario-habitacion/kick/:usuarioHabitacionId
 * Permisos: admin OR manager del piso donde está esa estancia activa
 */
const kickFromHabitacion = async (req, res) => {
  const requesterId = req.user?.id;
  const requesterRol = req.user?.rol;
  const usuarioHabitacionId = toInt(req.params.usuarioHabitacionId);

  if (!Number.isFinite(usuarioHabitacionId)) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: ["usuarioHabitacionId"] });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Traer estancia + piso + manager
    const q = await client.query(
      `SELECT uh.id, uh.fecha_salida, uh.habitacion_id, h.piso_id, p.manager_usuario_id
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

    // Solo se puede expulsar si la estancia está activa
    if (row.fecha_salida !== null) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "STAY_ALREADY_CLOSED" });
    }

    // Permisos
    const isAdmin = requesterRol === "admin";
    const isManager = row.manager_usuario_id === requesterId;

    if (!isAdmin && !isManager) {
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

    // Liberar habitación
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
};

/**
 * GET /api/usuario-habitacion/my
 * Devuelve estancia activa con info de habitacion/piso
 */
const getMyStay = async (req, res) => {
  const userId = req.user?.id;

  try {
    const q = await pool.query(
      `SELECT uh.id, uh.usuario_id, uh.habitacion_id, uh.fecha_entrada, uh.fecha_salida, uh.estado,
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
};

/**
 * GET /api/usuario-habitacion/piso/:pisoId/convivientes
 * Lista convivientes actuales de un piso (para votar)
 */
const getConvivientesByPiso = async (req, res) => {
  const pisoId = toInt(req.params.pisoId);
  if (!Number.isFinite(pisoId)) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: ["pisoId"] });
  }

  try {
    const q = await pool.query(
      `SELECT u.id, u.nombre, u.apellidos, u.foto_perfil_url, uh.habitacion_id, uh.fecha_entrada
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
};

module.exports = {
  joinHabitacion,
  leaveHabitacion,
  kickFromHabitacion,
  getMyStay,
  getConvivientesByPiso
};