const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const path       = require('path');
const { exec }   = require('child_process');

const db = require("./src/config/conexion");

// Rutas y controladores
const authRoutes       = require('./src/routes/auth');
const supervisorRoutes = require('./src/routes/supervisor');
const maintRoutes      = require('./src/routes/maintenance');
const estacionesRouter = require('./src/routes/estaciones');
const flujopaCtrl      = require('./src/controllers/flujopaController');
const incidentesRouter = require('./src/routes/incidentes');
const dashboardRoutes  = require('./src/routes/dashboard_operador');
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

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// =======================
// FLUJO DE PASAJEROS
// =======================
app.post('/api/registrar-flujo',           verificarToken, flujopaCtrl.registrarFlujo);
app.get('/api/flujo/hoy',                  verificarToken, flujopaCtrl.getFlujoHoy);
app.get('/api/flujo/ayer',                 verificarToken, flujopaCtrl.getFlujoAyer);
app.post('/api/confirmar-congestion',      verificarToken, flujopaCtrl.confirmarCongestion);
app.post('/api/ignorar-congestion',        verificarToken, flujopaCtrl.ignorarCongestion);
app.post('/api/notificaciones/solucionar', verificarToken, flujopaCtrl.solucionarNotificacion);
app.get('/api/notificaciones/ignoradas',   verificarToken, flujopaCtrl.getNotificacionesIgnoradas);
app.use('/api/incidentes', incidentesRouter);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/mis-estaciones', estacionesRouter);  

// Ruta de prueba / bienvenida
app.get("/", (req, res) => {
    res.json({ mensaje: "Servidor Teleférico funcionando 🚡" });
});

// Manejo global de errores 404
app.use((req, res) => {
    res.status(404).json({
        ok: false,
        message: "Ruta no encontrada"
    });
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

    // Abrir el navegador con el login
    const loginPath = path.join(__dirname, '..', 'frontend', 'src', 'public', 'paginas', 'login.html');

    const comando = process.platform === 'win32'
        ? `start "" "${loginPath}"`
        : process.platform === 'darwin'
        ? `open "${loginPath}"`
        : `xdg-open "${loginPath}"`;

    exec(comando, (err) => {
        if (err) {
            console.error('❌ No se pudo abrir el navegador:', err.message);
        } else {
            console.log('🌐 Navegador abierto con login.html');
        }
    });
});