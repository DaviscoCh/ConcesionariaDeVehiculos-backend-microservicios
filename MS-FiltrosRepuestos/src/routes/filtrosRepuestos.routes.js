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
//  GET - Filtrar repuestos
// =========================
router.get('/repuestos/filtros', async (req, res) => {
    try {
        const {
            categoria,
            precio_min,
            precio_max,
            estado,          // 'disponible', 'agotado'
            marca,
            modelo,
            stock_min,
            buscar           // Búsqueda por nombre o descripción
        } = req.query;

        // Query base
        let query = `
            SELECT 
                id_repuesto,
                nombre,
                descripcion,
                precio,
                stock,
                imagen_url,
                categoria,
                estado,
                fecha_ingreso,
                marcas_compatibles,
                modelos_compatibles,
                created_at
            FROM repuestos
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
            query += ` AND precio >= $${paramCount}`;
            params.push(parseFloat(precio_min));
            paramCount++;
        }

        // Filtro por precio máximo
        if (precio_max) {
            query += ` AND precio <= $${paramCount}`;
            params.push(parseFloat(precio_max));
            paramCount++;
        }

        // Filtro por estado
        if (estado) {
            query += ` AND estado = $${paramCount}`;
            params.push(estado);
            paramCount++;
        }

        // Filtro por marca compatible (usando LIKE para buscar en el array/texto)
        if (marca) {
            query += ` AND (marcas_compatibles ILIKE $${paramCount} OR marcas_compatibles = 'todas')`;
            params.push(`%${marca}%`);
            paramCount++;
        }

        // Filtro por modelo compatible
        if (modelo) {
            query += ` AND (modelos_compatibles ILIKE $${paramCount} OR modelos_compatibles = 'todos')`;
            params.push(`%${modelo}%`);
            paramCount++;
        }

        // Filtro por stock mínimo
        if (stock_min) {
            query += ` AND stock >= $${paramCount}`;
            params.push(parseInt(stock_min));
            paramCount++;
        }

        // Búsqueda por nombre o descripción
        if (buscar) {
            query += ` AND (nombre ILIKE $${paramCount} OR descripcion ILIKE $${paramCount})`;
            params.push(`%${buscar}%`);
            paramCount++;
        }

        // Ordenar por fecha más reciente
        query += ` ORDER BY fecha_ingreso DESC`;

        const result = await db.query(query, params);

        res.json({
            success: true,
            total: result.rows.length,
            repuestos: result.rows
        });

    } catch (error) {
        console.error('Error al filtrar repuestos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al filtrar repuestos',
            message: error.message
        });
    }
});

// =========================
//  GET - Estadísticas de repuestos
// =========================
router.get('/repuestos/estadisticas', async (req, res) => {
    try {
        // Total de repuestos
        const totalQuery = `SELECT COUNT(*) as total FROM repuestos`;
        const totalResult = await db.query(totalQuery);

        // Por categoría
        const categoriasQuery = `
            SELECT 
                categoria,
                COUNT(*) as cantidad,
                SUM(stock) as stock_total
            FROM repuestos
            GROUP BY categoria
            ORDER BY cantidad DESC
        `;
        const categoriasResult = await db.query(categoriasQuery);

        // Por estado
        const estadosQuery = `
            SELECT 
                estado,
                COUNT(*) as cantidad
            FROM repuestos
            GROUP BY estado
        `;
        const estadosResult = await db.query(estadosQuery);

        // Valor total del inventario
        const valorQuery = `
            SELECT 
                SUM(precio * stock) as valor_total,
                AVG(precio) as precio_promedio
            FROM repuestos
        `;
        const valorResult = await db.query(valorQuery);

        // Repuestos con bajo stock (menos de 10)
        const bajoStockQuery = `
            SELECT COUNT(*) as cantidad
            FROM repuestos
            WHERE stock < 10 AND stock > 0
        `;
        const bajoStockResult = await db.query(bajoStockQuery);

        // Repuestos agotados
        const agotadosQuery = `
            SELECT COUNT(*) as cantidad
            FROM repuestos
            WHERE stock = 0
        `;
        const agotadosResult = await db.query(agotadosQuery);

        res.json({
            success: true,
            total: parseInt(totalResult.rows[0].total),
            por_categoria: categoriasResult.rows.map(row => ({
                categoria: row.categoria,
                cantidad: parseInt(row.cantidad),
                stock_total: parseInt(row.stock_total)
            })),
            por_estado: estadosResult.rows.map(row => ({
                estado: row.estado,
                cantidad: parseInt(row.cantidad)
            })),
            valor_total: parseFloat(valorResult.rows[0].valor_total || 0).toFixed(2),
            precio_promedio: parseFloat(valorResult.rows[0].precio_promedio || 0).toFixed(2),
            bajo_stock: parseInt(bajoStockResult.rows[0].cantidad),
            agotados: parseInt(agotadosResult.rows[0].cantidad)
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
//  GET - Repuestos por categoría
// =========================
router.get('/repuestos/por-categoria', async (req, res) => {
    try {
        const query = `
            SELECT 
                categoria,
                COUNT(*) as total_productos,
                SUM(stock) as stock_total,
                MIN(precio) as precio_minimo,
                MAX(precio) as precio_maximo,
                AVG(precio) as precio_promedio
            FROM repuestos
            GROUP BY categoria
            ORDER BY total_productos DESC
        `;

        const result = await db.query(query);

        res.json({
            success: true,
            categorias: result.rows.map(row => ({
                categoria: row.categoria,
                total_productos: parseInt(row.total_productos),
                stock_total: parseInt(row.stock_total),
                precio_minimo: parseFloat(row.precio_minimo).toFixed(2),
                precio_maximo: parseFloat(row.precio_maximo).toFixed(2),
                precio_promedio: parseFloat(row.precio_promedio).toFixed(2)
            }))
        });

    } catch (error) {
        console.error('Error al obtener repuestos por categoría:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener repuestos por categoría',
            message: error.message
        });
    }
});

// =========================
//  GET - Repuestos con bajo stock
// =========================
router.get('/repuestos/bajo-stock', async (req, res) => {
    try {
        const { limite = 10 } = req.query;

        const query = `
            SELECT 
                id_repuesto,
                nombre,
                descripcion,
                precio,
                stock,
                categoria,
                estado
            FROM repuestos
            WHERE stock < $1 AND stock > 0
            ORDER BY stock ASC
        `;

        const result = await db.query(query, [parseInt(limite)]);

        res.json({
            success: true,
            total: result.rows.length,
            repuestos: result.rows
        });

    } catch (error) {
        console.error('Error al obtener repuestos con bajo stock:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener repuestos con bajo stock',
            message: error.message
        });
    }
});

// =========================
//  GET - Opciones de filtro
// =========================
router.get('/repuestos/opciones-filtro', async (req, res) => {
    try {
        // Obtener categorías únicas
        const categoriasQuery = `
            SELECT DISTINCT categoria 
            FROM repuestos 
            WHERE categoria IS NOT NULL
            ORDER BY categoria
        `;
        const categorias = await db.query(categoriasQuery);

        // Obtener estados únicos
        const estadosQuery = `
            SELECT DISTINCT estado 
            FROM repuestos 
            WHERE estado IS NOT NULL
            ORDER BY estado
        `;
        const estados = await db.query(estadosQuery);

        // Obtener rango de precios
        const preciosQuery = `
            SELECT 
                MIN(precio) as precio_min,
                MAX(precio) as precio_max
            FROM repuestos
        `;
        const precios = await db.query(preciosQuery);

        res.json({
            success: true,
            categorias: categorias.rows.map(row => row.categoria),
            estados: estados.rows.map(row => row.estado),
            rango_precios: {
                minimo: parseFloat(precios.rows[0].precio_min || 0).toFixed(2),
                maximo: parseFloat(precios.rows[0].precio_max || 0).toFixed(2)
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