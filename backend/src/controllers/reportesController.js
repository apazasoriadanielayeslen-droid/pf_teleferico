const db = require('../config/conexion');
const PDFDocument = require("pdfkit-table"); // Ojo: aquí ya no es pdfkit normal

exports.reporteFlujoPDF = async (req, res) => {
  // ✅ Aquí defines las variables
  let { fecha_inicio, fecha_fin } = req.query;

  if (fecha_inicio && fecha_inicio.includes("T")) {
    fecha_inicio = fecha_inicio.replace("T", " ") + ":00";
  }
  if (fecha_fin && fecha_fin.includes("T")) {
    fecha_fin = fecha_fin.replace("T", " ") + ":00";
  }

  try {
    const [rows] = await db.query(`
      SELECT e.nombre AS estacion,
             f.tipo,
             SUM(f.cantidad) AS total_pasajeros
      FROM flujo_pasajeros f
      JOIN estaciones e ON f.id_estacion = e.id_estacion
      WHERE f.fecha BETWEEN ? AND ?
      GROUP BY e.id_estacion, f.tipo
      ORDER BY e.nombre, f.tipo
    `, [fecha_inicio, fecha_fin]);

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=flujo.pdf");
    doc.pipe(res);

    const table = {
      title: "Reporte de Flujo de Pasajeros",
      headers: ["Estación", "Tipo", "Total Pasajeros"],
      rows: rows.map(r => [r.estacion, r.tipo, r.total_pasajeros.toString()])
    };

    await doc.table(table, {
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(12),
      prepareRow: (row, i) => doc.font("Helvetica").fontSize(10)
    });

    doc.end();
  } catch (error) {
    console.error("Error en reporte de flujo PDF:", error);
    res.status(500).json({ message: "Error al generar PDF de flujo" });
  }
};

exports.historialIncidentesPDF = async (req, res) => {
  let { fecha_inicio, fecha_fin } = req.query;

  if (fecha_inicio && fecha_inicio.length === 10) fecha_inicio += " 00:00:00";
  if (fecha_fin && fecha_fin.length === 10) fecha_fin += " 23:59:59";

  try {
    const [rows] = await db.query(`
      SELECT i.id_incidente, i.titulo, i.tipo, i.nivel_criticidad,
             i.descripcion, i.estado, i.fecha_reporte,
             e.nombre AS estacion, c.codigo AS cabina,
             CONCAT(p1.nombres, ' ', p1.apellido1, ' ', IFNULL(p1.apellido2, '')) AS reportado_por,
             CONCAT(p2.nombres, ' ', p2.apellido1, ' ', IFNULL(p2.apellido2, '')) AS asignado_a
      FROM incidentes i
      LEFT JOIN estaciones e ON i.id_estacion = e.id_estacion
      LEFT JOIN cabinas c ON i.id_cabina = c.id_cabina
      LEFT JOIN personal p1 ON i.id_reportado_por = p1.id_personal
      LEFT JOIN personal p2 ON i.id_asignado_a = p2.id_personal
      WHERE i.fecha_reporte BETWEEN ? AND ?
      ORDER BY i.fecha_reporte DESC
    `, [fecha_inicio, fecha_fin]);

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=incidentes.pdf");
    doc.pipe(res);

    const table = {
      title: "Historial de Incidentes",
      headers: [
        "Título", "Tipo", "Criticidad", "Estado", "Fecha",
        "Estación", "Cabina", "Reportado por", "Asignado a"
      ],
      rows: rows.map(r => [
        r.titulo,
        r.tipo,
        r.nivel_criticidad,
        r.estado,
        r.fecha_reporte.toISOString().slice(0, 19).replace("T", " "),
        r.estacion || "-",
        r.cabina || "-",
        r.reportado_por || "-",
        r.asignado_a || "-"
      ])
    };

    await doc.table(table, {
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
      prepareRow: (row, i) => doc.font("Helvetica").fontSize(9)
    });

    doc.end();
  } catch (error) {
    console.error("Error en historial de incidentes PDF:", error.sqlMessage || error);
    res.status(500).json({ message: "Error al generar PDF de incidentes" });
  }
};

exports.reporteMantenimientosPDF = async (req, res) => {
  let { fecha_inicio, fecha_fin } = req.query;

  // Ajustar formato si vienen solo fechas YYYY-MM-DD
  if (fecha_inicio && fecha_inicio.length === 10) fecha_inicio += " 00:00:00";
  if (fecha_fin && fecha_fin.length === 10) fecha_fin += " 23:59:59";

  try {
    const [rows] = await db.query(`
      SELECT m.id_mantenimiento, m.titulo_mantenimiento, m.tipo, m.descripcion,
             m.fecha_programada, m.fecha_realizada, m.estado,
             e.nombre AS estacion, c.codigo AS cabina
      FROM mantenimientos m
      LEFT JOIN estaciones e ON m.id_estacion = e.id_estacion
      LEFT JOIN cabinas c ON m.id_cabina = c.id_cabina
      WHERE m.fecha_programada BETWEEN ? AND ?
      ORDER BY m.fecha_programada ASC
    `, [fecha_inicio, fecha_fin]);

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=mantenimientos.pdf");
    doc.pipe(res);

    const table = {
      title: "Reporte de Mantenimientos",
      headers: [
        "Título", "Tipo", "Descripción", "Fecha Programada", "Fecha Realizada",
        "Estado", "Estación", "Cabina"
      ],
      rows: rows.map(r => [
        r.titulo_mantenimiento,
        r.tipo,
        r.descripcion || "-",
        r.fecha_programada ? r.fecha_programada.toISOString().slice(0, 19).replace("T", " ") : "-",
        r.fecha_realizada ? r.fecha_realizada.toISOString().slice(0, 19).replace("T", " ") : "-",
        r.estado,
        r.estacion || "-",
        r.cabina || "-"
      ])
    };

    await doc.table(table, {
      prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
      prepareRow: (row, i) => doc.font("Helvetica").fontSize(9)
    });

    doc.end();
  } catch (error) {
    console.error("Error en reporte de mantenimientos PDF:", error.sqlMessage || error);
    res.status(500).json({ message: "Error al generar PDF de mantenimientos" });
  }
};

