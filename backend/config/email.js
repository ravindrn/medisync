const nodemailer = require('nodemailer');

// Create transporter based on environment
const createTransporter = () => {
    // For development/testing with Ethereal (fake email service)
    if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER) {
        // Use Ethereal test account or create one dynamically
        const transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ETHEREAL_EMAIL || 'test@ethereal.email',
                pass: process.env.ETHEREAL_PASSWORD || 'testpassword'
            }
        });
        
        console.log('📧 Using Ethereal email service (testing mode)');
        return transporter;
    }
    
    // For production with Gmail
    console.log('📧 Using Gmail email service (production mode)');
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Send email function
const sendEmail = async (to, subject, html) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: '"MediSync" <medisync@noreply.com>',
            to,
            subject,
            html
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        
        // If using ethereal, log the preview URL
        if (transporter.options.host === 'smtp.ethereal.email') {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('📧 Preview URL:', previewUrl);
            return { success: true, messageId: info.messageId, previewUrl };
        }
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email sending error:', error);
        return { success: false, error: error.message };
    }
};

// Create email template for stock notification
const createStockNotificationEmail = (userName, medicine, stockInfo) => {
    const statusColor = stockInfo.availableQuantity > 0 ? '#10b981' : '#ef4444';
    const statusText = stockInfo.availableQuantity > 0 ? 'Available' : 'Out of Stock';
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MediSync Stock Alert</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #f9fafb;
                }
                .header {
                    background-color: #3b82f6;
                    padding: 30px 20px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }
                .header h1 {
                    color: white;
                    margin: 0;
                    font-size: 28px;
                }
                .header p {
                    color: #e0f2fe;
                    margin: 10px 0 0;
                }
                .content {
                    background-color: white;
                    padding: 30px;
                    border-radius: 0 0 8px 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .greeting {
                    font-size: 18px;
                    margin-bottom: 20px;
                }
                .alert-box {
                    background-color: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }
                .medicine-details {
                    background-color: #f0f9ff;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                    border-left: 4px solid #3b82f6;
                }
                .medicine-name {
                    font-size: 20px;
                    font-weight: bold;
                    color: #3b82f6;
                    margin-bottom: 10px;
                }
                .detail-row {
                    margin: 8px 0;
                    display: flex;
                    align-items: center;
                }
                .detail-label {
                    font-weight: 600;
                    width: 120px;
                    color: #4b5563;
                }
                .detail-value {
                    color: #1f2937;
                }
                .status-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    background-color: ${statusColor};
                    color: white;
                }
                .button {
                    display: inline-block;
                    background-color: #3b82f6;
                    color: white;
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    margin: 20px 0;
                    font-weight: 600;
                }
                .footer {
                    text-align: center;
                    padding: 20px;
                    color: #6b7280;
                    font-size: 12px;
                    border-top: 1px solid #e5e7eb;
                    margin-top: 20px;
                }
                .highlight {
                    font-weight: bold;
                    color: #3b82f6;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 MediSync</h1>
                    <p>Medicine Stock Alert System</p>
                </div>
                
                <div class="content">
                    <div class="greeting">
                        Hello <strong>${userName}</strong>! 👋
                    </div>
                    
                    <div class="alert-box">
                        <strong>📢 Stock Update Notification</strong><br>
                        The medicine you've been waiting for has been updated!
                    </div>
                    
                    <div class="medicine-details">
                        <div class="medicine-name">${medicine.medicineName}</div>
                        <div class="detail-row">
                            <span class="detail-label">💊 Strength:</span>
                            <span class="detail-value">${medicine.weight}${medicine.unit}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">🏥 Hospital:</span>
                            <span class="detail-value">${stockInfo.hospitalName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📍 District:</span>
                            <span class="detail-value">${stockInfo.district}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📦 Available Quantity:</span>
                            <span class="detail-value"><strong>${stockInfo.availableQuantity} units</strong></span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📊 Status:</span>
                            <span class="detail-value">
                                <span class="status-badge">${statusText}</span>
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">🕐 Last Updated:</span>
                            <span class="detail-value">${new Date(stockInfo.lastUpdated).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="http://localhost:5173" class="button">
                            🔍 Check Availability Now
                        </a>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
                        <p style="margin: 0; font-size: 14px;">
                            <strong>💡 Quick Tip:</strong> Add this medicine to your watchlist to track future stock updates!
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated notification from MediSync.</p>
                        <p>You received this email because you requested to be notified about this medicine.</p>
                        <p>To unsubscribe from notifications, please remove the medicine from your watchlist.</p>
                        <p style="margin-top: 10px;">&copy; 2024 MediSync. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

module.exports = { sendEmail, createStockNotificationEmail };