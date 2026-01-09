const pool = require('../db/pool');

// Obtener todos los pisos con filtros y paginación
exports.getAllPisos = async (req, res) => {
    try {
        let { ciudad, precioMax, page = 1, limit = 10 } = req.query;

        // Convertir page y limit a números
        page = Number(page);
        limit = Number(limit);
        const offset = (page - 1) * limit;

        // Construir consulta dinámica
        let baseQuery = 'SELECT * FROM piso';
        let countQuery = 'SELECT COUNT(*) FROM piso';
        let conditions = [];
        let values = [];

        if (ciudad) {
            values.push(ciudad);
            conditions.push(`LOWER(ciudad) = LOWER($${values.length})`);
        }
        if (precioMax) {
            values.push(precioMax);
            conditions.push(`precio <= $${values.length}`);
        }

        if (conditions.length > 0) {
            const whereClause = ' WHERE ' + conditions.join(' AND ');
            baseQuery += whereClause;
            countQuery += whereClause;
        }

        // Añadir orden y paginación
        baseQuery += ` ORDER BY id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(limit, offset);

        // Ejecutar consultas
        const pisosResult = await pool.query(baseQuery, values);
        const countResult = await pool.query(countQuery, values.slice(0, values.length - 2));

        const total = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(total / limit);

        res.json({
            pisos: pisosResult.rows,
            total,
            page,
            totalPages
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener pisos');
    }
};

// Obtener un piso por ID
exports.getPisoById = async (req, res) => {
   try {
       const { id } = req.params;
       const result = await pool.query('SELECT * FROM piso WHERE id = $1', [id]);
       if (result.rows.length === 0) {
           return res.status(404).send('Piso no encontrado');
       }
       res.json(result.rows[0]);
   } catch (err) {
       console.error(err);
       res.status(500).send('Error al obtener piso');
   }
};

// Obtener un piso por nombre de la ciudad
exports.getPisosByCiudad = async (req, res) => {
  try {
    const { ciudad } = req.params;
    const result = await pool.query(
      'SELECT * FROM piso WHERE LOWER(ciudad) = LOWER($1)',
      [ciudad]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener pisos por ciudad');
  }
};

// Crear piso (usuario_id opcional)
exports.createPiso = async (req, res) => {
    try {
        const { direccion, ciudad, codigo_postal, descripcion } = req.body;
        const usuario_id = req.user.id;

        // Si es usuario normal, verificar que no tenga ya un piso activo
        if (req.user.rol === 'usuario') {
            const existingRelation = await pool.query(
                'SELECT * FROM usuario_piso WHERE usuario_id = $1 AND fecha_salida IS NULL',
                [usuario_id]
            );
            if (existingRelation.rows.length > 0) {
                return res.status(400).json({ error: 'Ya tienes un piso asignado' });
            }
        }

        // Crear piso
        const result = await pool.query(
            `INSERT INTO piso (direccion, ciudad, codigo_postal, descripcion, usuario_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [direccion, ciudad, codigo_postal, descripcion, usuario_id]
        );

        const piso = result.rows[0];

        // Si es usuario normal, crear relación automáticamente
        if (req.user.rol === 'usuario') {
            await pool.query(
                `INSERT INTO usuario_piso (usuario_id, piso_id, fecha_entrada)
                 VALUES ($1, $2, CURRENT_TIMESTAMP)`,
                [usuario_id, piso.id]
            );
        }

        res.status(201).json(piso);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al crear piso');
    }
};

// Actualizar un piso
exports.updatePiso = async (req, res) => {
    try {
        const { id } = req.params;
        const { direccion, ciudad, codigo_postal, descripcion } = req.body;

        // Obtener datos actuales
        const current = await pool.query('SELECT * FROM piso WHERE id = $1', [id]);
        if (current.rows.length === 0) return res.status(404).send('Piso no encontrado');

        const pisoActual = current.rows[0];

        // Actualizar solo los campos enviados
        const updated = await pool.query(
            `UPDATE piso
             SET direccion = $1,
                 ciudad = $2,
                 codigo_postal = $3,
                 descripcion = $4
             WHERE id = $5 RETURNING *`,
            [
                direccion ?? pisoActual.direccion,
                ciudad ?? pisoActual.ciudad,
                codigo_postal ?? pisoActual.codigo_postal,
                descripcion ?? pisoActual.descripcion,
                id
            ]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar piso');
    }
};

// Eliminar un piso
exports.deletePiso = async (req, res) => {
    try {
        const { id } = req.params;

        // Si no es admin, verificar que el piso le pertenece
        if (req.user.rol !== 'admin') {
            const pisoCheck = await pool.query(
                'SELECT usuario_id FROM piso WHERE id = $1',
                [id]
            );
            if (pisoCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Piso no encontrado' });
            }
            if (pisoCheck.rows[0].usuario_id !== req.user.id) {
                return res.status(403).json({ error: 'No puedes borrar un piso que no has creado' });
            }
        }

        // Borrar piso
        const result = await pool.query(
            'DELETE FROM piso WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Piso no encontrado' });
        }

        res.json({ mensaje: 'Piso eliminado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al eliminar piso');
    }
};

