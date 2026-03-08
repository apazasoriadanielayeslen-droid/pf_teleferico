const pool = require('../config/conexion');

const MAX_ENTRADA_POR_HORA = 4500;

const registrarFlujo = async (req, res) => {
    const { id_estacion, entrantes = 0, salientes = 0 } = req.body;

    if (!id_estacion || isNaN(Number(id_estacion))) {
        return res.status(400).json({ ok: false, message: "id_estacion requerido y numérico" });
    }

    const entradasNum = Number(entrantes);
    const salidasNum = Number(salientes);

    if (entradasNum < 0 || salidasNum < 0) {
        return res.status(400).json({ ok: false, message: "Cantidades no pueden ser negativas" });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [estacionRows] = await conn.execute(
            'SELECT capacidad_maxima FROM estaciones WHERE id_estacion = ?',
            [id_estacion]
        );
        const capacidadEstacion = estacionRows[0]?.capacidad_maxima || 1000;

        const [rows] = await conn.execute(`
            SELECT 
                SUM(CASE WHEN tipo = 'ENTRADA' THEN cantidad ELSE 0 END) AS total_entradas,
                SUM(CASE WHEN tipo = 'SALIDA' THEN cantidad ELSE 0 END) AS total_salidas
            FROM flujo_pasajeros
            WHERE id_estacion = ?
              AND DATE(fecha) = CURDATE()
        `, [id_estacion]);

        const totalEntradas = rows[0]?.total_entradas || 0;
        const totalSalidas  = rows[0]?.total_salidas  || 0;
        const aforoActual   = totalEntradas - totalSalidas;

        const aforoProyectado = aforoActual + entradasNum - salidasNum;

        if (aforoProyectado > capacidadEstacion) {
            await conn.rollback();
            return res.status(400).json({
                ok: false,
                message: `Estación llena. Aforo actual: ${aforoActual} | Proyectado: ${aforoProyectado} (máx. ${capacidadEstacion})`
            });
        }

        if (entradasNum > 10) {
            await conn.rollback();
            return res.status(409).json({
                ok: false,
                isCongestion: true,
                message: "Congestión detectada: más de 10 pasajeros por intervalo",
                attemptedEntrantes: entradasNum,
                maxPermitido: 10
            });
        }

        const [rowsHora] = await conn.execute(`
            SELECT SUM(cantidad) AS entrantesEstaHora
            FROM flujo_pasajeros
            WHERE id_estacion = ?
              AND tipo = 'ENTRADA'
              AND DATE(fecha) = CURDATE()
              AND HOUR(fecha) = HOUR(NOW())
        `, [id_estacion]);

        const entrantesEstaHora = rowsHora[0]?.entrantesEstaHora || 0;
        if (entrantesEstaHora + entradasNum > MAX_ENTRADA_POR_HORA) {
            console.warn(`Throughput horario superado: ${entrantesEstaHora + entradasNum} > ${MAX_ENTRADA_POR_HORA}`);
        }

        if (entradasNum > 0) {
            await conn.execute(
                "INSERT INTO flujo_pasajeros (id_estacion, tipo, cantidad) VALUES (?, 'ENTRADA', ?)",
                [id_estacion, entradasNum]
            );
        }

        if (salidasNum > 0) {
            await conn.execute(
                "INSERT INTO flujo_pasajeros (id_estacion, tipo, cantidad) VALUES (?, 'SALIDA', ?)",
                [id_estacion, salidasNum]
            );
        }

        await conn.commit();

        console.log(`Flujo OK → Estación ${id_estacion} | Entrantes: ${entradasNum} | Salientes: ${salidasNum} | Aforo: ${aforoProyectado}`);

        res.status(201).json({
            ok: true,
            message: "Flujo registrado correctamente",
            aforoActual: aforoProyectado
        });

    } catch (err) {
        await conn.rollback();
        console.error("Error al registrar flujo:", err);
        res.status(500).json({ ok: false, message: "Error interno en el servidor" });
    } finally {
        conn.release();
    }
};

// ---------------------
// CONFIRMAR CONGESTIÓN
// ---------------------
const confirmarCongestion = async (req, res) => {
    const { id_estacion, attemptedEntrantes } = req.body;
    const id_personal = req.user.id;

    if (!id_estacion || attemptedEntrantes == null || !id_personal) {
        return res.status(400).json({ 
            ok: false, 
            message: "Faltan datos requeridos (id_estacion y attemptedEntrantes)" 
        });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Solo incidente – marcado como RESUELTO desde el inicio
        const [incResult] = await conn.execute(`
            INSERT INTO incidentes 
            (titulo, tipo, nivel_criticidad, descripcion, id_estacion, id_reportado_por, estado, fecha_actualizacion)
            VALUES (?, 'OPERATIVO', 'MEDIO', ?, ?, ?, 'RESUELTO', NOW())
        `, [
            `Congestión atendida inmediatamente - Estación ${id_estacion}`,
            `Intento de ingreso de ${attemptedEntrantes} pasajeros (límite 10 por intervalo/cabina). Operador confirmó y atendió en el momento.`,
            id_estacion,
            id_personal
        ]);

        await conn.commit();

        res.json({
            ok: true,
            message: "Congestión registrada como atendida y resuelta",
            id_incidente: incResult.insertId
        });

    } catch (err) {
        await conn.rollback();
        console.error("Error al confirmar congestión:", err);
        res.status(500).json({ ok: false, message: "Error interno al registrar incidente" });
    } finally {
        conn.release();
    }
};

// ---------------------
// IGNORAR CONGESTIÓN
// ---------------------
const ignorarCongestion = async (req, res) => {
    const { id_estacion, attemptedEntrantes } = req.body;
    const id_personal = req.user.id;

    if (!id_estacion || !attemptedEntrantes || !id_personal) {
        return res.status(400).json({ ok: false, message: "Faltan datos requeridos" });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Creamos INCIDENTE
        const [incResult] = await conn.execute(`
            INSERT INTO incidentes 
            (titulo, tipo, nivel_criticidad, descripcion, id_estacion, id_reportado_por, estado)
            VALUES (?, 'OPERATIVO', 'MEDIO', ?, ?, ?, 'ABIERTO')
        `, [
            `Congestión ignorada - Estación ${id_estacion}`,
            `Intento ignorado de ${attemptedEntrantes} pasajeros (límite 10)`,
            id_estacion,
            id_personal
        ]);
        const idIncidente = incResult.insertId;

        // Creamos NOTIFICACIÓN (solo aquí aparece en la campanita)
        const [notifResult] = await conn.execute(`
            INSERT INTO notificaciones 
            (id_personal, titulo, mensaje, tipo, estado, leido, id_incidente)
            VALUES (?, ?, ?, 'CONGESTION', 'PENDIENTE', FALSE, ?)
        `, [
            id_personal,
            "Congestión ignorada",
            `Estación ${id_estacion}: intento de ${attemptedEntrantes} pasajeros ignorado (revisar)`,
            idIncidente
        ]);

        await conn.commit();

        res.json({
            ok: true,
            message: "Congestión registrada como ignorada",
            id_incidente: idIncidente,
            id_notificacion: notifResult.insertId,
            estacion: id_estacion,              // para mostrar en frontend
            attemptedEntrantes
        });

    } catch (err) {
        await conn.rollback();
        console.error("Error al ignorar congestión:", err);
        res.status(500).json({ ok: false, message: "Error al registrar ignorada" });
    } finally {
        conn.release();
    }
};
const solucionarNotificacion = async (req, res) => {
    const { id_notificacion, id_incidente } = req.body;

    if (!id_notificacion || !id_incidente) {
        return res.status(400).json({ ok: false, message: "Faltan id_notificacion o id_incidente" });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.execute(
            `UPDATE incidentes 
             SET estado = 'RESUELTO', fecha_actualizacion = NOW() 
             WHERE id_incidente = ?`,
            [id_incidente]
        );

        await conn.execute(
            `UPDATE notificaciones 
             SET estado = 'RECIBIDO', leido = TRUE 
             WHERE id_notificacion = ?`,
            [id_notificacion]
        );

        await conn.commit();

        res.json({ ok: true, message: "Notificación e incidente solucionados correctamente" });
    } catch (err) {
        await conn.rollback();
        console.error("Error al solucionar:", err);
        res.status(500).json({ ok: false, message: "Error al actualizar en BD" });
    } finally {
        conn.release();
    }
};

