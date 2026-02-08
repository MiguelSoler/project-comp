const pool = require("../db/pool");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

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
const getMe = async (req, res) => {
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
const updateMe = async (req, res) => {
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

// PATCH /api/usuario/me/password
const changeMePassword = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;

    const currentPassword = req.body?.current_password || "";
    const newPassword = req.body?.new_password || "";

    const invalidFields = [];
    if (!currentPassword) invalidFields.push("current_password");
    if (!newPassword || newPassword.length < 8) invalidFields.push("new_password");

    if (invalidFields.length > 0) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: invalidFields });
    }

    await client.query("BEGIN");

    // Bloqueamos fila para evitar carreras y para actualizar token_version de forma segura
    const result = await client.query(
      `SELECT id, password_hash, activo, token_version
       FROM usuario
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    const user = result.rows[0];

    if (!user.activo) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "USER_INACTIVE" });
    }

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) {
      await client.query("ROLLBACK");
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    // Evitar cambiar a la misma contraseña
    const sameAsOld = await bcrypt.compare(newPassword, user.password_hash);
    if (sameAsOld) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "PASSWORD_SAME_AS_OLD" });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Subimos token_version => revoca TODOS los tokens antiguos
    const updated = await client.query(
      `UPDATE usuario
       SET password_hash = $1,
           token_version = token_version + 1
       WHERE id = $2
       RETURNING id, rol, token_version`,
      [newHash, userId]
    );

    await client.query("COMMIT");

    // Emitimos token nuevo para que el usuario siga logueado
    const refreshedUser = updated.rows[0];
    const getJwtSecret = () => process.env.JWT_SECRET;
    const secret = getJwtSecret();
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    if (!secret) {
      return res.status(500).json({ error: "INVALID_SERVER_CONFIG" });
    }

    const token = jwt.sign(
      { id: refreshedUser.id, rol: refreshedUser.rol, token_version: refreshedUser.token_version },
      secret,
      { expiresIn }
    );

    return res.status(200).json({ token });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("changeMyPassword error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
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
const getMeEstancia = async (req, res) => {
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
  getMe,
  getMeEstancia,
  updateMe,
  deleteMe,
  changeMePassword
};
