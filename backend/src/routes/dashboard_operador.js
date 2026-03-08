// routes/dashboard_operador.js

const express        = require('express');
const router         = express.Router();
const pool           = require('../config/conexion');
const { verificarToken } = require('../middlewares/mauth'); // ← ruta correcta de tu proyecto

// ────────────────────────────────────────────────
// GET /api/dashboard/notificaciones
// Devuelve las notificaciones de congestión PENDIENTES
// del operador logueado (misma lógica que /api/notificaciones/ignoradas)
// ────────────────────────────────────────────────
router.get('/notificaciones', verificarToken, async (req, res) => {
    const id_personal = req.user.id;

    const conn = await pool.getConnection();
    try {
        const [rows] = await conn.execute(`
            SELECT
                n.id_notificacion,
                n.id_incidente,
                n.titulo,
                n.mensaje,
                n.fecha,
                n.estado,
                e.nombre AS estacion
            FROM notificaciones n
            LEFT JOIN incidentes i ON n.id_incidente = i.id_incidente
            LEFT JOIN estaciones e ON i.id_estacion  = e.id_estacion
            WHERE n.id_personal = ?
              AND n.tipo        = 'CONGESTION'
              AND n.leido       = FALSE
              AND n.estado      = 'PENDIENTE'
            ORDER BY n.fecha DESC
        `, [id_personal]);

        res.json(rows);
    } catch (err) {
        console.error("Error notificaciones dashboard:", err);
        res.status(500).json({ ok: false, message: "Error al consultar notificaciones" });
    } finally {
        conn.release();
    }
});

module.exports = router;