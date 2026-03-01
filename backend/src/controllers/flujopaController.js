const pool = require('../config/conexion');

const MAX_ENTRADA_POR_HORA = 1500;

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

    if (entradasNum === 0 && salidasNum === 0) {
        return res.status(400).json({ ok: false, message: "Debe registrar al menos una entrada o salida" });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Verificar límite por hora
        const [rows] = await conn.execute(`
            SELECT SUM(cantidad) AS total_entrantes
            FROM flujo_pasajeros
            WHERE id_estacion = ?
              AND tipo = 'ENTRADA'
              AND DATE(fecha) = CURDATE()
              AND HOUR(fecha) = HOUR(NOW())
        `, [id_estacion]);

        const entrantesActuales = rows[0]?.total_entrantes || 0;
        const entrantesProyectados = entrantesActuales + entradasNum;

        if (entrantesProyectados > MAX_ENTRADA_POR_HORA) {
            await conn.rollback();
            return res.status(400).json({
                ok: false,
                message: `Límite superado: ${entrantesProyectados} entrantes proyectados en esta hora (máx. ${MAX_ENTRADA_POR_HORA} = 150 cabinas)`
            });
        }

        // Insertar entradas
        if (entradasNum > 0) {
            await conn.execute(
                "INSERT INTO flujo_pasajeros (id_estacion, tipo, cantidad) VALUES (?, 'ENTRADA', ?)",
                [id_estacion, entradasNum]
            );
        }

        // Insertar salidas
        if (salidasNum > 0) {
            await conn.execute(
                "INSERT INTO flujo_pasajeros (id_estacion, tipo, cantidad) VALUES (?, 'SALIDA', ?)",
                [id_estacion, salidasNum]
            );
        }

        await conn.commit();

        res.status(201).json({
            ok: true,
            message: "Flujo registrado correctamente",
            entradas: entradasNum,
            salidas: salidasNum
        });

    } catch (err) {
        await conn.rollback();
        console.error("Error registrar flujo:", err);
        res.status(500).json({ ok: false, message: "Error en la base de datos" });
    } finally {
        conn.release();
    }
};


// Nuevo endpoint para obtener historial de hoy
const getFlujoHoy = async (req, res) => {
    const { id_estacion } = req.query;

    if (!id_estacion || isNaN(Number(id_estacion))) {
        return res.status(400).json({
            ok: false,
            message: "id_estacion es requerido y debe ser un número"
        });
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
            GROUP BY HOUR(fecha)
            ORDER BY hora ASC
        `, [id_estacion]);

        res.status(200).json(rows);

    } catch (err) {
        console.error("Error al obtener flujo de hoy:", err);
        res.status(500).json({
            ok: false,
            message: "Error al consultar la base de datos"
        });
    } finally {
        conn.release();
    }
};

// ... (resto del archivo igual)

// Nuevo endpoint para flujo de ayer (para % vs ayer)
const getFlujoAyer = async (req, res) => {
    const { id_estacion } = req.query;

    if (!id_estacion || isNaN(Number(id_estacion))) {
        return res.status(400).json({
            ok: false,
            message: "id_estacion es requerido y debe ser un número"
        });
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
        console.error("Error al obtener flujo de ayer:", err);
        res.status(500).json({
            ok: false,
            message: "Error al consultar la base de datos"
        });
    } finally {
        conn.release();
    }
};

module.exports = { registrarFlujo, getFlujoHoy, getFlujoAyer };
