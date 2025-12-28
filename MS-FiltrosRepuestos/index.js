const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Importar rutas
const filtrosRepuestosRoutes = require('./src/routes/filtrosRepuestos.routes');
app.use('/api', filtrosRepuestosRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        message: '✅ Microservicio de Filtros de Repuestos funcionando',
        endpoints: [
            'GET /api/repuestos/filtros - Filtrar repuestos con múltiples criterios',
            'GET /api/repuestos/estadisticas - Obtener estadísticas de repuestos',
            'GET /api/repuestos/por-categoria - Obtener repuestos agrupados por categoría',
            'GET /api/repuestos/bajo-stock - Obtener repuestos con bajo stock',
            'GET /api/repuestos/opciones-filtro - Obtener opciones disponibles para filtros'
        ]
    });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`🔧 Backend de Filtros de Repuestos corriendo en http://localhost:${PORT}`);
});