const pool = require('../db/pool');

// Obtener todas las relaciones usuario-piso
exports.getAllUsuarioPiso = async (req, res) => {
   try {
       const result = await pool.query('SELECT * FROM usuario_piso');
       res.json(result.rows);
   } catch (err) {
       console.error(err);
       res.status(500).send('Error al obtener relaciones usuario-piso');
   }
};

// Obtener una relación por ID
exports.getUsuarioPisoById = async (req, res) => {
   try {
       const { id } = req.params;
       const result = await pool.query('SELECT * FROM usuario_piso WHERE id = $1', [id]);
       if (result.rows.length === 0) {
           return res.status(404).send('Relación usuario-piso no encontrada');
       }
       res.json(result.rows[0]);
   } catch (err) {
       console.error(err);
       res.status(500).send('Error al obtener relación usuario-piso');
   }
};

// Crear una nueva relación usuario-piso
exports.createUsuarioPiso = async (req, res) => {
    try {
        const usuario_id = req.user.id;
        const { piso_id } = req.body;

        // Verificar que no tenga ya un piso activo
        const existingRelation = await pool.query(
            'SELECT * FROM usuario_piso WHERE usuario_id = $1 AND fecha_salida IS NULL',
            [usuario_id]
        );
        if (existingRelation.rows.length > 0) {
            return res.status(400).json({ error: 'Ya tienes un piso asignado' });
        }

        // Verificar que el piso existe
        const pisoCheck = await pool.query('SELECT id FROM piso WHERE id = $1', [piso_id]);
        if (pisoCheck.rows.length === 0) {
            return res.status(400).json({ error: 'El piso no existe' });
        }

        // Crear relación
        const result = await pool.query(
            'INSERT INTO usuario_piso (usuario_id, piso_id, fecha_entrada) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *',
            [usuario_id, piso_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al unirse al piso');
    }
};

// Actualizar una relación usuario-piso
exports.updateUsuarioPiso = async (req, res) => {
   try {
       const { id } = req.params;
       const { usuario_id, piso_id, fecha_union, fecha_salida } = req.body;

       // Validar que usuario_id existe
       const userCheck = await pool.query('SELECT id FROM usuario WHERE id = $1', [usuario_id]);
       if (userCheck.rows.length === 0) {
           return res.status(400).json({ error: 'El usuario_id no existe.' });
       }

       // Validar que piso_id existe
       const pisoCheck = await pool.query('SELECT id FROM piso WHERE id = $1', [piso_id]);
       if (pisoCheck.rows.length === 0) {
           return res.status(400).json({ error: 'El piso_id no existe.' });
       }

       const result = await pool.query(
           'UPDATE usuario_piso SET usuario_id=$1, piso_id=$2, fecha_entrada=$3, fecha_salida=$4 WHERE id=$5 RETURNING *',
           [usuario_id, piso_id, fecha_union || new Date(), fecha_salida || null, id]
       );

       if (result.rows.length === 0) {
           return res.status(404).send('Relación usuario-piso no encontrada');
       }

       res.json(result.rows[0]);
   } catch (err) {
       console.error(err);
       res.status(500).send('Error al actualizar relación usuario-piso');
   }
};

// Eliminar una relación usuario-piso
exports.deleteUsuarioPiso = async (req, res) => {
   try {
       const { id } = req.params;
       const result = await pool.query('DELETE FROM usuario_piso WHERE id = $1 RETURNING *', [id]);
       if (result.rows.length === 0) {
           return res.status(404).send('Relación usuario-piso no encontrada');
       }
       res.json({ mensaje: 'Relación usuario-piso eliminada correctamente' });
   } catch (err) {
       console.error(err);
       res.status(500).send('Error al eliminar relación usuario-piso');
   }
};