const getFlujoHoy = async (req, res) => {
    const { id_estacion } = req.query;
    if (!id_estacion || isNaN(Number(id_estacion))) {
        return res.status(400).json({ ok: false, message: "id_estacion requerido" });
    }

    const conn = await pool.getConnection();
    try {
        const [rows] = await conn.execute(`
            SELECT 
                HOUR(fecha) AS hora,
                SUM(CASE WHEN tipo = 'ENTRADA' THEN cantidad ELSE 0 END) AS entrantes,
                SUM(CASE WHEN tipo = 'SALIDA' THEN cantidad ELSE 0 END) AS salientes
            FROM flujo_pasajeros
            WHERE id_estacion = ? 
              AND DATE(fecha) = CURDATE()
              AND HOUR(fecha) BETWEEN 0 AND 23          -- ← HORARIO OPERATIVO
            GROUP BY HOUR(fecha)
            ORDER BY hora ASC
        `, [id_estacion]);

        res.status(200).json(rows);
    } catch (err) {
        console.error("Error getFlujoHoy:", err);
        res.status(500).json({ ok: false, message: "Error al consultar" });
    } finally {
        conn.release();
    }
};

const getFlujoAyer = async (req, res) => {
    const { id_estacion } = req.query;
    if (!id_estacion || isNaN(Number(id_estacion))) {
        return res.status(400).json({ ok: false, message: "id_estacion requerido" });
    }

    const conn = await pool.getConnection();
    try {
        const [rows] = await conn.execute(`
            SELECT 
                HOUR(fecha) AS hora,
                SUM(CASE WHEN tipo = 'ENTRADA' THEN cantidad ELSE 0 END) AS entrantes,
                SUM(CASE WHEN tipo = 'SALIDA' THEN cantidad ELSE 0 END) AS salientes
            FROM flujo_pasajeros
            WHERE id_estacion = ? 
              AND DATE(fecha) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
            GROUP BY HOUR(fecha)
            ORDER BY hora ASC
        `, [id_estacion]);

        res.status(200).json(rows);
    } catch (err) {
        console.error("Error getFlujoAyer:", err);
        res.status(500).json({ ok: false, message: "Error al consultar" });
    } finally {
        conn.release();
    }
};


const getNotificacionesIgnoradas = async (req, res) => {
    const id_personal = req.user.id;
    const { estacion } = req.query; // ← recibe estación seleccionada

    const conn = await pool.getConnection();
    try {
        let query = `
            SELECT 
                n.id_notificacion, 
                n.id_incidente,
                n.titulo, 
                n.mensaje, 
                n.fecha, 
                n.estado, 
                e.nombre AS estacion
            FROM notificaciones n
            LEFT JOIN incidentes i ON n.id_incidente = i.id_incidente
            LEFT JOIN estaciones e ON i.id_estacion = e.id_estacion
            WHERE n.id_personal = ? 
              AND n.tipo = 'CONGESTION' 
              AND n.leido = FALSE
              AND n.estado = 'PENDIENTE'
        `;
        const params = [id_personal];

        // FIX: Si viene estación específica, filtrar solo por esa
        if (estacion && !isNaN(Number(estacion))) {
            query += ` AND i.id_estacion = ?`;
            params.push(Number(estacion));
        }

        query += ` ORDER BY n.fecha DESC`;

        const [rows] = await conn.execute(query, params);
        res.json(rows);
    } catch (err) {
        console.error("Error al obtener notificaciones ignoradas:", err);
        res.status(500).json({ ok: false, message: "Error al consultar notificaciones" });
    } finally {
        conn.release();
    }
};
module.exports = {
    registrarFlujo,
    confirmarCongestion,
    ignorarCongestion,
    solucionarNotificacion,
    getFlujoHoy,
    getFlujoAyer,
    getNotificacionesIgnoradas  // ← nueva exportación
};