// 1. Estado operativo en tiempo real
exports.estadoOperativo = async (req, res) => {
  try {
    const [estaciones] = await db.query("SELECT id_estacion, nombre, estado FROM estaciones");
    const [cabinas] = await db.query("SELECT id_cabina, codigo, estado FROM cabinas");
    res.json({ estaciones, cabinas });
  } catch (error) {
    console.error("Error en estado operativo:", error);
    res.status(500).json({ message: "Error al obtener estado operativo" });
  }
};

// 2. Flujo por rango horario
exports.reporteFlujo = async (req, res) => {
  let { fecha_inicio, fecha_fin } = req.query;

  // Convertir formato ISO (2026-03-01T19:07) a MySQL (YYYY-MM-DD HH:mm:ss)
  if (fecha_inicio.includes("T")) fecha_inicio = fecha_inicio.replace("T", " ") + ":00";
  if (fecha_fin.includes("T")) fecha_fin = fecha_fin.replace("T", " ") + ":00";

  try {
    const [rows] = await db.query(`
      SELECT e.nombre AS estacion,
             f.tipo,
             SUM(f.cantidad) AS total_pasajeros
      FROM flujo_pasajeros f
      JOIN estaciones e ON f.id_estacion = e.id_estacion
      WHERE f.fecha BETWEEN ? AND ?
      GROUP BY e.id_estacion, f.tipo
      ORDER BY e.nombre, f.tipo
    `, [fecha_inicio, fecha_fin]);

    res.json(rows);
  } catch (error) {
    console.error("Error en reporte de flujo:", error);
    res.status(500).json({ message: "Error al obtener reporte de flujo" });
  }
};

// 3. Historial de incidentes
exports.historialIncidentes = async (req, res) => {
  let { fecha_inicio, fecha_fin } = req.query;

  if (fecha_inicio && fecha_inicio.length === 10) fecha_inicio += " 00:00:00";
  if (fecha_fin && fecha_fin.length === 10) fecha_fin += " 23:59:59";

  try {
    const [rows] = await db.query(`
  SELECT i.id_incidente, i.titulo, i.tipo, i.nivel_criticidad,
         i.descripcion, i.estado, i.fecha_reporte,
         e.nombre AS estacion, c.codigo AS cabina,
         CONCAT(p1.nombres, ' ', p1.apellido1, ' ', IFNULL(p1.apellido2, '')) AS reportado_por,
         CONCAT(p2.nombres, ' ', p2.apellido1, ' ', IFNULL(p2.apellido2, '')) AS asignado_a
  FROM incidentes i
  LEFT JOIN estaciones e ON i.id_estacion = e.id_estacion
  LEFT JOIN cabinas c ON i.id_cabina = c.id_cabina
  LEFT JOIN personal p1 ON i.id_reportado_por = p1.id_personal
  LEFT JOIN personal p2 ON i.id_asignado_a = p2.id_personal
  WHERE i.fecha_reporte BETWEEN ? AND ?
  ORDER BY i.fecha_reporte DESC
`, [fecha_inicio, fecha_fin]);

    res.json(rows);
  } catch (error) {
    console.error("Error en historial de incidentes:", error.sqlMessage || error);
    res.status(500).json({ message: "Error al obtener historial de incidentes" });
  }
};

// 4. Mantenimientos vencidos o próximos
exports.reporteMantenimientos = async (req, res) => {
  let { fecha_inicio, fecha_fin } = req.query;

  // Ajustar formato si vienen solo fechas YYYY-MM-DD
  if (fecha_inicio && fecha_inicio.length === 10) fecha_inicio += " 00:00:00";
  if (fecha_fin && fecha_fin.length === 10) fecha_fin += " 23:59:59";

  try {
    const [rows] = await db.query(`
      SELECT m.id_mantenimiento, m.titulo_mantenimiento, m.tipo, m.descripcion,
             m.fecha_programada, m.fecha_realizada, m.estado,
             e.nombre AS estacion, c.codigo AS cabina
      FROM mantenimientos m
      LEFT JOIN estaciones e ON m.id_estacion = e.id_estacion
      LEFT JOIN cabinas c ON m.id_cabina = c.id_cabina
      WHERE m.fecha_programada BETWEEN ? AND ?
      ORDER BY m.fecha_programada ASC
    `, [fecha_inicio, fecha_fin]);

    res.json(rows);
  } catch (error) {
    console.error("Error en reporte de mantenimientos:", error);
    res.status(500).json({ message: "Error al obtener reporte de mantenimientos" });
  }
};