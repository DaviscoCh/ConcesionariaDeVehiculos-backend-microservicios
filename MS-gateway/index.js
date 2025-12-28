import express from "express";
import morgan from "morgan";
import cors from "cors";
import proxy from "express-http-proxy";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// =============================================
//  PROXY - Microservicio de Filtros de Citas
// =============================================
app.use("/api/filtros-citas", proxy(process.env.FILTROS_CITAS_URL || "http://localhost:3004", {
    proxyReqPathResolver: (req) => `/api${req.url}`
}));

// =============================================
//  PROXY - Microservicio de Filtros de Repuestos
// =============================================
app.use("/api/filtros-repuestos", proxy(process.env.FILTROS_REPUESTOS_URL || "http://localhost:3005", {
    proxyReqPathResolver: (req) => `/api${req.url}`
}));

// =============================================
//  PROXY - Microservicio de Filtros de Servicios
// =============================================
app.use("/api/filtros-servicios", proxy(process.env.FILTROS_SERVICIOS_URL || "http://localhost:3006", {
    proxyReqPathResolver: (req) => `/api${req.url}`
}));

// =============================================
//  PROXY - Backend Principal (si es necesario)
// =============================================
app.use("/api/backend-principal", proxy(process.env.BACKEND_PRINCIPAL_URL || "http://localhost:3000", {
    proxyReqPathResolver: (req) => `/api${req.url}`
}));

// Ruta principal
app.get("/", (req, res) => {
    res.json({
        message: "✅ Gateway funcionando correctamente",
        endpoints: {
            filtros_citas: "/api/filtros-citas/*",
            filtros_repuestos: "/api/filtros-repuestos/*",
            filtros_servicios: "/api/filtros-servicios/*",
            backend_principal: "/api/backend-principal/*"
        },
        microservicios_disponibles: [
            {
                nombre: "Filtros de Citas",
                puerto: 3004,
                url: process.env.FILTROS_CITAS_URL || "http://localhost:3004",
                rutas: [
                    "GET /api/filtros-citas/citas/filtros",
                    "GET /api/filtros-citas/citas/estadisticas",
                    "GET /api/filtros-citas/citas/por-oficina",
                    "GET /api/filtros-citas/citas/opciones-filtro"
                ]
            },
            {
                nombre: "Filtros de Repuestos",
                puerto: 3005,
                url: process.env.FILTROS_REPUESTOS_URL || "http://localhost:3005",
                rutas: [
                    "GET /api/filtros-repuestos/repuestos/filtros",
                    "GET /api/filtros-repuestos/repuestos/estadisticas",
                    "GET /api/filtros-repuestos/repuestos/por-categoria",
                    "GET /api/filtros-repuestos/repuestos/bajo-stock",
                    "GET /api/filtros-repuestos/repuestos/opciones-filtro"
                ]
            },
            {
                nombre: "Filtros de Servicios",
                puerto: 3006,
                url: process.env.FILTROS_SERVICIOS_URL || "http://localhost:3006",
                rutas: [
                    "GET /api/filtros-servicios/servicios/filtros",
                    "GET /api/filtros-servicios/servicios/estadisticas",
                    "GET /api/filtros-servicios/servicios/por-categoria",
                    "GET /api/filtros-servicios/servicios/mas-solicitados",
                    "GET /api/filtros-servicios/servicios/rapidos",
                    "GET /api/filtros-servicios/servicios/opciones-filtro"
                ]
            }
        ]
    });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error("❌ Error en el Gateway:", err.message);
    res.status(500).json({
        error: "Error interno en el Gateway",
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Gateway corriendo en http://localhost:${PORT}`);
    console.log(`📡 Proxy activo para microservicios:`);
    console.log(`   - Filtros Citas: http://localhost:${PORT}/api/filtros-citas`);
    console.log(`   - Filtros Repuestos: http://localhost:${PORT}/api/filtros-repuestos`);
    console.log(`   - Filtros Servicios: http://localhost:${PORT}/api/filtros-servicios`);
    console.log(`   - Backend Principal: http://localhost:${PORT}/api/backend-principal`);
});