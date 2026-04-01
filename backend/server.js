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
const stockArrivalRoutes = require('./routes/stockArrivalRoutes'); // ADD THIS

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (optional but helpful)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/ministry', ministryRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/nurse', nurseRoutes);
app.use('/api/stock-arrivals', stockArrivalRoutes); // ADD THIS

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'MediSync API is running' });
});

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medisync', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Database: medisync');
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('⚠️  Starting server without MongoDB - some features may not work');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API URL: http://localhost:${PORT}`);
    console.log(`🔗 Auth routes: http://localhost:${PORT}/api/auth`);
    console.log(`💊 Medicine routes: http://localhost:${PORT}/api/medicines`);
    console.log(`👑 Admin routes: http://localhost:${PORT}/api/admin`);
    console.log(`📦 Stock arrival routes: http://localhost:${PORT}/api/stock-arrivals`);

    // Log email configuration status
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log(`📧 Email service configured: ${process.env.EMAIL_USER}`);
    } else {
        console.log('⚠️  Email service not configured - notifications will not be sent');
    }
});