const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log('Token received:', token.substring(0, 20) + '...');
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token decoded:', decoded);
            
            // Get user from token
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                console.log('User not found for token');
                return res.status(401).json({ message: 'User not found' });
            }
            
            console.log('User authenticated:', req.user.email);
            next();
        } catch (error) {
            console.error('Auth error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed', error: error.message });
        }
    } else {
        console.log('No token provided');
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };