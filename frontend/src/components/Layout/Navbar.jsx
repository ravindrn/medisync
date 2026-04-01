import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [currentUser, setCurrentUser] = useState(user);

    // Update currentUser when user changes
    useEffect(() => {
        console.log('Navbar - User changed:', user);
        setCurrentUser(user);
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsMenuOpen(false);
    };

    // Helper function to get role-specific dashboard link
    const getDashboardLink = () => {
        if (!currentUser) return null;
        console.log('Getting dashboard link for role:', currentUser.role);
        switch (currentUser.role) {
            case 'admin':
                return { path: '/admin', label: 'Admin Dashboard', icon: '👑' };
            case 'manager':
                return { path: '/manager', label: 'Manager Dashboard', icon: '🏥' };
            case 'ministry_officer':
                return { path: '/ministry', label: 'Ministry Dashboard', icon: '🏛️' };
            case 'donor':
                return { path: '/donor', label: 'Donor Dashboard', icon: '❤️' };
            case 'nurse':
                return { path: '/nurse', label: 'Nurse Dashboard', icon: '🩺' };
            default:
                return null;
        }
    };

    // Helper function to get role-specific profile link
    const getProfileLink = () => {
        return { path: '/profile', label: 'Profile', icon: '👤' };
    };

    const dashboardLink = getDashboardLink();
    const profileLink = getProfileLink();

    // Get role badge color
    const getRoleBadgeClass = () => {
        if (!currentUser) return 'bg-blue-700';
        switch (currentUser.role) {
            case 'admin':
                return 'bg-red-600';
            case 'manager':
                return 'bg-orange-600';
            case 'ministry_officer':
                return 'bg-purple-600';
            case 'donor':
                return 'bg-green-600';
            case 'nurse':
                return 'bg-teal-600';
            default:
                return 'bg-blue-700';
        }
    };

    // Get role display name
    const getRoleDisplay = () => {
        if (!currentUser) return '';
        switch (currentUser.role) {
            case 'admin':
                return 'Admin';
            case 'manager':
                return 'Manager';
            case 'ministry_officer':
                return 'Ministry Officer';
            case 'donor':
                return 'Donor';
            case 'nurse':
                return 'Nurse';
            default:
                return 'Patient';
        }
    };

    return (
        <nav className="bg-blue-600 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center space-x-2">
                            <span className="text-2xl font-bold">MediSync</span>
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center space-x-4">
                        {/* Search Link */}
                        <Link to="/" className="hover:bg-blue-700 px-3 py-2 rounded-md transition">
                            🔍 Search
                        </Link>

                        {currentUser ? (
                            <>
                                {/* Debug: Show role badge */}
                                <div className="text-xs bg-yellow-500 px-2 py-1 rounded">
                                    Role: {currentUser.role}
                                </div>
                                
                                {/* Welcome message with role badge */}
                                <span className="text-sm">Welcome, {currentUser.name}</span>
                                <span className={`text-sm ${getRoleBadgeClass()} px-2 py-1 rounded`}>
                                    {getRoleDisplay()} • {currentUser.district}
                                </span>

                                {/* Profile Link */}
                                {profileLink && (
                                    <Link
                                        to={profileLink.path}
                                        className="hover:bg-blue-700 px-3 py-2 rounded-md transition flex items-center gap-1"
                                    >
                                        {profileLink.icon} {profileLink.label}
                                    </Link>
                                )}

                                {/* Role-specific Dashboard Link */}
                                {dashboardLink && (
                                    <Link
                                        to={dashboardLink.path}
                                        className="hover:bg-blue-700 px-3 py-2 rounded-md transition flex items-center gap-1"
                                    >
                                        {dashboardLink.icon} {dashboardLink.label}
                                    </Link>
                                )}

                                {/* Logout Button */}
                                <button
                                    onClick={handleLogout}
                                    className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-md transition"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="hover:bg-blue-700 px-3 py-2 rounded-md transition"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-md transition"
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-white focus:outline-none"
                        >
                            {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="md:hidden">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link
                            to="/"
                            className="block hover:bg-blue-700 px-3 py-2 rounded-md"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            🔍 Search
                        </Link>
                        {currentUser ? (
                            <>
                                <div className="px-3 py-2 text-sm">Welcome, {currentUser.name}</div>
                                <div className={`px-3 py-2 text-sm ${getRoleBadgeClass()} rounded`}>
                                    {getRoleDisplay()} • {currentUser.district}
                                </div>
                                
                                {/* Profile Link */}
                                {profileLink && (
                                    <Link
                                        to={profileLink.path}
                                        className="block hover:bg-blue-700 px-3 py-2 rounded-md"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        {profileLink.icon} {profileLink.label}
                                    </Link>
                                )}

                                {/* Role-specific Dashboard Link */}
                                {dashboardLink && (
                                    <Link
                                        to={dashboardLink.path}
                                        className="block hover:bg-blue-700 px-3 py-2 rounded-md"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        {dashboardLink.icon} {dashboardLink.label}
                                    </Link>
                                )}

                                <button
                                    onClick={handleLogout}
                                    className="block w-full text-left bg-red-500 hover:bg-red-600 px-3 py-2 rounded-md mt-2"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="block hover:bg-blue-700 px-3 py-2 rounded-md"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="block hover:bg-blue-700 px-3 py-2 rounded-md"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;