const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./src/config/conexion");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔥 Verificar conexión a la base de datos al iniciar
async function verificarConexion() {
  try {
    await db.query("SELECT 1");
    console.log("✅ Conexión exitosa a MySQL");
  } catch (error) {
    console.error("❌ Error de conexión a MySQL:");
    console.error(error.message);
  }
}

// Ruta principal
app.get("/", (req, res) => {
  res.json({ mensaje: "Servidor Teleférico funcionando 🚡" });
});

app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  await verificarConexion(); // 👈 aquí se ejecuta la verificación
});