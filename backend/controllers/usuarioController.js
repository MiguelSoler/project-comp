const pool = require("../db/pool");

const sanitizeUser = (row) => ({
  id: row.id,
  nombre: row.nombre,
  email: row.email,
  rol: row.rol,
  telefono: row.telefono,
  foto_perfil_url: row.foto_perfil_url,
  activo: row.activo,
  fecha_registro: row.fecha_registro,
});

// GET /api/usuario/me
const me = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, nombre, email, rol, telefono, foto_perfil_url, activo, fecha_registro
       FROM usuario
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    return res.status(200).json({ user: sanitizeUser(result.rows[0]) });
  } catch (error) {
    console.error("Me error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// PATCH /api/usuario/me
const patchMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const nombre = typeof req.body?.nombre === "string" ? req.body.nombre.trim() : undefined;
    const telefono = typeof req.body?.telefono === "string" ? req.body.telefono.trim() : undefined;
    const fotoPerfilUrl = typeof req.body?.foto_perfil_url === "string" ? req.body.foto_perfil_url.trim() : undefined;

    const setClauses = [];
    const values = [];
    let i = 1;

    if (nombre !== undefined) {
      if (!nombre) {
        return res.status(400).json({ error: "VALIDATION_ERROR", details: ["nombre"] });
      }
      setClauses.push(`nombre = $${i++}`);
      values.push(nombre);
    }

    if (telefono !== undefined) {
      // permitimos string vacío -> lo convertimos a NULL
      const telValue = telefono === "" ? null : telefono;
      setClauses.push(`telefono = $${i++}`);
      values.push(telValue);
    }

    if (fotoPerfilUrl !== undefined) {
      const urlValue = fotoPerfilUrl === "" ? null : fotoPerfilUrl;
      setClauses.push(`foto_perfil_url = $${i++}`);
      values.push(urlValue);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "NO_FIELDS_TO_UPDATE" });
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE usuario
       SET ${setClauses.join(", ")}
       WHERE id = $${i}
       RETURNING id, nombre, email, rol, telefono, foto_perfil_url, activo, fecha_registro`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    return res.status(200).json({ user: sanitizeUser(result.rows[0]) });
  } catch (error) {
    console.error("Patch me error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// DELETE /api/usuario/me  (soft delete => activo=false)
const deleteMe = async (req, res) => {
  try {
    const userId = req.user.id;

    // Idempotente: si ya estaba inactivo, no pasa nada (204 igual)
    const result = await pool.query(
      `UPDATE usuario
       SET activo = false
       WHERE id = $1 AND activo = true
       RETURNING id`,
      [userId]
    );

    if (result.rows.length > 0) {
      return res.status(204).send();
    }

    // Si no actualizó nada, puede ser porque ya estaba inactivo o porque no existe
    const exists = await pool.query(`SELECT id FROM usuario WHERE id = $1 LIMIT 1`, [userId]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Delete me error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// GET /api/usuario/me/estancia
const meEstancia = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
         uh.fecha_entrada,
         h.id AS habitacion_id,
         h.titulo AS habitacion_titulo,
         h.precio_mensual AS habitacion_precio_mensual,
         h.disponible AS habitacion_disponible,
         h.tamano_m2 AS habitacion_tamano_m2,
         h.amueblada AS habitacion_amueblada,
         p.id AS piso_id,
         p.direccion AS piso_direccion,
         p.ciudad AS piso_ciudad,
         p.codigo_postal AS piso_codigo_postal,
         p.activo AS piso_activo
       FROM usuario_habitacion uh
       JOIN habitacion h ON h.id = uh.habitacion_id
       JOIN piso p ON p.id = h.piso_id
       WHERE uh.usuario_id = $1
         AND uh.fecha_salida IS NULL
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ estancia: null });
    }

    const row = result.rows[0];

    return res.status(200).json({
      estancia: {
        fecha_entrada: row.fecha_entrada,
        habitacion: {
          id: row.habitacion_id,
          titulo: row.habitacion_titulo,
          precio_mensual: row.habitacion_precio_mensual,
          disponible: row.habitacion_disponible,
          tamano_m2: row.habitacion_tamano_m2,
          amueblada: row.habitacion_amueblada,
        },
        piso: {
          id: row.piso_id,
          direccion: row.piso_direccion,
          ciudad: row.piso_ciudad,
          codigo_postal: row.piso_codigo_postal,
          activo: row.piso_activo,
        },
      },
    });
  } catch (error) {
    console.error("Me estancia error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};


module.exports = {
  me,
  meEstancia,
  patchMe,
  deleteMe
};
