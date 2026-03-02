// src/controllers/authController.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/conexion'); // ajusta si la ruta es diferente

// POST /api/login
exports.login = async (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
  }

  try {
    // Buscar usuario activo por correo
    const [rows] = await pool.query(
      `SELECT 
         p.id_personal, 
         p.nombres, 
         p.apellido1, 
         p.correo, 
         p.contrasena, 
         r.nombre AS rol_nombre, 
         r.id_rol
       FROM personal p
       JOIN roles r ON p.id_rol = r.id_rol
       WHERE p.correo = ? AND p.estado = 'ACTIVO'`,
      [correo]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = rows[0];

    // Verificar contraseña
    const match = await bcrypt.compare(password, user.contrasena);
    if (!match) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: user.id_personal,
        correo: user.correo,
        rol: user.rol_nombre,
        nombre: `${user.nombres} ${user.apellido1}`
      },
      process.env.JWT_SECRET,           // ← usa la variable del .env
      { expiresIn: '8h' }
    );

    // Respuesta exitosa
    res.json({
      success: true,
      token,
      user: {
        id: user.id_personal,
        nombre: `${user.nombres} ${user.apellido1}`,
        correo: user.correo,
        rol_nombre: user.rol_nombre,
        rol_id: user.id_rol
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}; 