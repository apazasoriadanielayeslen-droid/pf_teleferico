const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./src/config/conexion");

// Rutas y controladores
const authRoutes = require('./src/routes/auth');
const supervisorRoutes = require('./src/routes/supervisor');
const maintRoutes = require('./src/routes/maintenance');
const estacionesRouter = require('./src/routes/estaciones');
const flujopaCtrl = require('./src/controllers/flujopaController');
const incidentesRouter = require('./src/routes/incidentes');

// Middleware de autenticación
const { verificarToken } = require('./src/middlewares/mauth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// =======================
// RUTAS
// =======================
app.use('/api', authRoutes);

// =======================
// ADMIN
// =======================
const panelRoutes = require('./src/routes/panel');
app.use('/panel', panelRoutes);
const registroRoutes = require('./src/routes/registro');
app.use('/api/registro', registroRoutes);
const rolesRouter = require('./src/routes/roles');
app.use('/api/roles', rolesRouter);
const estacionesRoutes = require('./src/routes/estacionesv');
app.use('/api/estaciones', estacionesRoutes);
const personalRoutes = require('./src/routes/personal');
app.use('/api', personalRoutes);
const cabinasRoutes = require('./src/routes/cabinas');
app.use('/api/cabinas', cabinasRoutes);
const reportesRoutes = require("./src/routes/reportes");
app.use('/api/reportes', reportesRoutes);

app.use(express.json()); // ✅ parsea JSON
app.use(express.urlencoded({ extended: true })); // ✅ parsea formularios


// Ruta de prueba / bienvenida
app.get("/", (req, res) => {
  res.json({ mensaje: "Servidor Teleférico funcionando 🚡" });
});

// =======================
// VERIFICAR CONEXIÓN DB
// =======================
async function verificarConexion() {
  try {
    await db.query("SELECT 1");
    console.log("✅ Conexión exitosa a MySQL");
  } catch (error) {
    console.error("❌ Error de conexión a MySQL:", error.message);
  }
}

// =======================
// INICIAR SERVIDOR
// =======================
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  await verificarConexion();
});

// Opcional: Manejo global de errores 404
app.use((req, res) => {
  res.status(404).json({ 
    ok: false, 
    message: "Ruta no encontrada" 
  });
});