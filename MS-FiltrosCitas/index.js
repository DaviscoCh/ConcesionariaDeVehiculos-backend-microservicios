const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Importar rutas
const filtrosCitasRoutes = require('./src/routes/filtrosCitas.routes');
app.use('/api', filtrosCitasRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        message: '✅ Microservicio de Filtros de Citas funcionando',
        endpoints: [
            'GET /api/citas/filtros - Filtrar citas con múltiples criterios',
            'GET /api/citas/estadisticas - Obtener estadísticas de citas',
            'GET /api/citas/por-oficina - Obtener citas agrupadas por oficina',
            'GET /api/citas/opciones-filtro - Obtener opciones disponibles para filtros'
        ]
    });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
    console.log(`🔍 Backend de Filtros de Citas corriendo en http://localhost:${PORT}`);
});