const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const app = express();

// Configuración COMPLETA de CORS
const corsOptions = {
    origin: [
        'http://localhost:5500',      // Live Server
        'http://127.0.0.1:5500',      // Live Server alternativo
        'http://localhost:3000',       // Backend
        'http://localhost:8000',       // Python server
        'http://127.0.0.1:8000',       // Python server alternativo
        'null'                         // Archivos locales (con precaución)
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Authorization'],
    maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));

// Middleware para manejar preflight (OPTIONS)
app.options('*', cors(corsOptions));

// Más middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar a MongoDB
const connectDB = require("./config/db");
connectDB();

// Rutas
app.use("/api/auth", require("./routes/auth"));
app.use("/api/children", require("./routes/childRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/password", require("./routes/passwordRoutes"));


// Ruta de prueba
app.get("/", (req, res) => {
    res.json({ 
        status: "online",
        message: "Servidor CAPUN funcionando ✔",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        cors: "Configurado"
    });
});

// Ruta de salud
app.get("/health", (req, res) => {
    res.json({ 
        status: "healthy",
        database: "connected",
        cors: "enabled",
        timestamp: new Date().toISOString()
    });
});

// Ruta específica para probar CORS
app.get("/api/test-cors", (req, res) => {
    res.json({
        message: "✅ CORS funciona correctamente",
        origin: req.headers.origin || "No origin header",
        method: req.method
    });
});

// Manejo de errores 404
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.url}`
    });
});

// Manejo de errores general
app.use((err, req, res, next) => {
    console.error('🔥 Error del servidor:', err);
    
    res.status(err.status || 500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor CAPUN iniciado en puerto ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 CORS configurado para: localhost:* y null`);
});