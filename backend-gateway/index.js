const express = require('express');
const cors = require('cors');
const proxy = require('express-http-proxy');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// URL del backend original
const BACKEND_URL = process.env. BACKEND_URL || 'http://localhost:4000';

// Redirigir TODO a backend-concesionaria
app.use('/api', proxy(BACKEND_URL, {
    proxyReqPathResolver: (req) => `/api${req.url}`
}));

app.get('/', (req, res) => {
    res.json({
        service: 'Gateway Concesionaria',
        status: 'running',
        backend: BACKEND_URL
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Gateway en http://localhost:${PORT}`);
    console.log(`📡 Backend:  ${BACKEND_URL}`);
});