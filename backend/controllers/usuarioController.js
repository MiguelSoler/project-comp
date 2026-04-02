const fs = require("fs");
const path = require("path");
const pool = require("../db/pool");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

const sanitizeUser = (row) => ({
  id: row.id,
  nombre: row.nombre,
  apellidos: row.apellidos,
  email: row.email,
  rol: row.rol,
  telefono: row.telefono,
  foto_perfil_url: row.foto_perfil_url,
  activo: row.activo,
  fecha_registro: row.fecha_registro,
});

async function userHasActiveStay(client, userId) {
  const q = await client.query(
    `SELECT id
     FROM usuario_habitacion
     WHERE usuario_id = $1
       AND fecha_salida IS NULL
     LIMIT 1`,
    [userId]
  );

  return q.rowCount > 0;
}

async function userHasActivePisos(client, userId) {
  const q = await client.query(
    `SELECT id
     FROM piso
     WHERE manager_usuario_id = $1
       AND activo = true
     LIMIT 1`,
    [userId]
  );

  return q.rowCount > 0;
}

function deleteUploadedFileByUrl(url) {
  try {
    const cleanUrl = typeof url === "string" ? url.trim() : "";
    if (!cleanUrl || !cleanUrl.startsWith("/uploads/")) return;

    const absolutePath = path.resolve(
      __dirname,
      "..",
      "..",
      cleanUrl.replace(/^\/+/, "")
    );

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (error) {
    console.error("deleteUploadedFileByUrl error:", error);
  }
}

// GET /api/usuario/me
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, nombre, apellidos, email, rol, telefono, foto_perfil_url, activo, fecha_registro
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

// POST /api/usuario/convertirse-anunciante
const convertirmeEnAdvertiser = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;

    const direccion =
      typeof req.body?.direccion === "string" ? req.body.direccion.trim() : "";
    const ciudad =
      typeof req.body?.ciudad === "string" ? req.body.ciudad.trim() : "";
    const codigoPostal =
      typeof req.body?.codigo_postal === "string"
        ? req.body.codigo_postal.trim()
        : "";
    const descripcion =
      typeof req.body?.descripcion === "string"
        ? req.body.descripcion.trim()
        : "";

    const invalidFields = [];
    if (!direccion) invalidFields.push("direccion");
    if (!ciudad) invalidFields.push("ciudad");

    if (invalidFields.length > 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: invalidFields,
      });
    }

    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT
         id,
         nombre,
         apellidos,
         email,
         rol,
         telefono,
         foto_perfil_url,
         activo,
         token_version,
         fecha_registro
       FROM usuario
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    const user = userResult.rows[0];

    if (!user.activo) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "USER_INACTIVE" });
    }

    if (user.rol !== "user") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "ROLE_ALREADY_UPGRADED" });
    }

    const hasActiveStay = await userHasActiveStay(client, userId);
    if (hasActiveStay) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "USER_HAS_ACTIVE_STAY" });
    }

    const pisoResult = await client.query(
      `INSERT INTO piso (
         direccion,
         ciudad,
         codigo_postal,
         descripcion,
         manager_usuario_id,
         activo
       )
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING
         id,
         direccion,
         ciudad,
         codigo_postal,
         descripcion,
         manager_usuario_id,
         activo,
         created_at,
         updated_at`,
      [
        direccion,
        ciudad,
        codigoPostal || null,
        descripcion || null,
        userId,
      ]
    );

    const updatedUserResult = await client.query(
      `UPDATE usuario
       SET rol = 'advertiser',
           token_version = token_version + 1
       WHERE id = $1
       RETURNING
         id,
         nombre,
         apellidos,
         email,
         rol,
         telefono,
         foto_perfil_url,
         activo,
         token_version,
         fecha_registro`,
      [userId]
    );

    await client.query("COMMIT");

    const updatedUser = updatedUserResult.rows[0];

    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    if (!secret) {
      return res.status(500).json({ error: "INVALID_SERVER_CONFIG" });
    }

    const token = jwt.sign(
      {
        id: updatedUser.id,
        rol: updatedUser.rol,
        token_version: updatedUser.token_version,
      },
      secret,
      { expiresIn }
    );

    return res.status(201).json({
      token,
      user: sanitizeUser(updatedUser),
      piso: pisoResult.rows[0],
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    console.error("convertirmeEnAdvertiser error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

// POST /api/usuario/dejar-de-ser-anunciante
const dejarDeSerAdvertiser = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;

    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT
         id,
         nombre,
         apellidos,
         email,
         rol,
         telefono,
         foto_perfil_url,
         activo,
         token_version,
         fecha_registro
       FROM usuario
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    const user = userResult.rows[0];

    if (!user.activo) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "USER_INACTIVE" });
    }

    if (user.rol !== "advertiser") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "ROLE_NOT_ADVERTISER" });
    }

    const hasActivePisos = await userHasActivePisos(client, userId);
    if (hasActivePisos) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "USER_HAS_ACTIVE_PISOS" });
    }

    const updatedUserResult = await client.query(
      `UPDATE usuario
       SET rol = 'user',
           token_version = token_version + 1
       WHERE id = $1
       RETURNING
         id,
         nombre,
         apellidos,
         email,
         rol,
         telefono,
         foto_perfil_url,
         activo,
         token_version,
         fecha_registro`,
      [userId]
    );

    await client.query("COMMIT");

    const updatedUser = updatedUserResult.rows[0];

    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    if (!secret) {
      return res.status(500).json({ error: "INVALID_SERVER_CONFIG" });
    }

    const token = jwt.sign(
      {
        id: updatedUser.id,
        rol: updatedUser.rol,
        token_version: updatedUser.token_version,
      },
      secret,
      { expiresIn }
    );

    return res.status(200).json({
      token,
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    console.error("dejarDeSerAdvertiser error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

// PATCH /api/usuario/me
const updateMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const nombre =
      typeof req.body?.nombre === "string" ? req.body.nombre.trim() : undefined;

    const apellidos =
      typeof req.body?.apellidos === "string"
        ? req.body.apellidos.trim()
        : undefined;

    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : undefined;

    const telefono =
      typeof req.body?.telefono === "string"
        ? req.body.telefono.trim()
        : undefined;

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

    if (apellidos !== undefined) {
      if (!apellidos) {
        return res.status(400).json({ error: "VALIDATION_ERROR", details: ["apellidos"] });
      }
      setClauses.push(`apellidos = $${i++}`);
      values.push(apellidos);
    }

    if (email !== undefined) {
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "VALIDATION_ERROR", details: ["email"] });
      }
      setClauses.push(`email = $${i++}`);
      values.push(email);
    }

    if (telefono !== undefined) {
      const telValue = telefono === "" ? null : telefono;
      setClauses.push(`telefono = $${i++}`);
      values.push(telValue);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "NO_FIELDS_TO_UPDATE" });
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE usuario
       SET ${setClauses.join(", ")}
       WHERE id = $${i}
       RETURNING id, nombre, apellidos, email, rol, telefono, foto_perfil_url, activo, fecha_registro`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    return res.status(200).json({ user: sanitizeUser(result.rows[0]) });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "DUPLICATE_EMAIL" });
    }

    console.error("Patch me error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// PATCH /api/usuario/me/foto
const updateMeFoto = async (req, res) => {
  const client = await pool.connect();
  let nextFotoUrl = null;

  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: ["foto"] });
    }

    nextFotoUrl = `/uploads/perfiles/${req.file.filename}`;

    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT id, foto_perfil_url
       FROM usuario
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (currentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      deleteUploadedFileByUrl(nextFotoUrl);
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    const previousFotoUrl = currentResult.rows[0].foto_perfil_url;

    const updateResult = await client.query(
      `UPDATE usuario
       SET foto_perfil_url = $1
       WHERE id = $2
       RETURNING id, nombre, apellidos, email, rol, telefono, foto_perfil_url, activo, fecha_registro`,
      [nextFotoUrl, userId]
    );

    await client.query("COMMIT");

    if (previousFotoUrl && previousFotoUrl !== nextFotoUrl) {
      deleteUploadedFileByUrl(previousFotoUrl);
    }

    return res.status(200).json({ user: sanitizeUser(updateResult.rows[0]) });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    if (nextFotoUrl) {
      deleteUploadedFileByUrl(nextFotoUrl);
    }

    console.error("updateMeFoto error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

// DELETE /api/usuario/me/foto
const deleteMeFoto = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;

    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT id, foto_perfil_url
       FROM usuario
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    if (currentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    const previousFotoUrl = currentResult.rows[0].foto_perfil_url;

    await client.query(
      `UPDATE usuario
       SET foto_perfil_url = NULL
       WHERE id = $1`,
      [userId]
    );

    await client.query("COMMIT");

    if (previousFotoUrl) {
      deleteUploadedFileByUrl(previousFotoUrl);
    }

    return res.status(200).json({ deleted: true });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    console.error("deleteMeFoto error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
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

    const sameAsOld = await bcrypt.compare(newPassword, user.password_hash);
    if (sameAsOld) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "PASSWORD_SAME_AS_OLD" });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    const updated = await client.query(
      `UPDATE usuario
       SET password_hash = $1,
           token_version = token_version + 1
       WHERE id = $2
       RETURNING id, rol, token_version`,
      [newHash, userId]
    );

    await client.query("COMMIT");

    const refreshedUser = updated.rows[0];
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    if (!secret) {
      return res.status(500).json({ error: "INVALID_SERVER_CONFIG" });
    }

    const token = jwt.sign(
      {
        id: refreshedUser.id,
        rol: refreshedUser.rol,
        token_version: refreshedUser.token_version,
      },
      secret,
      { expiresIn }
    );

    return res.status(200).json({ token });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    console.error("changeMyPassword error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
};

// DELETE /api/usuario/me
const deleteMe = async (req, res) => {
  try {
    const userId = req.user.id;

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

    const exists = await pool.query(
      `SELECT id FROM usuario WHERE id = $1 LIMIT 1`,
      [userId]
    );

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
         uh.id,
         uh.usuario_id,
         uh.habitacion_id,
         uh.fecha_entrada,
         uh.fecha_salida,
         uh.estado,
         h.titulo AS habitacion_titulo,
         p.id AS piso_id,
         p.ciudad,
         p.direccion
       FROM usuario_habitacion uh
       JOIN habitacion h ON h.id = uh.habitacion_id
       JOIN piso p ON p.id = h.piso_id
       WHERE uh.usuario_id = $1
         AND uh.fecha_salida IS NULL
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ stay: null });
    }

    return res.status(200).json({ stay: result.rows[0] });
  } catch (error) {
    console.error("Me estancia error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

module.exports = {
  getMe,
  getMeEstancia,
  updateMe,
  updateMeFoto,
  deleteMeFoto,
  deleteMe,
  changeMePassword,
  convertirmeEnAdvertiser,
  dejarDeSerAdvertiser
};