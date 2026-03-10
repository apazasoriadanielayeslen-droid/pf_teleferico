const db = require('../config/conexion');

// Listar supervisores activos (para asignación a estaciones)
exports.getSupervisores = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id_personal, p.nombres, p.apellido1, p.apellido2, p.estado, r.nombre as rol_nombre
      FROM personal p
      LEFT JOIN roles r ON p.id_rol = r.id_rol
      WHERE p.estado = 'ACTIVO' AND r.nombre = 'SUPERVISOR'
      ORDER BY p.id_personal DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener supervisores:", error.sqlMessage || error);
    res.status(500).json({ message: "Error al obtener supervisores" });
  }
};
