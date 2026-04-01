import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [hospitals, setHospitals] = useState([]);
    const [wards, setWards] = useState([]); // Add wards state
    const [filters, setFilters] = useState({
        role: 'all',
        search: ''
    });
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'patient',
        district: '',
        hospital: '',
        ward: '',
        wardNumber: '',
        phone: ''
    });

    const roles = [
        { value: 'patient', label: 'Patient', color: '#10b981', icon: '👤' },
        { value: 'nurse', label: 'Nurse', color: '#3b82f6', icon: '🩺' },
        { value: 'manager', label: 'Manager', color: '#f59e0b', icon: '🏥' },
        { value: 'ministry_officer', label: 'Ministry Officer', color: '#8b5cf6', icon: '🏛️' },
        { value: 'admin', label: 'Admin', color: '#ef4444', icon: '👑' },
        { value: 'donor', label: 'Donor', color: '#10b981', icon: '❤️' }
    ];

    // Common wards for hospitals
    const commonWards = [
        'General Ward',
        'Emergency Ward',
        'ICU',
        'Pediatric Ward',
        'Maternity Ward',
        'Surgical Ward',
        'Cardiology Ward',
        'Neurology Ward',
        'Oncology Ward',
        'Orthopedic Ward',
        'Psychiatric Ward',
        'Burn Unit',
        'Neonatal ICU',
        'Operation Theatre',
        'Recovery Ward'
    ];

    useEffect(() => {
        fetchUsers();
        fetchHospitals();
    }, [filters]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.role !== 'all') params.append('role', filters.role);
            if (filters.search) params.append('search', filters.search);
            
            const response = await api.get(`/admin/users?${params.toString()}`);
            setUsers(response.data.users);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const fetchHospitals = async () => {
        try {
            const response = await api.get('/transfers/hospitals');
            setHospitals(response.data);
        } catch (error) {
            console.error('Failed to fetch hospitals:', error);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            let hospitalId = null;
            let hospitalName = '';
            
            if (formData.hospital) {
                const selectedHospital = hospitals.find(h => h.name === formData.hospital);
                if (selectedHospital) {
                    hospitalId = selectedHospital._id;
                    hospitalName = selectedHospital.name;
                }
            }
            
            const userData = {
                name: formData.name,
                email: formData.email,
                password: formData.password || 'password123',
                role: formData.role,
                district: formData.district,
                hospital: formData.hospital,
                hospitalId: hospitalId,
                hospitalName: hospitalName,
                phone: formData.phone,
                ward: formData.ward,
                wardNumber: formData.wardNumber
            };
            
            const response = await api.post('/admin/users', userData);
            toast.success('User created successfully!');
            
            setShowAddModal(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create user');
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            let hospitalId = null;
            let hospitalName = '';
            
            if (formData.hospital) {
                const selectedHospital = hospitals.find(h => h.name === formData.hospital);
                if (selectedHospital) {
                    hospitalId = selectedHospital._id;
                    hospitalName = selectedHospital.name;
                }
            }
            
            const updateData = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                district: formData.district,
                hospital: formData.hospital,
                hospitalId: hospitalId,
                hospitalName: hospitalName,
                phone: formData.phone,
                ward: formData.ward,
                wardNumber: formData.wardNumber
            };
            
            const response = await api.put(`/admin/users/${selectedUser._id}`, updateData);
            toast.success('User updated successfully!');
            
            setShowEditModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update user');
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
            try {
                await api.delete(`/admin/users/${userId}`);
                toast.success('User deleted successfully!');
                fetchUsers();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to delete user');
            }
        }
    };

    const handleResetPassword = async (userId, userName) => {
        if (window.confirm(`Reset password for "${userName}" to default "password123"?`)) {
            try {
                await api.post(`/admin/users/${userId}/reset-password`, { newPassword: 'password123' });
                toast.success(`Password reset for ${userName} to "password123"`);
            } catch (error) {
                toast.error('Failed to reset password');
            }
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role,
            district: user.district,
            hospital: user.hospital || '',
            ward: user.ward || '',
            wardNumber: user.wardNumber || '',
            phone: user.phone || ''
        });
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'patient',
            district: '',
            hospital: '',
            ward: '',
            wardNumber: '',
            phone: ''
        });
    };

    const getRoleBadge = (role) => {
        const roleInfo = roles.find(r => r.value === role) || roles[0];
        return {
            backgroundColor: `${roleInfo.color}20`,
            color: roleInfo.color,
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
        };
    };

    const styles = {
        container: {
            padding: '20px'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '15px'
        },
        title: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1e293b'
        },
        addButton: {
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        filters: {
            display: 'flex',
            gap: '15px',
            marginBottom: '20px',
            flexWrap: 'wrap'
        },
        filterSelect: {
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white'
        },
        filterInput: {
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            flex: 1,
            minWidth: '200px'
        },
        table: {
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'auto',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        th: {
            padding: '15px',
            textAlign: 'left',
            backgroundColor: '#f8fafc',
            fontWeight: '600',
            borderBottom: '2px solid #e5e7eb',
            position: 'sticky',
            top: 0
        },
        td: {
            padding: '15px',
            borderBottom: '1px solid #e5e7eb'
        },
        actionButton: {
            padding: '6px 12px',
            margin: '0 4px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
        },
        editButton: {
            backgroundColor: '#3b82f6',
            color: 'white'
        },
        deleteButton: {
            backgroundColor: '#ef4444',
            color: 'white'
        },
        resetButton: {
            backgroundColor: '#f59e0b',
            color: 'white'
        },
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
        },
        modalTitle: {
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '20px'
        },
        formGroup: {
            marginBottom: '15px'
        },
        label: {
            display: 'block',
            marginBottom: '5px',
            fontWeight: '500',
            fontSize: '14px',
            color: '#374151'
        },
        input: {
            width: '100%',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px'
        },
        select: {
            width: '100%',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white'
        },
        modalButtons: {
            display: 'flex',
            gap: '10px',
            marginTop: '20px'
        },
        submitButton: {
            flex: 1,
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '10px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500'
        },
        cancelButton: {
            flex: 1,
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '10px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500'
        },
        badge: {
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
        },
        activeBadge: {
            backgroundColor: '#d1fae5',
            color: '#10b981'
        },
        inactiveBadge: {
            backgroundColor: '#fee2e2',
            color: '#dc2626'
        },
        infoText: {
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '5px'
        },
        row: {
            display: 'flex',
            gap: '10px'
        },
        halfWidth: {
            flex: 1
        }
    };

    // Get unique hospitals for dropdown
    const hospitalOptions = hospitals.map(h => h.name);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>User Management</h1>
                <button onClick={() => setShowAddModal(true)} style={styles.addButton}>
                    ➕ Add New User
                </button>
            </div>

            <div style={styles.filters}>
                <select
                    value={filters.role}
                    onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                    style={styles.filterSelect}
                >
                    <option value="all">All Roles</option>
                    {roles.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    style={styles.filterInput}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading users...</div>
            ) : (
                <div style={styles.table}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Name</th>
                                <th style={styles.th}>Email</th>
                                <th style={styles.th}>Role</th>
                                <th style={styles.th}>District</th>
                                <th style={styles.th}>Hospital/Ward</th>
                                <th style={styles.th}>Phone</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user._id}>
                                    <td style={styles.td}>
                                        <strong>{user.name}</strong>
                                    </td>
                                    <td style={styles.td}>{user.email}</td>
                                    <td style={styles.td}>
                                        <span style={getRoleBadge(user.role)}>
                                            {roles.find(r => r.value === user.role)?.icon} 
                                            {roles.find(r => r.value === user.role)?.label}
                                        </span>
                                    </td>
                                    <td style={styles.td}>📍 {user.district}</td>
                                    <td style={styles.td}>
                                        {user.role === 'nurse' ? (
                                            <div>
                                                <div>{user.hospital || 'No hospital'}</div>
                                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                    Ward: {user.ward || 'Not assigned'}
                                                    {user.wardNumber && ` (${user.wardNumber})`}
                                                </div>
                                            </div>
                                        ) : user.role === 'manager' ? (
                                            user.hospital || '⚠️ Not assigned'
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td style={styles.td}>{user.phone || '-'}</td>
                                    <td style={styles.td}>
                                        <span style={{
                                            ...styles.badge,
                                            ...(user.isActive ? styles.activeBadge : styles.inactiveBadge)
                                        }}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <button
                                            onClick={() => openEditModal(user)}
                                            style={{ ...styles.actionButton, ...styles.editButton }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleResetPassword(user._id, user.name)}
                                            style={{ ...styles.actionButton, ...styles.resetButton }}
                                        >
                                            Reset PW
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user._id, user.name)}
                                            style={{ ...styles.actionButton, ...styles.deleteButton }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add User Modal */}
            {showAddModal && (
                <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2 style={styles.modalTitle}>Add New User</h2>
                        <form onSubmit={handleCreateUser}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Full Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={styles.input}
                                    required
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    style={styles.input}
                                    required
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Password</label>
                                <input
                                    type="text"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    style={styles.input}
                                    placeholder="Leave blank for default: password123"
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    style={styles.select}
                                >
                                    {roles.map(role => (
                                        <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>District *</label>
                                <input
                                    type="text"
                                    value={formData.district}
                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                    style={styles.input}
                                    required
                                />
                            </div>
                            
                            {/* Hospital dropdown - for manager and nurse */}
                            {(formData.role === 'manager' || formData.role === 'nurse') && (
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Assign Hospital *</label>
                                    <select
                                        value={formData.hospital}
                                        onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                                        style={styles.select}
                                        required
                                    >
                                        <option value="">Select a hospital</option>
                                        {hospitalOptions.map(hospital => (
                                            <option key={hospital} value={hospital}>{hospital}</option>
                                        ))}
                                    </select>
                                    <div style={styles.infoText}>
                                        💡 This will assign the user to this hospital
                                    </div>
                                </div>
                            )}
                            
                            {/* Ward dropdown - only for nurse */}
                            {formData.role === 'nurse' && formData.hospital && (
                                <>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Assign Ward *</label>
                                        <select
                                            value={formData.ward}
                                            onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                            style={styles.select}
                                            required
                                        >
                                            <option value="">Select a ward</option>
                                            {commonWards.map(ward => (
                                                <option key={ward} value={ward}>{ward}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Ward Number (Optional)</label>
                                        <input
                                            type="text"
                                            value={formData.wardNumber}
                                            onChange={(e) => setFormData({ ...formData, wardNumber: e.target.value })}
                                            style={styles.input}
                                            placeholder="e.g., Ward 3A, Room 101"
                                        />
                                    </div>
                                </>
                            )}
                            
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.modalButtons}>
                                <button type="submit" style={styles.submitButton}>Create User</button>
                                <button type="button" onClick={() => setShowAddModal(false)} style={styles.cancelButton}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2 style={styles.modalTitle}>Edit User: {selectedUser.name}</h2>
                        <form onSubmit={handleUpdateUser}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Full Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={styles.input}
                                    required
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    style={styles.input}
                                    required
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    style={styles.select}
                                >
                                    {roles.map(role => (
                                        <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>District *</label>
                                <input
                                    type="text"
                                    value={formData.district}
                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                    style={styles.input}
                                    required
                                />
                            </div>
                            
                            {/* Hospital dropdown - for manager and nurse */}
                            {(formData.role === 'manager' || formData.role === 'nurse') && (
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Assign Hospital</label>
                                    <select
                                        value={formData.hospital}
                                        onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                                        style={styles.select}
                                    >
                                        <option value="">Select a hospital</option>
                                        {hospitalOptions.map(hospital => (
                                            <option key={hospital} value={hospital}>{hospital}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            {/* Ward dropdown - only for nurse */}
                            {formData.role === 'nurse' && (
                                <>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Assign Ward</label>
                                        <select
                                            value={formData.ward}
                                            onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                            style={styles.select}
                                        >
                                            <option value="">Select a ward</option>
                                            {commonWards.map(ward => (
                                                <option key={ward} value={ward}>{ward}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Ward Number</label>
                                        <input
                                            type="text"
                                            value={formData.wardNumber}
                                            onChange={(e) => setFormData({ ...formData, wardNumber: e.target.value })}
                                            style={styles.input}
                                            placeholder="e.g., Ward 3A, Room 101"
                                        />
                                    </div>
                                </>
                            )}
                            
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.modalButtons}>
                                <button type="submit" style={styles.submitButton}>Save Changes</button>
                                <button type="button" onClick={() => setShowEditModal(false)} style={styles.cancelButton}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;