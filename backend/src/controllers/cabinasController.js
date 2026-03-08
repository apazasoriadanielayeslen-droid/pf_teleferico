const db = require('../config/conexion');

// Listar cabinas con su estación asociada
exports.getCabinas = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id_cabina, c.codigo, c.capacidad_maxima, c.estado, c.fecha_registro,
             c.id_estacion, e.nombre AS estacion_nombre
      FROM cabinas c
      LEFT JOIN estaciones e ON c.id_estacion = e.id_estacion
      ORDER BY c.id_cabina DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener cabinas:", error);
    res.status(500).json({ message: "Error al obtener cabinas" });
  }
};

// Crear nueva cabina
exports.createCabina = async (req, res) => {
  const { codigo, capacidad_maxima, estado, id_estacion } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO cabinas (codigo, capacidad_maxima, estado, id_estacion)
       VALUES (?, ?, ?, ?)`,
      [codigo, capacidad_maxima, estado, id_estacion]
    );
    res.json({ success: true, id_cabina: result.insertId });
  } catch (error) {
    console.error("Error al crear cabina:", error);
    res.status(500).json({ message: "Error al crear cabina" });
  }
};

// Actualizar cabina
exports.updateCabina = async (req, res) => {
  const { id } = req.params;
  const { codigo, capacidad_maxima, estado, id_estacion } = req.body;
  try {
    await db.query(
      `UPDATE cabinas 
       SET codigo=?, capacidad_maxima=?, estado=?, id_estacion=? 
       WHERE id_cabina=?`,
      [codigo, capacidad_maxima, estado, id_estacion, id]
    );
    res.json({ success: true, message: "Cabina actualizada" });
  } catch (error) {
    console.error("Error al actualizar cabina:", error);
    res.status(500).json({ message: "Error al actualizar cabina" });
  }
};

// Eliminar cabina
exports.deleteCabina = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM cabinas WHERE id_cabina=?", [id]);
    res.json({ success: true, message: "Cabina eliminada" });
  } catch (error) {
    console.error("Error al eliminar cabina:", error);
    res.status(500).json({ message: "Error al eliminar cabina" });
  }
};