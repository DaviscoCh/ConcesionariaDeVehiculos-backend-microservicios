const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
require('dotenv').config();

// Conexión a Supabase usando el connection string del .env
const db = new Pool({
    connectionString: process.env.PG_CONNECTION_STRING,
    ssl: {
        rejectUnauthorized: false // Necesario para Supabase
    }
});

// =========================
//  GET - Filtrar citas
// =========================
router.get('/citas/filtros', async (req, res) => {
    try {
        const {
            estado,           // 'pendiente', 'confirmada', 'cancelada', 'completada'
            fecha_inicio,     // Formato: 'YYYY-MM-DD'
            fecha_fin,        // Formato: 'YYYY-MM-DD'
            id_oficina,
            id_usuario,
            id_vehiculo
        } = req.query;

        // Query base
        let query = `
            SELECT 
                c.id_cita,
                c.id_usuario,
                c.id_oficina,
                c.id_vehiculo,
                c.fecha,
                c.hora,
                c.estado,
                c.comentario,
                c.fecha_creacion,
                o.nombre as nombre_oficina,
                o.direccion as direccion_oficina,
                p.nombres || ' ' || p.apellidos as nombre_cliente,
                p.correo as correo_cliente,
                p.telefono as telefono_cliente,
                v.tipo as tipo_vehiculo,
                m.nombre as modelo_vehiculo,
                ma.nombre as marca_vehiculo
            FROM citas c
            LEFT JOIN oficinas o ON c.id_oficina = o.id_oficina
            LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
            LEFT JOIN persona p ON u.id_persona = p.id_persona
            LEFT JOIN vehiculos v ON c.id_vehiculo = v.id_vehiculo
            LEFT JOIN modelos m ON v.id_modelo = m.id_modelo
            LEFT JOIN marcas ma ON m.id_marca = ma.id_marca
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        // Filtro por estado
        if (estado) {
            query += ` AND c.estado = $${paramCount}`;
            params.push(estado);
            paramCount++;
        }

        // Filtro por rango de fechas
        if (fecha_inicio) {
            query += ` AND c.fecha >= $${paramCount}`;
            params.push(fecha_inicio);
            paramCount++;
        }

        if (fecha_fin) {
            query += ` AND c.fecha <= $${paramCount}`;
            params.push(fecha_fin);
            paramCount++;
        }

        // Filtro por oficina
        if (id_oficina) {
            query += ` AND c.id_oficina = $${paramCount}`;
            params.push(id_oficina);
            paramCount++;
        }

        // Filtro por usuario
        if (id_usuario) {
            query += ` AND c.id_usuario = $${paramCount}`;
            params.push(id_usuario);
            paramCount++;
        }

        // Filtro por vehículo
        if (id_vehiculo) {
            query += ` AND c.id_vehiculo = $${paramCount}`;
            params.push(id_vehiculo);
            paramCount++;
        }

        // Ordenar por fecha más reciente
        query += ` ORDER BY c.fecha DESC, c.hora DESC`;

        const result = await db.query(query, params);

        res.json({
            success: true,
            total: result.rows.length,
            citas: result.rows
        });

    } catch (error) {
        console.error('Error al filtrar citas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al filtrar citas',
            message: error.message
        });
    }
});

// =========================
//  GET - Estadísticas de citas
// =========================
router.get('/citas/estadisticas', async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        let whereClause = '';
        const params = [];

        if (fecha_inicio && fecha_fin) {
            whereClause = 'WHERE fecha BETWEEN $1 AND $2';
            params.push(fecha_inicio, fecha_fin);
        }

        const query = `
            SELECT 
                estado,
                COUNT(*) as cantidad
            FROM citas
            ${whereClause}
            GROUP BY estado
        `;

        const result = await db.query(query, params);

        // Resumen total
        const totalQuery = `
            SELECT COUNT(*) as total
            FROM citas
            ${whereClause}
        `;
        const totalResult = await db.query(totalQuery, params);

        res.json({
            success: true,
            total: parseInt(totalResult.rows[0].total),
            por_estado: result.rows.map(row => ({
                estado: row.estado,
                cantidad: parseInt(row.cantidad)
            }))
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas',
            message: error.message
        });
    }
});

// =========================
//  GET - Citas por oficina
// =========================
router.get('/citas/por-oficina', async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        let whereClause = '';
        const params = [];

        if (fecha_inicio && fecha_fin) {
            whereClause = 'WHERE c.fecha BETWEEN $1 AND $2';
            params.push(fecha_inicio, fecha_fin);
        }

        const query = `
            SELECT 
                o.id_oficina,
                o.nombre as nombre_oficina,
                o.direccion,
                COUNT(c.id_cita) as total_citas,
                COUNT(CASE WHEN c.estado = 'completada' THEN 1 END) as completadas,
                COUNT(CASE WHEN c.estado = 'pendiente' THEN 1 END) as pendientes,
                COUNT(CASE WHEN c.estado = 'confirmada' THEN 1 END) as confirmadas,
                COUNT(CASE WHEN c.estado = 'cancelada' THEN 1 END) as canceladas
            FROM oficinas o
            LEFT JOIN citas c ON o.id_oficina = c.id_oficina
            ${whereClause}
            GROUP BY o.id_oficina, o.nombre, o.direccion
            ORDER BY total_citas DESC
        `;

        const result = await db.query(query, params);

        res.json({
            success: true,
            oficinas: result.rows.map(row => ({
                id_oficina: row.id_oficina,
                nombre_oficina: row.nombre_oficina,
                direccion: row.direccion,
                total_citas: parseInt(row.total_citas),
                completadas: parseInt(row.completadas),
                pendientes: parseInt(row.pendientes),
                confirmadas: parseInt(row.confirmadas),
                canceladas: parseInt(row.canceladas)
            }))
        });

    } catch (error) {
        console.error('Error al obtener citas por oficina:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener citas por oficina',
            message: error.message
        });
    }
});

// =========================
//  GET - Opciones de filtro
// =========================
router.get('/citas/opciones-filtro', async (req, res) => {
    try {
        // Obtener todas las oficinas
        const oficinasQuery = `
            SELECT id_oficina, nombre, direccion 
            FROM oficinas 
            ORDER BY nombre
        `;
        const oficinas = await db.query(oficinasQuery);

        // Obtener estados únicos de citas
        const estadosQuery = `
            SELECT DISTINCT estado 
            FROM citas 
            WHERE estado IS NOT NULL
            ORDER BY estado
        `;
        const estados = await db.query(estadosQuery);

        res.json({
            success: true,
            oficinas: oficinas.rows,
            estados: estados.rows.map(row => row.estado)
        });

    } catch (error) {
        console.error('Error al obtener opciones de filtro:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener opciones de filtro',
            message: error.message
        });
    }
});

module.exports = router;