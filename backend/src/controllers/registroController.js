const bcrypt = require('bcrypt');
const pool = require('../config/conexion');   // ← Ajusta la ruta según tu proyecto

// GET /api/roles
exports.getRoles = async (req, res) => {
  try {
    const [roles] = await pool.query(
      'SELECT id_rol, nombre, descripcion FROM roles ORDER BY id_rol'
    );
    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener roles' });
  }
};

// POST /api/registro
exports.register = async (req, res) => {
  const { nombres, apellido1, apellido2, ci, telefono, correo, contrasena, id_rol } = req.body;

  // Validaciones básicas
  if (!nombres || !apellido1 || !ci || !correo || !contrasena || !id_rol) {
    return res.status(400).json({ message: 'Todos los campos obligatorios deben completarse' });
  }
  if (contrasena.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener mínimo 6 caracteres' });
  }

  try {
    // Verificar si CI o correo ya existen
    const [existente] = await pool.query(
      'SELECT id_personal FROM personal WHERE ci = ? OR correo = ?',
      [ci, correo]
    );

    if (existente.length > 0) {
      return res.status(409).json({ message: 'El C.I. o el correo electrónico ya están registrados' });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    // Insertar usuario
    const [result] = await pool.query(`
      INSERT INTO personal 
      (nombres, apellido1, apellido2, ci, id_rol, correo, telefono, contrasena, estado, fecha_contratacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', CURDATE())
    `, [nombres, apellido1, apellido2, ci, id_rol, correo, telefono, hashedPassword]);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      id_personal: result.insertId
    });

  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};