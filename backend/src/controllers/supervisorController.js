const pool = require('../config/conexion');

// Devuelve un resumen para el dashboard de un supervisor.
exports.getOverview = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(400).json({ message: 'Usuario no identificado' });
  }

  try {
    // 1. estaciones supervisadas (activas/inactivas)
    const [stations] = await pool.query(
      `SELECT e.id_estacion, e.nombre, e.estado
       FROM estaciones e
       JOIN personal_estacion pe ON pe.id_estacion = e.id_estacion
       WHERE pe.id_personal = ? AND pe.estado = 'ACTIVO'`,
      [userId]
    );

    const stationIds = stations.map(s => s.id_estacion);

    let cabinasCount = 0;
    let alertasProceso = 0;
    let incidentesActivos = 0;
    let recientes = [];

    if (stationIds.length > 0) {
      const placeholders = stationIds.map(() => '?').join(',');

      const [cabs] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM cabinas
         WHERE estado = 'EN_SERVICIO' AND id_estacion IN (${placeholders})`,
        stationIds
      );
      cabinasCount = cabs[0].total;

      const [enProceso] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM incidentes
         WHERE estado = 'EN_PROCESO' AND id_estacion IN (${placeholders})`,
        stationIds
      );
      alertasProceso = enProceso[0].total;

      const [abiertos] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM incidentes
         WHERE estado = 'ABIERTO' AND id_estacion IN (${placeholders})`,
        stationIds
      );
      incidentesActivos = abiertos[0].total;

      const [recentRows] = await pool.query(
        `SELECT i.id_incidente, i.titulo, i.tipo, i.nivel_criticidad, i.estado,
                i.id_estacion, e.nombre AS estacion_nombre, i.fecha_reporte
         FROM incidentes i
         LEFT JOIN estaciones e ON e.id_estacion = i.id_estacion
         WHERE i.id_estacion IN (${placeholders})
         ORDER BY i.fecha_reporte DESC
         LIMIT 5`,
        stationIds
      );
      recientes = recentRows;
    }

    res.json({
      nombre: req.user.nombre,
      rol: req.user.rol,
      estaciones: stations,
      cabinasEnRuta: cabinasCount,
      alertasEnProceso: alertasProceso,
      incidentesActivos: incidentesActivos,
      recientes: recientes
    });
  } catch (error) {
    console.error('Error obteniendo overview supervisor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// estaciones activas asignadas al supervisor
exports.getStations = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(400).json({ message: 'Usuario no identificado' });
  try {
    const [rows] = await pool.query(
      `SELECT e.id_estacion, e.nombre FROM estaciones e
       JOIN personal_estacion pe ON pe.id_estacion = e.id_estacion
       WHERE pe.id_personal = ? AND pe.estado = 'ACTIVO'`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo estaciones supervisor:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};
