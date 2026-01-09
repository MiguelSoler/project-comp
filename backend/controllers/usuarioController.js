const pool = require('../db/pool');

// Obtener todos los usuarios
exports.getAllUsuarios = async (req, res) => {
   try {
       const result = await pool.query('SELECT * FROM usuario');
       res.json(result.rows);
   } catch (err) {
       console.error(err);
       res.status(500).send('Error al obtener usuarios');
   }
};

// Obtener un usuario por ID
exports.getUsuarioById = async (req, res) => {
   try {
       const { id } = req.params;
       const result = await pool.query('SELECT * FROM usuario WHERE id = $1', [id]);
       if (result.rows.length === 0) {
           return res.status(404).send('Usuario no encontrado');
       }
       res.json(result.rows[0]);
   } catch (err) {
       console.error(err);
       res.status(500).send('Error al obtener usuario');
   }
};

/**
 * Crea un usuario en la base de datos.
 * @param {Object} data - Datos del usuario.
 * @returns {Object} Usuario creado.
 */
exports.createUsuario = async (data) => {
    const {nombre,email,telefono,limpieza,ruido,puntualidad_pagos,password_hash,rol} = data;

    const result = await pool.query(
        `INSERT INTO usuario (nombre, email, telefono, limpieza, ruido, puntualidad_pagos, password_hash, rol)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [nombre, email, telefono, limpieza, ruido, puntualidad_pagos, password_hash, rol || 'usuario']
    );

    return result.rows[0];
};

// Actualizar un usuario
exports.updateUsuario = async (req, res) => {
   try {
       const { id } = req.params;
       const { nombre, email, telefono, limpieza, ruido, puntualidad_pagos } = req.body;

       // Obtener datos actuales
       const current = await pool.query('SELECT * FROM usuario WHERE id = $1', [id]);
       if (current.rows.length === 0) return res.status(404).send('Usuario no encontrado');

       const usuarioActual = current.rows[0];

       // Usar valores nuevos si se envían, si no mantener los actuales
       const updated = await pool.query(
           `UPDATE usuario
            SET nombre = $1,
                email = $2,
                telefono = $3,
                limpieza = $4,
                ruido = $5,
                puntualidad_pagos = $6
            WHERE id = $7 RETURNING *`,
           [
               nombre ?? usuarioActual.nombre,
               email ?? usuarioActual.email,
               telefono ?? usuarioActual.telefono,
               limpieza ?? usuarioActual.limpieza,
               ruido ?? usuarioActual.ruido,
               puntualidad_pagos ?? usuarioActual.puntualidad_pagos,
               id
           ]
       );

       res.json(updated.rows[0]);
   } catch (err) {
       console.error(err);
       res.status(500).send('Error al actualizar usuario');
   }
};


// Eliminar un usuario
exports.deleteUsuario = async (req, res) => {
   try {
       const { id } = req.params;

       // Comprobar si el usuario tiene pisos
       //const pisos = await pool.query('SELECT * FROM piso WHERE usuario_id = $1', [id]);
       //if (pisos.rows.length > 0) {
       //    return res.status(400).json({ error: 'No se puede borrar el usuario porque tiene pisos asociados' });
       //}

       // Comprobar si el usuario está en usuario_piso
       //const relaciones = await pool.query('SELECT * FROM usuario_piso WHERE usuario_id = $1', [id]);
       //if (relaciones.rows.length > 0) {
       //    return res.status(400).json({ error: 'No se puede borrar el usuario porque tiene relaciones en usuario_piso' });
       //}

       const result = await pool.query('DELETE FROM usuario WHERE id = $1 RETURNING *', [id]);
       if (result.rows.length === 0) {
           return res.status(404).send('Usuario no encontrado');
       }

       res.json({ mensaje: 'Usuario eliminado correctamente' });
   } catch (err) {
       console.error(err);
       res.status(500).send('Error al eliminar usuario');
   }
};

// Handler para crear usuario desde ruta POST
exports.createUsuarioHandler = async (req, res) => {
    try {
        const usuario = await exports.createUsuario(req.body);
        res.status(201).json(usuario);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al crear usuario');
    }
};