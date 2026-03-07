const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const db = require("./src/config/conexion");

// Rutas y controladores
const authRoutes       = require('./src/routes/auth');
const supervisorRoutes = require('./src/routes/supervisor');
const maintRoutes      = require('./src/routes/maintenance');
const estacionesRouter = require('./src/routes/estaciones');
const flujopaCtrl      = require('./src/controllers/flujopaController');
const incidentesRouter = require('./src/routes/incidentes');
const dashboardRoutes  = require('./src/routes/dashboard_operador'); // ← dashboard

const { verificarToken } = require('./src/middlewares/mauth');

const app  = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// =======================
// RUTAS
// =======================
app.use('/api', authRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/supervisor/maint', maintRoutes);
app.use('/api/estaciones', estacionesRouter);

// Rutas de flujo de pasajeros (protegidas con token)
app.post('/api/registrar-flujo',          verificarToken, flujopaCtrl.registrarFlujo);
app.get('/api/flujo/hoy',                 verificarToken, flujopaCtrl.getFlujoHoy);
app.get('/api/flujo/ayer',                verificarToken, flujopaCtrl.getFlujoAyer);
app.post('/api/confirmar-congestion',     verificarToken, flujopaCtrl.confirmarCongestion);
app.post('/api/ignorar-congestion',       verificarToken, flujopaCtrl.ignorarCongestion);
app.post('/api/notificaciones/solucionar',verificarToken, flujopaCtrl.solucionarNotificacion);
app.get('/api/notificaciones/ignoradas',  verificarToken, flujopaCtrl.getNotificacionesIgnoradas);

app.use('/api/incidentes',  incidentesRouter);
app.use('/api/dashboard',   dashboardRoutes); // ← nueva ruta del dashboard

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

// Manejo global de errores 404
app.use((req, res) => {
    res.status(404).json({
        ok: false,
        message: "Ruta no encontrada"
    });
});