const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
require('dotenv').config();

// Conexión a Supabase usando el connection string del .env
const db = new Pool({
    connectionString: process.env.PG_CONNECTION_STRING,
    ssl: {
        rejectUnauthorized: false
    }
});

// =========================
//  GET - Filtrar servicios
// =========================
router.get('/servicios/filtros', async (req, res) => {
    try {
        const {
            categoria,
            precio_min,
            precio_max,
            estado,                 // 'activo', 'inactivo'
            requiere_repuestos,     // 'true', 'false'
            tiempo_max,             // Tiempo máximo en minutos
            buscar                  // Búsqueda por nombre o descripción
        } = req.query;

        // Query base
        let query = `
            SELECT 
                id_servicio,
                nombre,
                descripcion,
                categoria,
                precio_mano_obra,
                tiempo_estimado,
                requiere_repuestos,
                estado,
                imagen_url,
                created_at
            FROM servicios_mantenimiento
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        // Filtro por categoría
        if (categoria) {
            query += ` AND categoria = $${paramCount}`;
            params.push(categoria);
            paramCount++;
        }

        // Filtro por precio mínimo
        if (precio_min) {
            query += ` AND precio_mano_obra >= $${paramCount}`;
            params.push(parseFloat(precio_min));
            paramCount++;
        }

        // Filtro por precio máximo
        if (precio_max) {
            query += ` AND precio_mano_obra <= $${paramCount}`;
            params.push(parseFloat(precio_max));
            paramCount++;
        }

        // Filtro por estado
        if (estado) {
            query += ` AND estado = $${paramCount}`;
            params.push(estado);
            paramCount++;
        }

        // Filtro por requiere repuestos
        if (requiere_repuestos) {
            const requiere = requiere_repuestos === 'true';
            query += ` AND requiere_repuestos = $${paramCount}`;
            params.push(requiere);
            paramCount++;
        }

        // Filtro por tiempo máximo
        if (tiempo_max) {
            query += ` AND tiempo_estimado <= $${paramCount}`;
            params.push(parseInt(tiempo_max));
            paramCount++;
        }

        // Búsqueda por nombre o descripción
        if (buscar) {
            query += ` AND (nombre ILIKE $${paramCount} OR descripcion ILIKE $${paramCount})`;
            params.push(`%${buscar}%`);
            paramCount++;
        }

        // Ordenar por categoría y nombre
        query += ` ORDER BY categoria, nombre`;

        const result = await db.query(query, params);

        res.json({
            success: true,
            total: result.rows.length,
            servicios: result.rows
        });

    } catch (error) {
        console.error('Error al filtrar servicios:', error);
        res.status(500).json({
            success: false,
            error: 'Error al filtrar servicios',
            message: error.message
        });
    }
});

// =========================
//  GET - Estadísticas de servicios
// =========================
router.get('/servicios/estadisticas', async (req, res) => {
    try {
        // Total de servicios
        const totalQuery = `SELECT COUNT(*) as total FROM servicios_mantenimiento`;
        const totalResult = await db.query(totalQuery);

        // Por categoría
        const categoriasQuery = `
            SELECT 
                categoria,
                COUNT(*) as cantidad,
                AVG(precio_mano_obra) as precio_promedio,
                AVG(tiempo_estimado) as tiempo_promedio
            FROM servicios_mantenimiento
            GROUP BY categoria
            ORDER BY cantidad DESC
        `;
        const categoriasResult = await db.query(categoriasQuery);

        // Por estado
        const estadosQuery = `
            SELECT 
                estado,
                COUNT(*) as cantidad
            FROM servicios_mantenimiento
            GROUP BY estado
        `;
        const estadosResult = await db.query(estadosQuery);

        // Servicios que requieren repuestos
        const requierenQuery = `
            SELECT 
                COUNT(*) as con_repuestos
            FROM servicios_mantenimiento
            WHERE requiere_repuestos = true
        `;
        const requierenResult = await db.query(requierenQuery);

        // Promedios generales
        const promediosQuery = `
            SELECT 
                AVG(precio_mano_obra) as precio_promedio,
                AVG(tiempo_estimado) as tiempo_promedio,
                MIN(precio_mano_obra) as precio_minimo,
                MAX(precio_mano_obra) as precio_maximo
            FROM servicios_mantenimiento
        `;
        const promediosResult = await db.query(promediosQuery);

        res.json({
            success: true,
            total: parseInt(totalResult.rows[0].total),
            por_categoria: categoriasResult.rows.map(row => ({
                categoria: row.categoria,
                cantidad: parseInt(row.cantidad),
                precio_promedio: parseFloat(row.precio_promedio || 0).toFixed(2),
                tiempo_promedio: parseFloat(row.tiempo_promedio || 0).toFixed(0)
            })),
            por_estado: estadosResult.rows.map(row => ({
                estado: row.estado,
                cantidad: parseInt(row.cantidad)
            })),
            con_repuestos: parseInt(requierenResult.rows[0].con_repuestos),
            sin_repuestos: parseInt(totalResult.rows[0].total) - parseInt(requierenResult.rows[0].con_repuestos),
            precio_promedio: parseFloat(promediosResult.rows[0].precio_promedio || 0).toFixed(2),
            precio_minimo: parseFloat(promediosResult.rows[0].precio_minimo || 0).toFixed(2),
            precio_maximo: parseFloat(promediosResult.rows[0].precio_maximo || 0).toFixed(2),
            tiempo_promedio: parseFloat(promediosResult.rows[0].tiempo_promedio || 0).toFixed(0)
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
//  GET - Servicios por categoría
// =========================
router.get('/servicios/por-categoria', async (req, res) => {
    try {
        const query = `
            SELECT 
                categoria,
                COUNT(*) as total_servicios,
                AVG(precio_mano_obra) as precio_promedio,
                MIN(precio_mano_obra) as precio_minimo,
                MAX(precio_mano_obra) as precio_maximo,
                AVG(tiempo_estimado) as tiempo_promedio,
                COUNT(CASE WHEN requiere_repuestos = true THEN 1 END) as con_repuestos
            FROM servicios_mantenimiento
            GROUP BY categoria
            ORDER BY total_servicios DESC
        `;

        const result = await db.query(query);

        res.json({
            success: true,
            categorias: result.rows.map(row => ({
                categoria: row.categoria,
                total_servicios: parseInt(row.total_servicios),
                precio_promedio: parseFloat(row.precio_promedio).toFixed(2),
                precio_minimo: parseFloat(row.precio_minimo).toFixed(2),
                precio_maximo: parseFloat(row.precio_maximo).toFixed(2),
                tiempo_promedio: parseFloat(row.tiempo_promedio).toFixed(0),
                con_repuestos: parseInt(row.con_repuestos)
            }))
        });

    } catch (error) {
        console.error('Error al obtener servicios por categoría:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener servicios por categoría',
            message: error.message
        });
    }
});

// =========================
//  GET - Servicios más solicitados (usando órdenes de servicio)
// =========================
router.get('/servicios/mas-solicitados', async (req, res) => {
    try {
        const { limite = 10 } = req.query;

        const query = `
            SELECT 
                s.id_servicio,
                s.nombre,
                s.descripcion,
                s.categoria,
                s.precio_mano_obra,
                s.tiempo_estimado,
                COUNT(osd.id_detalle) as veces_solicitado
            FROM servicios_mantenimiento s
            LEFT JOIN ordenes_servicio_detalle osd 
                ON s.id_servicio = osd.id_servicio AND osd.tipo_item = 'servicio'
            GROUP BY s.id_servicio, s.nombre, s.descripcion, s.categoria, s.precio_mano_obra, s.tiempo_estimado
            HAVING COUNT(osd.id_detalle) > 0
            ORDER BY veces_solicitado DESC
            LIMIT $1
        `;

        const result = await db.query(query, [parseInt(limite)]);

        res.json({
            success: true,
            total: result.rows.length,
            servicios: result.rows.map(row => ({
                ...row,
                veces_solicitado: parseInt(row.veces_solicitado)
            }))
        });

    } catch (error) {
        console.error('Error al obtener servicios más solicitados:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener servicios más solicitados',
            message: error.message
        });
    }
});

// =========================
//  GET - Servicios rápidos (menos de X minutos)
// =========================
router.get('/servicios/rapidos', async (req, res) => {
    try {
        const { tiempo_max = 60 } = req.query;

        const query = `
            SELECT 
                id_servicio,
                nombre,
                descripcion,
                categoria,
                precio_mano_obra,
                tiempo_estimado,
                requiere_repuestos,
                estado
            FROM servicios_mantenimiento
            WHERE tiempo_estimado <= $1 AND estado = 'activo'
            ORDER BY tiempo_estimado ASC
        `;

        const result = await db.query(query, [parseInt(tiempo_max)]);

        res.json({
            success: true,
            total: result.rows.length,
            servicios: result.rows
        });

    } catch (error) {
        console.error('Error al obtener servicios rápidos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener servicios rápidos',
            message: error.message
        });
    }
});

// =========================
//  GET - Opciones de filtro
// =========================
router.get('/servicios/opciones-filtro', async (req, res) => {
    try {
        // Obtener categorías únicas
        const categoriasQuery = `
            SELECT DISTINCT categoria 
            FROM servicios_mantenimiento 
            WHERE categoria IS NOT NULL
            ORDER BY categoria
        `;
        const categorias = await db.query(categoriasQuery);

        // Obtener estados únicos
        const estadosQuery = `
            SELECT DISTINCT estado 
            FROM servicios_mantenimiento 
            WHERE estado IS NOT NULL
            ORDER BY estado
        `;
        const estados = await db.query(estadosQuery);

        // Obtener rango de precios
        const preciosQuery = `
            SELECT 
                MIN(precio_mano_obra) as precio_min,
                MAX(precio_mano_obra) as precio_max
            FROM servicios_mantenimiento
        `;
        const precios = await db.query(preciosQuery);

        // Obtener rango de tiempos
        const tiemposQuery = `
            SELECT 
                MIN(tiempo_estimado) as tiempo_min,
                MAX(tiempo_estimado) as tiempo_max
            FROM servicios_mantenimiento
        `;
        const tiempos = await db.query(tiemposQuery);

        res.json({
            success: true,
            categorias: categorias.rows.map(row => row.categoria),
            estados: estados.rows.map(row => row.estado),
            rango_precios: {
                minimo: parseFloat(precios.rows[0].precio_min || 0).toFixed(2),
                maximo: parseFloat(precios.rows[0].precio_max || 0).toFixed(2)
            },
            rango_tiempos: {
                minimo: parseInt(tiempos.rows[0].tiempo_min || 0),
                maximo: parseInt(tiempos.rows[0].tiempo_max || 0)
            }
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