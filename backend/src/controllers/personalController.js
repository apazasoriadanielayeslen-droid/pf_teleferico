const db = require('../config/conexion');

// Listar personal activo
exports.getPersonal = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id_personal, nombres, apellido1, apellido2, estado
      FROM personal
      WHERE estado = 'ACTIVO'
      ORDER BY id_personal DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener personal:", error.sqlMessage || error);
    res.status(500).json({ message: "Error al obtener personal" });
  }
};