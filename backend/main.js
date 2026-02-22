const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");

const app = express();
const port = process.env.PORT || 8080;

// Middleware para parsear JSON
app.use(express.json());

// Rutas separadas por recurso
app.use("/api/auth", require("./routes/auth"));
app.use("/api/usuario", require("./routes/usuario"));
app.use("/api/piso", require("./routes/piso"));
app.use("/api/usuario-habitacion", require("./routes/usuarioHabitacion"));
app.use("/api/voto-usuario", require("./routes/votoUsuario"));

// HABITACION (público)
app.use("/api/habitacion", require("./routes/habitacion"));

// ADMIN
app.use("/api/admin/usuario", require("./routes/adminUsuario"));
app.use("/api/admin/habitacion", require("./routes/adminHabitacion"));

// Ruta raíz de prueba
app.get("/", (req, res) => {
  res.send("Servidor funcionando ✅");
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
