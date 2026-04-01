import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorPrompt from './DonorPrompt';

const DonorJoinButton = () => {
    const [showDonorPrompt, setShowDonorPrompt] = useState(false);
    const navigate = useNavigate();

    const handleSuccess = () => {
        setShowDonorPrompt(false);
        navigate('/donor');  // Navigate to donor dashboard
    };

    const styles = {
        container: {
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            zIndex: 999
        },
        button: {
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '14px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.3s ease'
        },
        icon: {
            fontSize: '24px'
        }
    };

    return (
        <>
            <div style={styles.container}>
                <button 
                    style={styles.button}
                    onClick={() => setShowDonorPrompt(true)}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)';
                    }}
                >
                    <span style={styles.icon}>❤️</span>
                    <span>Join Our Donor Family & Save Lives!</span>
                </button>
            </div>
            {showDonorPrompt && (
                <DonorPrompt 
                    onClose={() => setShowDonorPrompt(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </>
    );
};

export default DonorJoinButton;