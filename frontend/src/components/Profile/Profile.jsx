import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const Profile = () => {
    const { user, updateUser } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        district: '',
        phone: '',
        role: ''
    });
    const [originalData, setOriginalData] = useState({
        name: '',
        email: '',
        district: '',
        phone: '',
        role: ''
    });
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Check user role
    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';
    const isMinistryOfficer = user?.role === 'ministry_officer';
    const isPatient = user?.role === 'patient';

    // Determine which fields are editable
    const canEditName = true; // Everyone can edit name
    const canEditEmail = isAdmin; // Only admin can edit email
    const canEditDistrict = !isManager && !isAdmin && !isMinistryOfficer; // Only patients can change district
    const canEditPhone = true; // Everyone can edit phone

    useEffect(() => {
        if (user) {
            const userData = {
                name: user.name || '',
                email: user.email || '',
                district: user.district || '',
                phone: user.phone || '',
                role: user.role || ''
            };
            setFormData(userData);
            setOriginalData(userData);
        }
        fetchDistricts();
    }, [user]);

    const fetchDistricts = async () => {
        try {
            const response = await api.get('/medicines/districts');
            setDistricts(response.data || []);
        } catch (error) {
            console.error('Failed to fetch districts:', error);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setIsSaving(true);

        try {
            // Only send editable fields
            const updateData = {
                name: formData.name,
                phone: formData.phone
            };
            
            // Only send email if admin is editing
            if (canEditEmail && formData.email !== originalData.email) {
                updateData.email = formData.email;
            }
            
            // Only send district if user is allowed to change it
            if (canEditDistrict) {
                updateData.district = formData.district;
            }

            console.log('Updating profile with:', updateData);

            const response = await api.put('/auth/profile', updateData);
            
            // Update user context with new data
            const updatedUser = {
                ...user,
                ...response.data
            };
            updateUser(updatedUser);
            
            toast.success('Profile updated successfully!');
            setEditMode(false);
            setOriginalData({
                ...formData,
                ...response.data
            });
            
            // If district changed, show warning
            if (canEditDistrict && originalData.district !== formData.district) {
                toast.info('📍 District changed! Your watchlist will now show medicines available in your new district.', {
                    duration: 5000
                });
            }
            
            // If email changed, show warning about re-login
            if (canEditEmail && originalData.email !== formData.email) {
                toast.warning('📧 Email changed! Please log in again with your new email.', {
                    duration: 5000
                });
                // Optional: Auto logout after 3 seconds
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }
        } catch (error) {
            console.error('Profile update error:', error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
            setIsSaving(false);
        }
    };

    const enableEditMode = () => {
        console.log('Enabling edit mode...');
        setEditMode(true);
    };

    const cancelEdit = () => {
        console.log('Canceling edit mode...');
        setEditMode(false);
        setFormData(originalData);
    };

    const getRoleBadge = (role) => {
        const roles = {
            admin: { bg: '#ef4444', text: 'Admin', icon: '👑' },
            manager: { bg: '#f59e0b', text: 'Hospital Manager', icon: '🏥' },
            ministry_officer: { bg: '#8b5cf6', text: 'Ministry Officer', icon: '🏛️' },
            patient: { bg: '#10b981', text: 'Patient', icon: '👤' },
            nurse: { bg: '#3b82f6', text: 'Nurse', icon: '🩺' }
        };
        const roleInfo = roles[role] || roles.patient;
        return {
            backgroundColor: roleInfo.bg,
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500',
            display: 'inline-block'
        };
    };

    const styles = {
        container: {
            maxWidth: '600px',
            margin: '40px auto',
            padding: '20px'
        },
        card: {
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            overflow: 'hidden'
        },
        header: {
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '30px',
            textAlign: 'center'
        },
        avatar: {
            width: '80px',
            height: '80px',
            backgroundColor: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 15px',
            fontSize: '40px',
            fontWeight: 'bold',
            color: '#3b82f6'
        },
        name: {
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '5px'
        },
        email: {
            fontSize: '14px',
            opacity: 0.9
        },
        roleBadge: {
            marginTop: '10px',
            display: 'inline-block'
        },
        content: {
            padding: '30px'
        },
        infoBox: {
            backgroundColor: '#e0f2fe',
            borderLeft: '4px solid #0284c7',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#0369a1'
        },
        adminInfoBox: {
            backgroundColor: '#fef3c7',
            borderLeft: '4px solid #f59e0b',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#92400e'
        },
        warningBox: {
            backgroundColor: '#fef3c7',
            borderLeft: '4px solid #f59e0b',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#92400e'
        },
        formGroup: {
            marginBottom: '20px'
        },
        label: {
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#374151',
            fontSize: '14px'
        },
        labelDisabled: {
            color: '#9ca3af'
        },
        input: {
            width: '100%',
            padding: '12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '16px',
            transition: 'all 0.2s'
        },
        inputDisabled: {
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            cursor: 'not-allowed'
        },
        inputEnabled: {
            backgroundColor: 'white',
            color: '#1f2937',
            borderColor: '#3b82f6'
        },
        select: {
            width: '100%',
            padding: '12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '16px',
            backgroundColor: 'white'
        },
        selectDisabled: {
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            cursor: 'not-allowed'
        },
        readOnlyText: {
            width: '100%',
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            fontSize: '16px',
            color: '#1f2937'
        },
        buttonGroup: {
            display: 'flex',
            gap: '10px',
            marginTop: '20px'
        },
        editButton: {
            width: '100%',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
        },
        saveButton: {
            flex: 1,
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer'
        },
        cancelButton: {
            flex: 1,
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer'
        }
    };

    // Get initials for avatar
    const getInitials = () => {
        return formData.name ? formData.name.charAt(0).toUpperCase() : '?';
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <div style={styles.avatar}>
                        {getInitials()}
                    </div>
                    <div style={styles.name}>{formData.name || 'User'}</div>
                    <div style={styles.email}>{formData.email}</div>
                    <div style={styles.roleBadge}>
                        <span style={getRoleBadge(formData.role)}>
                            {formData.role === 'admin' ? '👑 ' : 
                             formData.role === 'manager' ? '🏥 ' :
                             formData.role === 'ministry_officer' ? '🏛️ ' :
                             formData.role === 'nurse' ? '🩺 ' : '👤 '}
                            {formData.role === 'ministry_officer' ? 'Ministry Officer' : 
                             formData.role === 'manager' ? 'Hospital Manager' :
                             formData.role === 'admin' ? 'Administrator' :
                             formData.role === 'nurse' ? 'Nurse' : 'Patient'}
                        </span>
                    </div>
                </div>

                <div style={styles.content}>
                    {/* Info Message based on role */}
                    {!canEditDistrict && (isManager || isAdmin || isMinistryOfficer) && (
                        <div style={styles.infoBox}>
                            ℹ️ <strong>Note:</strong> Your district is assigned by the system and cannot be changed.
                            {isManager && ' As a Hospital Manager, your district is linked to your hospital.'}
                            {isAdmin && ' As an Administrator, your district is for system management.'}
                            {isMinistryOfficer && ' As a Ministry Officer, your district is assigned by the system.'}
                        </div>
                    )}

                    {/* Admin Email Info */}
                    {isAdmin && (
                        <div style={styles.adminInfoBox}>
                            🔐 <strong>Admin Privilege:</strong> As an administrator, you can update your email address. 
                            Changing your email will require you to log in again with the new email.
                        </div>
                    )}

                    {!canEditEmail && !isAdmin && (
                        <div style={styles.infoBox}>
                            📧 <strong>Email cannot be changed.</strong> Please contact an administrator if you need to update your email address.
                        </div>
                    )}

                    {/* View Mode */}
                    {!editMode && (
                        <div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Full Name</label>
                                <div style={styles.readOnlyText}>{formData.name}</div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={{ ...styles.label, ...styles.labelDisabled }}>Email Address</label>
                                <div style={styles.readOnlyText}>{formData.email}</div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>District</label>
                                <div style={styles.readOnlyText}>
                                    📍 {formData.district || 'Not set'}
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Phone Number</label>
                                <div style={styles.readOnlyText}>{formData.phone || 'Not set'}</div>
                            </div>

                            <div style={styles.buttonGroup}>
                                <button
                                    type="button"
                                    onClick={enableEditMode}
                                    style={styles.editButton}
                                >
                                    ✎ Edit Profile
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Edit Mode */}
                    {editMode && (
                        <form onSubmit={handleSubmit}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    style={{
                                        ...styles.input,
                                        ...styles.inputEnabled
                                    }}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={canEditEmail ? styles.label : { ...styles.label, ...styles.labelDisabled }}>
                                    Email Address
                                    {canEditEmail && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                                </label>
                                {canEditEmail ? (
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        style={{
                                            ...styles.input,
                                            ...styles.inputEnabled
                                        }}
                                        required
                                    />
                                ) : (
                                    <div style={styles.readOnlyText}>{formData.email}</div>
                                )}
                                {!canEditEmail && (
                                    <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                                        Email cannot be changed. Contact admin for assistance.
                                    </small>
                                )}
                                {canEditEmail && (
                                    <small style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                                        ⚠️ Changing your email will require you to log in again.
                                    </small>
                                )}
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>District</label>
                                {canEditDistrict ? (
                                    <select
                                        name="district"
                                        value={formData.district}
                                        onChange={handleChange}
                                        style={styles.select}
                                    >
                                        <option value="">Select District</option>
                                        {districts.map(district => (
                                            <option key={district} value={district}>{district}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div style={styles.readOnlyText}>
                                        📍 {formData.district || 'Not set'}
                                        <span style={{ fontSize: '12px', color: '#f59e0b', marginLeft: '8px' }}>
                                            (Cannot change)
                                        </span>
                                    </div>
                                )}
                                {!canEditDistrict && (
                                    <small style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                                        ⚠️ District is assigned by the system and cannot be changed.
                                    </small>
                                )}
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone || ''}
                                    onChange={handleChange}
                                    placeholder="Enter your phone number"
                                    style={{
                                        ...styles.input,
                                        ...styles.inputEnabled
                                    }}
                                />
                            </div>

                            {canEditDistrict && formData.district !== originalData.district && (
                                <div style={styles.warningBox}>
                                    ⚠️ <strong>Important:</strong> Changing your district will update your watchlist to show 
                                    medicines available in <strong>{formData.district}</strong>.
                                </div>
                            )}

                            {canEditEmail && formData.email !== originalData.email && (
                                <div style={styles.warningBox}>
                                    ⚠️ <strong>Important:</strong> Changing your email will require you to log in again with your new email address.
                                </div>
                            )}

                            <div style={styles.buttonGroup}>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={styles.saveButton}
                                >
                                    {loading ? 'Saving...' : '✓ Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    style={styles.cancelButton}
                                >
                                    ✗ Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;