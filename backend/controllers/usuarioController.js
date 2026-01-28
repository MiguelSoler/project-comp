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
  meEstancia
  // ...otros handlers que ya tengas
};
