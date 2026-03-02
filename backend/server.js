const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Importamos el pool de conexión (ya configurado en conexion.js)
const db = require("./src/config/conexion");

// Importamos rutas **después** de express, pero antes de usar app
const authRoutes = require('./src/routes/auth');
const supervisorRoutes = require('./src/routes/supervisor');
const maintRoutes = require('./src/routes/maintenance');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares (deben ir ANTES de las rutas)
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api', authRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/supervisor/maint', maintRoutes);

// Ruta de prueba / bienvenida
app.get("/", (req, res) => {
  res.json({ mensaje: "Servidor Teleférico funcionando 🚡" });
});

// 🔥 Verificar conexión a la base de datos al iniciar
async function verificarConexion() {
  try {
    await db.query("SELECT 1");
    console.log("✅ Conexión exitosa a MySQL");
  } catch (error) {
    console.error("❌ Error de conexión a MySQL:");
    console.error(error.message);
  }
}

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  await verificarConexion();
});