const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./src/config/conexion");

// Rutas y controladores
const authRoutes = require('./src/routes/auth');
const estacionesRouter = require('./src/routes/estaciones');
const flujopaCtrl = require('./src/controllers/flujopaController');

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
app.use('/api/estaciones', estacionesRouter);

// Rutas de flujo de pasajeros (protegidas con token)
app.post('/api/registrar-flujo', verificarToken, flujopaCtrl.registrarFlujo);
app.get('/api/flujo/hoy', verificarToken, flujopaCtrl.getFlujoHoy); 
app.get('/api/flujo/ayer', verificarToken, flujopaCtrl.getFlujoAyer);
// En tu router (ej: notificacionesRouter.js o el principal)
app.post('/api/crear-congestion', verificarToken, flujopaCtrl.crearNotificacionCongestion);
app.post('/api/solucionar', verificarToken, flujopaCtrl.solucionarNotificacion);

// Ruta de prueba
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