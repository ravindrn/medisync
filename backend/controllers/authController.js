const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Hospital = require('../models/Hospital'); 

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'medisync_secret_key', {
        expiresIn: '30d'
    });
};

// @desc    Register user
// @route   POST /api/auth/register
const register = async (req, res) => {
    try {
        const { name, email, password, district, phone, role, ward, wardNumber, hospitalId, hospitalName } = req.body;

        console.log('📝 Registration attempt:', { name, email, district, role: role || 'patient', ward, hospitalName });

        // Validate input
        if (!name || !email || !password || !district) {
            return res.status(400).json({ 
                message: 'Please provide all required fields: name, email, password, district' 
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create user with all fields including nurse-specific ones
        const user = await User.create({
            name,
            email,
            password,
            district,
            phone: phone || '',
            role: role || 'patient',
            ward: ward || '',
            wardNumber: wardNumber || '',
            hospitalId: hospitalId || null,
            hospitalName: hospitalName || ''
        });

        console.log('✅ User created successfully:', { id: user._id, role: user.role, ward: user.ward });

        // Return user data with all fields
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            district: user.district,
            phone: user.phone,
            role: user.role,
            ward: user.ward,
            wardNumber: user.wardNumber,
            hospitalId: user.hospitalId,
            hospitalName: user.hospitalName,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ 
            message: 'Registration failed: ' + error.message,
            error: error.message 
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Login attempt:', email);

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        console.log('✅ User logged in successfully:', { 
            id: user._id, 
            role: user.role,
            ward: user.ward,
            hospitalId: user.hospitalId 
        });

        // IMPORTANT: Return ALL user fields including nurse-specific ones
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            district: user.district,
            phone: user.phone,
            role: user.role,
            ward: user.ward || '',
            wardNumber: user.wardNumber || '',
            hospitalId: user.hospitalId || '',
            hospitalName: user.hospitalName || '',
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ message: 'Login failed: ' + error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Return full user data
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            district: user.district,
            phone: user.phone,
            role: user.role,
            ward: user.ward,
            wardNumber: user.wardNumber,
            hospitalId: user.hospitalId,
            hospitalName: user.hospitalName
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res) => {
    try {
        const { name, phone, district, ward, wardNumber } = req.body;
        const userId = req.user.id;

        console.log('📝 Profile update request:', { userId, name, phone, district, ward });

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user fields
        if (name) user.name = name;
        if (phone) user.phone = phone;
        
        // Only patients and donors can change district
        if (district && (user.role === 'patient' || user.role === 'donor')) {
            user.district = district;
            
            // Update all watchlist items to new district
            if (user.watchlist && user.watchlist.length > 0) {
                user.watchlist.forEach(item => {
                    item.district = district;
                });
                console.log(`Updated ${user.watchlist.length} watchlist items to new district: ${district}`);
            }
        }
        
        // Nurses can update their ward
        if (user.role === 'nurse') {
            if (ward) user.ward = ward;
            if (wardNumber) user.wardNumber = wardNumber;
        }

        await user.save();

        // If user is a manager, update the hospital's phone number too
        if (user.role === 'manager' && phone) {
            const hospital = await Hospital.findOne({ manager: userId });
            if (hospital) {
                hospital.phone = phone;
                await hospital.save();
                console.log(`✅ Updated hospital ${hospital.name} phone to: ${phone}`);
            }
        }

        console.log(`✅ Profile updated for ${user.email}`);
        
        const updatedUser = {
            _id: user._id,
            name: user.name,
            email: user.email,
            district: user.district,
            role: user.role,
            phone: user.phone,
            ward: user.ward,
            wardNumber: user.wardNumber,
            hospitalId: user.hospitalId,
            hospitalName: user.hospitalName
        };

        res.json(updatedUser);
    } catch (error) {
        console.error('❌ Profile update error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Export all functions
module.exports = { 
    register, 
    login, 
    getMe, 
    updateProfile 
};