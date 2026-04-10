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

// =====================
// CORS: Allow frontend
// =====================
app.use(cors({
    origin: [
        'http://localhost:5173',      // local dev
        'http://localhost:3000',      // local dev (if used)
        'https://medisync-chi-henna.vercel.app' // Vercel frontend URL
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// =====================
// Routes
// =====================
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/ministry', ministryRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/nurse', nurseRoutes);
app.use('/api/stock-arrivals', stockArrivalRoutes);

// Test route
app.get('/api/test', (req, res) => res.json({ message: 'Backend is working!' }));
app.get('/', (req, res) => res.json({ message: 'MediSync API is running' }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: `Route ${req.originalUrl} not found` }));

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// =====================
// MongoDB Connection
// =====================
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('⚠️  Starting server without MongoDB - some features may not work');
});

// =====================
// Start Server
// =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API URL: ${process.env.NODE_ENV === 'production' ? 'https://medisync-dlje.onrender.com' : `http://localhost:${PORT}`}`);
    console.log(`🔗 Auth routes: ${process.env.NODE_ENV === 'production' ? 'https://medisync-dlje.onrender.com/api/auth' : `http://localhost:${PORT}/api/auth`}`);
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log(`📧 Email service configured: ${process.env.EMAIL_USER}`);
    } else {
        console.log('⚠️  Email service not configured - notifications will not be sent');
    }
});
