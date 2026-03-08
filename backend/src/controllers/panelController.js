// src/controllers/panelController.js
const db = require('../config/conexion');

exports.getPanelStats = async (req, res) => {
  try {
    // Estaciones agrupadas por estado
    const [estaciones] = await db.query(
      "SELECT estado, COUNT(*) AS total FROM estaciones GROUP BY estado"
    );

    // Cabinas agrupadas por estado
    const [cabinas] = await db.query(
      "SELECT estado, COUNT(*) AS total FROM cabinas GROUP BY estado"
    );

    // Incidentes agrupados por estado
    const [incidentes] = await db.query(
      "SELECT estado, COUNT(*) AS total FROM incidentes GROUP BY estado"
    );

    // Mantenimientos agrupados por estado
    const [mantenimientos] = await db.query(
      "SELECT estado, COUNT(*) AS total FROM mantenimientos GROUP BY estado"
    );

    // Flujo de pasajeros agrupado por tipo
    const [flujo] = await db.query(
      "SELECT tipo, SUM(cantidad) AS total FROM flujo_pasajeros GROUP BY tipo"
    );

    // Usuarios agrupados por estado
    const [usuarios] = await db.query(
      "SELECT estado, COUNT(*) AS total FROM personal GROUP BY estado"
    );

    // ✅ Respuesta JSON normalizada
    res.json({
      estaciones: estaciones || [],
      cabinas: cabinas || [],
      incidentes: incidentes || [],
      mantenimientos: mantenimientos || [],
      flujo: flujo || [],
      usuarios: usuarios || []
    });
  } catch (error) {
    console.error("Error en getPanelStats:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas" });
  }
};