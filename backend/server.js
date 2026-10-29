const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const adminRoutes = require('./routes/adminRoutes');
const transferRoutes = require('./routes/transferRoutes');
const ministryRoutes = require('./routes/ministryRoutes');
const donorRoutes = require('./routes/donorRoutes');
const nurseRoutes = require('./routes/nurseRoutes');
const stockArrivalRoutes = require('./routes/stockArrivalRoutes');

const app = express();

// ==================== CORS CONFIGURATION ====================
// Allow local dev + Vercel production and preview deployments
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'https://medisync-chi-henna.vercel.app',
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // Allow any *.vercel.app subdomain (covers all preview deployments)
        const isVercel = /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);

        // Allow any *.onrender.com subdomain (backend self-calls, health checks)
        const isRender = /^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin);

        if (allowedOrigins.includes(origin) || isVercel || isRender) {
            callback(null, true);
        } else {
            console.warn(`⚠️  CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400 // Cache preflight for 24 hours
}));

// Handle preflight requests explicitly
app.options('*', cors());

// ==================== BODY PARSERS ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== REQUEST LOGGING ====================
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// ==================== ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/ministry', ministryRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/nurse', nurseRoutes);
app.use('/api/stock-arrivals', stockArrivalRoutes);

// ==================== HEALTH & TEST ROUTES ====================
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Backend is working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'MediSync API is running',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            medicines: '/api/medicines',
            admin: '/api/admin',
            transfers: '/api/transfers',
            ministry: '/api/ministry',
            donor: '/api/donor',
            nurse: '/api/nurse',
            stockArrivals: '/api/stock-arrivals'
        }
    });
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
    res.status(404).json({
        message: `Route ${req.originalUrl} not found`,
        method: req.method
    });
});

// ==================== GLOBAL ERROR HANDLER ====================
app.use((err, req, res, next) => {
    console.error('❌ Global error:', err);

    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            message: 'CORS error: Origin not allowed',
            origin: req.headers.origin
        });
    }

    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ==================== MONGODB CONNECTION ====================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medisync', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Starting server without MongoDB - some features may not work');
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // IMPORTANT for Render deployment

app.listen(PORT, HOST, () => {
    console.log('========================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS allowed origins:`);
    allowedOrigins.forEach(o => console.log(`   ✓ ${o}`));
    console.log(`   ✓ *.vercel.app (all previews)`);
    console.log(`   ✓ *.onrender.com`);
    console.log('========================================');

    // Log email configuration status
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log(`📧 Email service configured: ${process.env.EMAIL_USER}`);
    } else {
        console.log('⚠️  Email service not configured - notifications will not be sent');
    }

    // Log MongoDB status
    if (mongoose.connection.readyState === 1) {
        console.log('✅ MongoDB is connected');
    } else {
        console.log('⚠️  MongoDB connection pending or failed');
    }
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});