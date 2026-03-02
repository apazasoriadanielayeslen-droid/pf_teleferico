// src/config/conexion.js
const mysql = require('mysql2/promise'); 
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'teleferico_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Opcional pero útil en desarrollo
  debug: process.env.NODE_ENV === 'development' ? ['ComQueryPacket', 'RowDataPacket'] : false
});

module.exports = pool;