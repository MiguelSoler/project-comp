const path = require("path");
require("dotenv").config({path: path.resolve(__dirname, ".env")});

const express = require('express');

const app = express();
//console.log(process.env);
const port = process.env.PORT || 8080;

// Middleware para parsear JSON
app.use(express.json());

// Rutas separadas por recurso
app.use('/api/usuario', require('./routes/usuario'));
app.use('/api/piso', require('./routes/piso'));
app.use('/api/auth', require('./routes/auth'));
// ADMIN
app.use('/api/admin/usuario', require('./routes/adminUsuario'));

// Ruta raíz de prueba
app.get('/', (req, res) => {
   res.send('Servidor funcionando ✅');
});

app.listen(port, () => {
   console.log(`Servidor escuchando en http://localhost:${port}`);
});
