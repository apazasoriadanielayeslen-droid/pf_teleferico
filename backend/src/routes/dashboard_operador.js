// routes/dashboard_operador.js

const express        = require('express');
const router         = express.Router();
const pool           = require('../config/conexion');
const { verificarToken } = require('../middlewares/mauth');

// ────────────────────────────────────────────────
// GET /api/dashboard/notificaciones
// FIX: Filtrado por estación seleccionada (?estacion=ID)
// Solo devuelve congestiones PENDIENTES de esa estación
// ────────────────────────────────────────────────
router.get('/notificaciones', verificarToken, async (req, res) => {
    const id_personal = req.user.id;
    const { estacion } = req.query;

    const conn = await pool.getConnection();
    try {
        let query = `
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
        `;
        const params = [id_personal];

        // FIX: Si viene estación específica, filtrar solo por esa
        if (estacion && !isNaN(Number(estacion))) {
            query += ` AND i.id_estacion = ?`;
            params.push(Number(estacion));
        }

        query += ` ORDER BY n.fecha DESC`;

        const [rows] = await conn.execute(query, params);
        res.json(rows);
    } catch (err) {
        console.error("Error notificaciones dashboard:", err);
        res.status(500).json({ ok: false, message: "Error al consultar notificaciones" });
    } finally {
        conn.release();
    }
});

module.exports = router;