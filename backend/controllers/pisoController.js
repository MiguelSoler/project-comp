const pool = require("../db/pool");

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

// GET /api/piso?ciudad=&precioMax=&disponible=true&page=1&limit=10
// Nota: precioMax/disponible filtran por HABITACION (exists)
exports.getAllPisos = async (req, res) => {
  try {
    const ciudad = (req.query.ciudad || "").trim();
    const precioMax = req.query.precioMax !== undefined ? toInt(req.query.precioMax, NaN) : NaN;
    const disponible = req.query.disponible; // "true"|"false"|undefined

    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 10)));
    const offset = (page - 1) * limit;

    const where = ["p.activo = true"];
    const params = [];

    if (ciudad) {
      params.push(ciudad.toLowerCase());
      where.push(`LOWER(p.ciudad) = $${params.length}`);
    }

    // Filtro por habitaciones (precio/disponible)
    const habConds = [];
    const habParams = [];

    if (Number.isFinite(precioMax)) {
      habParams.push(precioMax);
      habConds.push(`h.precio_mensual <= $${params.length + habParams.length}`);
    }
    if (disponible === "true" || disponible === "false") {
      habParams.push(disponible === "true");
      habConds.push(`h.disponible = $${params.length + habParams.length}`);
    }

    if (habConds.length) {
      where.push(`
        EXISTS (
          SELECT 1
          FROM habitacion h
          WHERE h.piso_id = p.id
            AND ${habConds.join(" AND ")}
        )
      `);
      params.push(...habParams);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    // Total
    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM piso p
       ${whereSql}`,
      params
    );

    // Data (resumen piso + portada opcional + min_precio opcional)
    params.push(limit, offset);

    const dataResult = await pool.query(
      `SELECT
         p.id,
         p.direccion,
         p.ciudad,
         p.codigo_postal,
         p.descripcion,
         p.manager_usuario_id,
         p.activo,
         p.created_at,
         -- portada: la foto con orden más bajo
         (SELECT fp.url
            FROM foto_piso fp
           WHERE fp.piso_id = p.id
           ORDER BY fp.orden ASC, fp.id ASC
           LIMIT 1) AS foto_portada_url,
         -- min precio de habitaciones disponibles (útil en listado)
         (SELECT MIN(h.precio_mensual)
            FROM habitacion h
           WHERE h.piso_id = p.id AND h.disponible = true) AS precio_desde
       FROM piso p
       ${whereSql}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const total = totalResult.rows[0].total;
    return res.json({
      pisos: dataResult.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("getAllPisos error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// GET /api/piso/:id  (detalle: piso + fotos + habitaciones + fotos_habitacion)
exports.getPisoById = async (req, res) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "INVALID_ID" });

    const pisoResult = await pool.query(
      `SELECT id, direccion, ciudad, codigo_postal, descripcion, manager_usuario_id, activo, created_at
       FROM piso
       WHERE id = $1`,
      [id]
    );

    if (pisoResult.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });

    const piso = pisoResult.rows[0];

    const fotosPisoResult = await pool.query(
      `SELECT id, url, orden, created_at
       FROM foto_piso
       WHERE piso_id = $1
       ORDER BY orden ASC, id ASC`,
      [id]
    );

    const habitacionesResult = await pool.query(
      `SELECT id, piso_id, titulo, descripcion, precio_mensual, disponible, tamano_m2, amueblada, created_at
       FROM habitacion
       WHERE piso_id = $1
       ORDER BY created_at DESC, id DESC`,
      [id]
    );

    const habitacionIds = habitacionesResult.rows.map((h) => h.id);
    let fotosHabitaciones = [];
    if (habitacionIds.length) {
      const fotosHabResult = await pool.query(
        `SELECT id, habitacion_id, url, orden, created_at
         FROM foto_habitacion
         WHERE habitacion_id = ANY($1::int[])
         ORDER BY habitacion_id ASC, orden ASC, id ASC`,
        [habitacionIds]
      );
      fotosHabitaciones = fotosHabResult.rows;
    }

    // Agrupar fotos por habitacion_id
    const fotosByHab = new Map();
    for (const f of fotosHabitaciones) {
      if (!fotosByHab.has(f.habitacion_id)) fotosByHab.set(f.habitacion_id, []);
      fotosByHab.get(f.habitacion_id).push(f);
    }

    const habitaciones = habitacionesResult.rows.map((h) => ({
      ...h,
      fotos: fotosByHab.get(h.id) || [],
    }));

    return res.json({
      piso,
      fotos_piso: fotosPisoResult.rows,
      habitaciones,
    });
  } catch (err) {
    console.error("getPisoById error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// GET /api/piso/ciudad/:ciudad  (si quieres mantenerlo; realmente es redundante con /api/piso?ciudad=)
exports.getPisosByCiudad = async (req, res) => {
  try {
    const ciudad = (req.params.ciudad || "").trim();
    const result = await pool.query(
      `SELECT id, direccion, ciudad, codigo_postal, descripcion, manager_usuario_id, activo, created_at
       FROM piso
       WHERE activo = true AND LOWER(ciudad) = LOWER($1)
       ORDER BY created_at DESC`,
      [ciudad]
    );
    return res.json({ pisos: result.rows });
  } catch (err) {
    console.error("getPisosByCiudad error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// POST /api/piso  (solo advertiser/admin por routes)
// manager_usuario_id lo asigna el sistema
exports.createPiso = async (req, res) => {
  try {
    const direccion = (req.body?.direccion || "").trim();
    const ciudad = (req.body?.ciudad || "").trim();
    const codigo_postal = req.body?.codigo_postal ? String(req.body.codigo_postal).trim() : null;
    const descripcion = req.body?.descripcion ? String(req.body.descripcion).trim() : null;

    if (!direccion) return res.status(400).json({ error: "INVALID_DIRECCION" });
    if (!ciudad) return res.status(400).json({ error: "INVALID_CIUDAD" });

    const managerId = req.user.id;

    const result = await pool.query(
      `INSERT INTO piso (direccion, ciudad, codigo_postal, descripcion, manager_usuario_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, direccion, ciudad, codigo_postal, descripcion, manager_usuario_id, activo, created_at`,
      [direccion, ciudad, codigo_postal, descripcion, managerId]
    );

    return res.status(201).json({ piso: result.rows[0] });
  } catch (err) {
    console.error("createPiso error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// PATCH /api/piso/:id  (routes ya restringen advertiser/admin)
// Aquí validamos: admin o manager_usuario_id
exports.updatePiso = async (req, res) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "INVALID_ID" });

    const current = await pool.query(
      `SELECT id, manager_usuario_id, activo
       FROM piso
       WHERE id = $1`,
      [id]
    );
    if (current.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });

    const piso = current.rows[0];
    const isAdmin = req.user.rol === "admin";
    const isManager = Number(piso.manager_usuario_id) === Number(req.user.id);

    if (!isAdmin && !isManager) return res.status(403).json({ error: "FORBIDDEN" });

    const direccion = typeof req.body?.direccion === "string" ? req.body.direccion.trim() : undefined;
    const ciudad = typeof req.body?.ciudad === "string" ? req.body.ciudad.trim() : undefined;
    const codigo_postal =
      req.body?.codigo_postal === null ? null :
      typeof req.body?.codigo_postal === "string" ? req.body.codigo_postal.trim() :
      req.body?.codigo_postal !== undefined ? String(req.body.codigo_postal).trim() :
      undefined;
    const descripcion =
      req.body?.descripcion === null ? null :
      typeof req.body?.descripcion === "string" ? req.body.descripcion.trim() :
      undefined;

    // activo: solo admin debería poder reactivar (si quieres)
    const activo =
      typeof req.body?.activo === "boolean" ? req.body.activo : undefined;

    const updates = [];
    const params = [];
    let idx = 1;

    if (direccion !== undefined) {
      if (!direccion) return res.status(400).json({ error: "INVALID_DIRECCION" });
      params.push(direccion);
      updates.push(`direccion = $${idx++}`);
    }
    if (ciudad !== undefined) {
      if (!ciudad) return res.status(400).json({ error: "INVALID_CIUDAD" });
      params.push(ciudad);
      updates.push(`ciudad = $${idx++}`);
    }
    if (codigo_postal !== undefined) {
      params.push(codigo_postal);
      updates.push(`codigo_postal = $${idx++}`);
    }
    if (descripcion !== undefined) {
      params.push(descripcion);
      updates.push(`descripcion = $${idx++}`);
    }
    if (activo !== undefined) {
      if (!isAdmin && activo === true) {
        return res.status(403).json({ error: "FORBIDDEN" });
      }
      params.push(activo);
      updates.push(`activo = $${idx++}`);
    }

    if (updates.length === 0) return res.status(400).json({ error: "NO_FIELDS_TO_UPDATE" });

    params.push(id);

    const result = await pool.query(
      `UPDATE piso
       SET ${updates.join(", ")}
       WHERE id = $${idx}
       RETURNING id, direccion, ciudad, codigo_postal, descripcion, manager_usuario_id, activo, created_at`,
      params
    );

    return res.json({ piso: result.rows[0] });
  } catch (err) {
    console.error("updatePiso error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};

// DELETE /api/piso/:id  (soft delete)
exports.deletePiso = async (req, res) => {
  try {
    const id = toInt(req.params.id, NaN);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "INVALID_ID" });

    const current = await pool.query(
      `SELECT id, manager_usuario_id
       FROM piso
       WHERE id = $1`,
      [id]
    );
    if (current.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });

    const piso = current.rows[0];
    const isAdmin = req.user.rol === "admin";
    const isManager = Number(piso.manager_usuario_id) === Number(req.user.id);

    if (!isAdmin && !isManager) return res.status(403).json({ error: "FORBIDDEN" });

    const result = await pool.query(
      `UPDATE piso
       SET activo = false
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("deletePiso error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
};
