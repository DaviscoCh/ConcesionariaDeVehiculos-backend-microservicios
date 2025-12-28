const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Importar rutas
const filtrosServiciosRoutes = require('./src/routes/filtrosServicios.routes');
app.use('/api', filtrosServiciosRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        message: '✅ Microservicio de Filtros de Servicios funcionando',
        endpoints: [
            'GET /api/servicios/filtros - Filtrar servicios con múltiples criterios',
            'GET /api/servicios/estadisticas - Obtener estadísticas de servicios',
            'GET /api/servicios/por-categoria - Obtener servicios agrupados por categoría',
            'GET /api/servicios/mas-solicitados - Obtener servicios más solicitados',
            'GET /api/servicios/rapidos - Obtener servicios rápidos',
            'GET /api/servicios/opciones-filtro - Obtener opciones disponibles para filtros'
        ]
    });
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    console.log(`⚙️ Backend de Filtros de Servicios corriendo en http://localhost:${PORT}`);
});