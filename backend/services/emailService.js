const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const User = require('../models/User');

// Initialize Resend only if API key exists
const resend = process.env.RESEND_API_KEY 
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

// Helper function to get nodemailer transporter
const getTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        family: 4,  // Force IPv4
        connectionTimeout: 10000,
        greetingTimeout: 10000
    });
};

// Unified email sender that works with both Resend and Nodemailer
const sendEmail = async (to, subject, html, attachments = []) => {
    // Try Resend first in production
    if (process.env.NODE_ENV === 'production' && resend) {
        try {
            const { data, error } = await resend.emails.send({
                from: 'MediSync <onboarding@resend.dev>',
                to: [to],
                subject,
                html,
                attachments: attachments.map(a => ({
                    filename: a.filename,
                    path: a.path
                }))
            });
            
            if (error) throw error;
            console.log(`✅ Email sent via Resend to ${to}`);
            return { success: true, provider: 'resend' };
        } catch (error) {
            console.error('Resend failed, falling back to nodemailer:', error.message);
        }
    }
    
    // Fallback to nodemailer
    try {
        const transporter = getTransporter();
        const mailOptions = {
            from: `"MediSync" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            attachments
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent via Nodemailer to ${to}`);
        return { success: true, provider: 'nodemailer', messageId: info.messageId };
    } catch (error) {
        console.error('All email methods failed:', error);
        return { success: false, error: error.message };
    }
};

// ==================== STOCK UPDATE NOTIFICATIONS ====================

const sendStockUpdateNotification = async (userEmail, userName, medicineName, strength, hospitalName, district, newQuantity) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 30px; }
                .medicine-card { background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                .detail-label { font-weight: bold; color: #4b5563; }
                .detail-value { color: #1f2937; }
                .stock-badge { display: inline-block; background-color: #10b981; color: white; padding: 5px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
                .button { display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 20px; font-weight: bold; }
                .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 MediSync</h1>
                    <p>Medicine Stock Alert</p>
                </div>
                <div class="content">
                    <h2>Hello ${userName}!</h2>
                    <p>Good news! The medicine you requested has been updated in your district.</p>
                    
                    <div class="medicine-card">
                        <h3 style="margin-top: 0; color: #1e293b;">📋 Medicine Details</h3>
                        <div class="detail-row">
                            <span class="detail-label">Medicine Name:</span>
                            <span class="detail-value"><strong>${medicineName}</strong></span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Strength:</span>
                            <span class="detail-value">${strength}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Hospital:</span>
                            <span class="detail-value">${hospitalName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">District:</span>
                            <span class="detail-value">${district}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Available Quantity:</span>
                            <span class="detail-value"><span class="stock-badge">${newQuantity} units</span></span>
                        </div>
                    </div>
                    
                    <p>You can now visit the hospital or check the MediSync portal for more details.</p>
                    
                    <div style="text-align: center;">
                        <a href="https://your-frontend-url.com" class="button">View in MediSync</a>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated notification from MediSync.</p>
                    <p>If you no longer wish to receive these notifications, please manage your watchlist in the app.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(userEmail, `📦 Stock Update Alert: ${medicineName} is Now Available!`, html);
};

// ==================== STOCK ARRIVAL EMAIL FUNCTIONS ====================

const sendStockArrivalSubmittedToAdmins = async (requestData) => {
    try {
        const admins = await User.find({
            role: 'admin',
            isActive: { $ne: false }
        }).select('name email');

        if (!admins || admins.length === 0) {
            console.log('⚠️ No active admin users found for stock arrival notification');
            return { success: false, error: 'No admins found' };
        }

        const medicineRows = requestData.medicines.map((med, index) => `
            <tr>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${index + 1}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${med.medicineName}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${med.weight}${med.unit}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${med.quantity} units</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${med.batchNumber || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #e5e7eb;">${med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : 'N/A'}</td>
            </tr>
        `).join('');

        const results = [];

        for (const admin of admins) {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; }
                        .content { padding: 30px; }
                        .card { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; }
                        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; gap: 10px; }
                        .label { font-weight: bold; color: #374151; }
                        .value { color: #111827; text-align: right; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
                        th { background: #f3f4f6; padding: 10px; border: 1px solid #e5e7eb; }
                        .button { display: inline-block; background-color: #f59e0b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 20px; font-weight: bold; }
                        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏥 MediSync</h1>
                            <p>New Stock Arrival Request Submitted</p>
                        </div>
                        <div class="content">
                            <h2>Hello ${admin.name},</h2>
                            <p>A hospital manager has submitted a new stock arrival request for admin review.</p>

                            <div class="card">
                                <div class="detail-row">
                                    <span class="label">Hospital:</span>
                                    <span class="value">${requestData.hospitalName}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">District:</span>
                                    <span class="value">${requestData.hospitalDistrict}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Submitted By:</span>
                                    <span class="value">${requestData.requestedBy?.name || 'Manager'} (${requestData.requestedBy?.email || 'N/A'})</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Request ID:</span>
                                    <span class="value">${requestData.requestId || 'Pending ID'}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="label">Arrival Date:</span>
                                    <span class="value">${requestData.arrivalDate ? new Date(requestData.arrivalDate).toLocaleString() : new Date().toLocaleString()}</span>
                                </div>
                            </div>

                            <h3>📋 Submitted Medicines</h3>
                            <table>
                                <thead>
                                    <tr><th>#</th><th>Medicine</th><th>Strength</th><th>Quantity</th><th>Batch No</th><th>Expiry Date</th></tr>
                                </thead>
                                <tbody>${medicineRows}</tbody>
                            </table>

                            ${requestData.notes ? `<div class="card" style="margin-top: 20px;"><strong>📝 Manager Notes:</strong><p style="margin-top: 10px;">${requestData.notes}</p></div>` : ''}

                            <div style="text-align: center;">
                                <a href="https://your-frontend-url.com/admin/medicines" class="button">Review Request</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>This is an automated notification from MediSync.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            const result = await sendEmail(admin.email, `📦 New Stock Arrival Request - ${requestData.hospitalName}`, html);
            results.push({ email: admin.email, success: result.success, messageId: result.messageId });
        }

        return {
            success: true,
            totalAdmins: admins.length,
            sentCount: results.filter(r => r.success).length,
            failedCount: results.filter(r => !r.success).length,
            results
        };
    } catch (error) {
        console.error('❌ Failed to send stock arrival notifications to admins:', error);
        return { success: false, error: error.message };
    }
};

const sendStockArrivalApprovedToManager = async (managerEmail, managerName, stockRequest, approvedMedicine, adminUser, updatedQuantity) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .card { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; gap: 10px; }
                .label { font-weight: bold; color: #374151; }
                .value { color: #111827; text-align: right; }
                .badge { display: inline-block; background: #10b981; color: white; padding: 5px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
                .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>🏥 MediSync</h1><p>Stock Arrival Approved</p></div>
                <div class="content">
                    <h2>Hello ${managerName},</h2>
                    <p>Your submitted stock arrival request has been <strong style="color:#10b981;">approved</strong> by admin and the stock has been updated in the system.</p>
                    <div class="card">
                        <div class="detail-row"><span class="label">Hospital:</span><span class="value">${stockRequest.hospitalName}</span></div>
                        <div class="detail-row"><span class="label">District:</span><span class="value">${stockRequest.hospitalDistrict}</span></div>
                        <div class="detail-row"><span class="label">Medicine:</span><span class="value">${approvedMedicine.medicineName}</span></div>
                        <div class="detail-row"><span class="label">Strength:</span><span class="value">${approvedMedicine.weight}${approvedMedicine.unit}</span></div>
                        <div class="detail-row"><span class="label">Approved Quantity:</span><span class="value"><span class="badge">+${approvedMedicine.quantity} units</span></span></div>
                        <div class="detail-row"><span class="label">Updated Stock Quantity:</span><span class="value">${updatedQuantity} units</span></div>
                        <div class="detail-row"><span class="label">Approved By:</span><span class="value">${adminUser.name} (${adminUser.email})</span></div>
                    </div>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(managerEmail, `✅ Stock Arrival Approved - ${approvedMedicine.medicineName}`, html);
};

const sendStockArrivalRejectedToManager = async (managerEmail, managerName, stockRequest, rejectedMedicine, adminUser, rejectionReason) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .card { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; gap: 10px; }
                .label { font-weight: bold; color: #374151; }
                .value { color: #111827; text-align: right; }
                .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>🏥 MediSync</h1><p>Stock Arrival Rejected</p></div>
                <div class="content">
                    <h2>Hello ${managerName},</h2>
                    <p>Your submitted stock arrival request was <strong style="color:#ef4444;">rejected</strong> by admin.</p>
                    <div class="card">
                        <div class="detail-row"><span class="label">Hospital:</span><span class="value">${stockRequest.hospitalName}</span></div>
                        <div class="detail-row"><span class="label">District:</span><span class="value">${stockRequest.hospitalDistrict}</span></div>
                        <div class="detail-row"><span class="label">Medicine:</span><span class="value">${rejectedMedicine.medicineName}</span></div>
                        <div class="detail-row"><span class="label">Strength:</span><span class="value">${rejectedMedicine.weight}${rejectedMedicine.unit}</span></div>
                        <div class="detail-row"><span class="label">Submitted Quantity:</span><span class="value">${rejectedMedicine.quantity} units</span></div>
                        <div class="detail-row"><span class="label">Rejected By:</span><span class="value">${adminUser.name} (${adminUser.email})</span></div>
                        <div class="detail-row"><span class="label">Reason:</span><span class="value">${rejectionReason || 'No reason provided'}</span></div>
                    </div>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(managerEmail, `❌ Stock Arrival Rejected - ${rejectedMedicine.medicineName}`, html);
};

// ==================== TRANSFER EMAIL FUNCTIONS ====================

const sendTransferRequestEmail = async (toHospitalManager, fromHospital, toHospital, medicines, requestId) => {
    const medicineList = medicines.map(m => `- ${m.medicineName} (${m.weight}${m.unit}): ${m.requestedQuantity} units`).join('<br>');
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: #f59e0b; color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .request-card { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>🏥 MediSync</h1><p>New Transfer Request</p></div>
                <div class="content">
                    <h2>Hello ${toHospitalManager.name},</h2>
                    <p><strong>${fromHospital.name}</strong> has requested a medicine transfer from your hospital.</p>
                    <div class="request-card">
                        <h3>📋 Request Details</h3>
                        <div class="detail-row"><span><strong>Request ID:</strong></span><span>${requestId}</span></div>
                        <div class="detail-row"><span><strong>Requesting Hospital:</strong></span><span>${fromHospital.name} (${fromHospital.district})</span></div>
                        <div class="detail-row"><span><strong>Your Hospital:</strong></span><span>${toHospital.name} (${toHospital.district})</span></div>
                        <div class="detail-row"><span><strong>Medicines Requested:</strong></span><span><br>${medicineList}</span></div>
                    </div>
                    <p>Please login to the MediSync portal to approve or reject this request.</p>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(toHospitalManager.email, `📋 New Transfer Request from ${fromHospital.name}`, html);
};

const sendTransferApprovedEmail = async (requestingHospitalManager, fromHospital, toHospital, medicines, requestId) => {
    const medicineList = medicines.map(m => `- ${m.medicineName} (${m.weight}${m.unit}): ${m.approvedQuantity} units approved`).join('<br>');
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: #10b981; color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .request-card { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>🏥 MediSync</h1><p>Transfer Request Approved</p></div>
                <div class="content">
                    <h2>Hello ${requestingHospitalManager.name},</h2>
                    <p>Great news! Your transfer request has been <strong style="color: #10b981;">APPROVED</strong> by <strong>${toHospital.name}</strong>.</p>
                    <div class="request-card">
                        <h3>📋 Approved Transfer Details</h3>
                        <div class="detail-row"><span><strong>Request ID:</strong></span><span>${requestId}</span></div>
                        <div class="detail-row"><span><strong>From Hospital:</strong></span><span>${toHospital.name} (${toHospital.district})</span></div>
                        <div class="detail-row"><span><strong>To Hospital:</strong></span><span>${fromHospital.name} (${fromHospital.district})</span></div>
                        <div class="detail-row"><span><strong>Approved Medicines:</strong></span><span><br>${medicineList}</span></div>
                    </div>
                    <p>Please confirm receipt when you receive the medicines to complete the transfer.</p>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(requestingHospitalManager.email, `✅ Transfer Request Approved - ${requestId}`, html);
};

const sendTransferCompletedEmail = async (sendingHospitalManager, fromHospital, toHospital, medicines, requestId) => {
    const medicineList = medicines.map(m => `- ${m.medicineName} (${m.weight}${m.unit}): ${m.approvedQuantity} units`).join('<br>');
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: #3b82f6; color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .request-card { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>🏥 MediSync</h1><p>Transfer Completed</p></div>
                <div class="content">
                    <h2>Hello ${sendingHospitalManager.name},</h2>
                    <p><strong>${fromHospital.name}</strong> has confirmed receipt of the medicines you sent.</p>
                    <div class="request-card">
                        <h3>📋 Completed Transfer Details</h3>
                        <div class="detail-row"><span><strong>Request ID:</strong></span><span>${requestId}</span></div>
                        <div class="detail-row"><span><strong>Your Hospital:</strong></span><span>${toHospital.name} (${toHospital.district})</span></div>
                        <div class="detail-row"><span><strong>Receiving Hospital:</strong></span><span>${fromHospital.name} (${fromHospital.district})</span></div>
                        <div class="detail-row"><span><strong>Medicines Transferred:</strong></span><span><br>${medicineList}</span></div>
                    </div>
                    <p>Thank you for helping other hospitals with their medicine needs!</p>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(sendingHospitalManager.email, `✅ Transfer Completed - ${requestId}`, html);
};

const sendTransferRejectedEmail = async (requestingHospitalManager, fromHospital, toHospital, reason, requestId) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: #ef4444; color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .request-card { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>🏥 MediSync</h1><p>Transfer Request Rejected</p></div>
                <div class="content">
                    <h2>Hello ${requestingHospitalManager.name},</h2>
                    <p>Your transfer request to <strong>${toHospital.name}</strong> has been <strong style="color: #ef4444;">REJECTED</strong>.</p>
                    <div class="request-card">
                        <h3>📋 Rejection Details</h3>
                        <div class="detail-row"><span><strong>Request ID:</strong></span><span>${requestId}</span></div>
                        <div class="detail-row"><span><strong>Reason:</strong></span><span>${reason || 'No reason provided'}</span></div>
                    </div>
                    <p>You may try requesting from another hospital or contact them for more information.</p>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(requestingHospitalManager.email, `❌ Transfer Request Rejected - ${requestId}`, html);
};

// ==================== DONOR EMAIL FUNCTIONS ====================

const sendDonationEmail = async (email, name, donation) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .donation-card { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>❤️ Thank You, ${name}!</h1><p>Your generosity saves lives</p></div>
                <div class="content">
                    <p>Your donation pledge has been received and is pending review by our team.</p>
                    <div class="donation-card">
                        <h3>📋 Donation Details</h3>
                        <div class="detail-row"><span><strong>Donation ID:</strong></span><span>${donation.donationId}</span></div>
                        <div class="detail-row"><span><strong>Hospital:</strong></span><span>${donation.hospitalName}</span></div>
                        <div class="detail-row"><span><strong>Items:</strong></span><span>${donation.totalItems} medicines (${donation.totalQuantity} units)</span></div>
                        <div class="detail-row"><span><strong>Status:</strong></span><span><span style="background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 12px;">Pending Review</span></span></div>
                    </div>
                    <p>We will notify you once your donation is approved.</p>
                    <p>Thank you for making a difference!</p>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(email, `Thank You for Your Donation Pledge - MediSync`, html);
};

const sendDonationApprovalEmail = async (email, name, donation, hospital) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .donation-card { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>✅ Great News, ${name}!</h1><p>Your donation has been approved</p></div>
                <div class="content">
                    <p>Your donation pledge has been <strong style="color: #10b981;">APPROVED</strong>!</p>
                    <div class="donation-card">
                        <h3>📋 Donation Details</h3>
                        <div class="detail-row"><span><strong>Donation ID:</strong></span><span>${donation.donationId}</span></div>
                        <div class="detail-row"><span><strong>Hospital:</strong></span><span>${donation.hospitalName}</span></div>
                        <div class="detail-row"><span><strong>Items:</strong></span><span>${donation.totalItems} medicines (${donation.totalQuantity} units)</span></div>
                        ${donation.deliveryLocation ? `<div class="detail-row"><span><strong>Delivery Location:</strong></span><span>${donation.deliveryLocation}</span></div>` : ''}
                        ${donation.deliveryDate ? `<div class="detail-row"><span><strong>Delivery Date:</strong></span><span>${new Date(donation.deliveryDate).toLocaleDateString()}</span></div>` : ''}
                    </div>
                    <p>Please coordinate with the hospital for delivery arrangements.</p>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(email, `✅ Your Donation Has Been Approved! - MediSync`, html);
};

const sendDonationRejectedEmail = async (email, name, donation, reason) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .donation-card { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>📋 Update on Your Donation</h1><p>Dear ${name}</p></div>
                <div class="content">
                    <p>We regret to inform you that your donation request has been reviewed and could not be approved at this time.</p>
                    <div class="donation-card">
                        <h3>📋 Donation Details</h3>
                        <div class="detail-row"><span><strong>Donation ID:</strong></span><span>${donation.donationId}</span></div>
                        <div class="detail-row"><span><strong>Reason:</strong></span><span style="color: #dc2626;">${reason || 'No specific reason provided'}</span></div>
                    </div>
                    <p>You may submit a new donation request with different medicines or contact support for more information.</p>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(email, `📋 Update on Your Donation - MediSync`, html);
};

const sendDonationCertificateEmail = async (email, name, donation, certificate) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .certificate-card { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>🎉 Congratulations, ${name}!</h1><p>Your donation certificate is ready</p></div>
                <div class="content">
                    <p>Thank you for your generous donation! Your contribution has been successfully delivered and is making a difference.</p>
                    <div class="certificate-card">
                        <h3>🏆 Certificate of Appreciation</h3>
                        <p>Donation ID: ${donation.donationId}</p>
                        <p>${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
                        <p>To: ${donation.hospitalName}</p>
                    </div>
                    <p>Your certificate is attached to this email. You can also download it from your donor portal.</p>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    
    const attachments = certificate.filePath ? [{ filename: certificate.fileName, path: certificate.filePath }] : [];
    return await sendEmail(email, `🎉 Your Donation Certificate - MediSync`, html, attachments);
};

const sendDonationNotificationToHospital = async (email, name, donation, donor) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .donation-card { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>📦 New Donation Assigned</h1><p>Dear ${name}</p></div>
                <div class="content">
                    <p>A new donation has been assigned to your hospital!</p>
                    <div class="donation-card">
                        <h3>📋 Donation Details</h3>
                        <div class="detail-row"><span><strong>Donation ID:</strong></span><span>${donation.donationId}</span></div>
                        <div class="detail-row"><span><strong>Donor Name:</strong></span><span>${donor.name}</span></div>
                        <div class="detail-row"><span><strong>Donor Contact:</strong></span><span>${donor.email} | ${donor.phone || 'N/A'}</span></div>
                        <div class="detail-row"><span><strong>Items:</strong></span><span>${donation.totalItems} medicines (${donation.totalQuantity} units)</span></div>
                        ${donation.deliveryLocation ? `<div class="detail-row"><span><strong>Delivery Location:</strong></span><span>${donation.deliveryLocation}</span></div>` : ''}
                    </div>
                    <p>Please coordinate with the donor for delivery arrangements.</p>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(email, `📦 New Donation Assigned to Your Hospital - MediSync`, html);
};

const sendDonationCompletedNotification = async (email, name, donation, donor) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .donation-card { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>✅ Donation Completed!</h1><p>Dear ${name}</p></div>
                <div class="content">
                    <p>The donation has been successfully completed. The donor's medicines have been added to your hospital inventory.</p>
                    <div class="donation-card">
                        <h3>📋 Donation Summary</h3>
                        <div class="detail-row"><span><strong>Donation ID:</strong></span><span>${donation.donationId}</span></div>
                        <div class="detail-row"><span><strong>Donor:</strong></span><span>${donor.name}</span></div>
                        <div class="detail-row"><span><strong>Items Received:</strong></span><span>${donation.totalItems} medicines (${donation.totalQuantity} units)</span></div>
                    </div>
                    <p>A certificate has been generated for the donor. Thank you for your cooperation!</p>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(email, `✅ Donation Completed - ${donation.donationId}`, html);
};

const sendDonationUpdateEmail = async (adminEmail, adminName, donation, donorId, previousState) => {
    try {
        const donor = await User.findById(donorId);
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .donation-card { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; }
                    .comparison { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
                    .old-items, .new-items { flex: 1; background: #f9fafb; padding: 15px; border-radius: 8px; min-width: 200px; }
                    .item-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
                    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header"><h1>✏️ Donation Updated</h1><p>Donation ID: ${donation.donationId}</p></div>
                    <div class="content">
                        <h2>Hello ${adminName},</h2>
                        <p>A donor has updated their pending donation request.</p>
                        <div class="donation-card">
                            <h3>📋 Donor Information</h3>
                            <div class="item-row"><span><strong>Name:</strong></span><span>${donor?.name || 'Unknown'}</span></div>
                            <div class="item-row"><span><strong>Email:</strong></span><span>${donor?.email || 'Unknown'}</span></div>
                            <div class="item-row"><span><strong>Phone:</strong></span><span>${donor?.phone || 'Not provided'}</span></div>
                            <div class="item-row"><span><strong>District:</strong></span><span>${donor?.district || 'Unknown'}</span></div>
                            <div class="item-row"><span><strong>Hospital:</strong></span><span>${donation.hospitalName}</span></div>
                        </div>
                        <div class="comparison">
                            <div class="old-items">
                                <h4>📦 Previous Items</h4>
                                ${previousState.previousItems.map(item => `<div class="item-row"><span>${item.medicineName} (${item.weight}${item.unit})</span><span>${item.quantity} units</span></div>`).join('')}
                                <div class="item-row" style="margin-top: 10px; font-weight: bold;"><span>Total:</span><span>${previousState.previousTotalItems} items (${previousState.previousTotalQuantity} units)</span></div>
                            </div>
                            <div class="new-items">
                                <h4>🔄 Updated Items</h4>
                                ${donation.items.map(item => `<div class="item-row"><span>${item.medicineName} (${item.weight}${item.unit})</span><span>${item.quantity} units</span></div>`).join('')}
                                <div class="item-row" style="margin-top: 10px; font-weight: bold;"><span>Total:</span><span>${donation.totalItems} items (${donation.totalQuantity} units)</span></div>
                            </div>
                        </div>
                        ${donation.notes ? `<div style="margin-top: 20px; padding: 12px; background: #fef3c7; border-radius: 8px;"><strong>📝 Donor Notes:</strong><p style="margin-top: 8px;">${donation.notes}</p></div>` : ''}
                        <p style="margin-top: 20px;">Please review the updated donation in the admin dashboard.</p>
                    </div>
                    <div class="footer"><p>This is an automated notification from MediSync.</p></div>
                </div>
            </body>
            </html>
        `;
        
        return await sendEmail(adminEmail, `✏️ Donation Updated - ${donation.donationId}`, html);
    } catch (error) {
        console.error('Failed to send donation update email:', error);
        return { success: false, error: error.message };
    }
};

const sendDonationCancelledEmail = async (adminEmail, adminName, donation) => {
    try {
        const donor = await User.findById(donation.donorId);
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .donation-card { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 8px; }
                    .item-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header"><h1>❌ Donation Cancelled</h1><p>Donation ID: ${donation.donationId}</p></div>
                    <div class="content">
                        <h2>Hello ${adminName},</h2>
                        <p>A donor has cancelled their pending donation request.</p>
                        <div class="donation-card">
                            <h3>📋 Donor Information</h3>
                            <div class="item-row"><span><strong>Name:</strong></span><span>${donor?.name || 'Unknown'}</span></div>
                            <div class="item-row"><span><strong>Email:</strong></span><span>${donor?.email || 'Unknown'}</span></div>
                            <div class="item-row"><span><strong>Phone:</strong></span><span>${donor?.phone || 'Not provided'}</span></div>
                            <div class="item-row"><span><strong>District:</strong></span><span>${donor?.district || 'Unknown'}</span></div>
                            <div class="item-row"><span><strong>Hospital:</strong></span><span>${donation.hospitalName}</span></div>
                            <div class="item-row" style="margin-top: 10px;"><span><strong>Cancelled Items:</strong></span><span>${donation.totalItems} medicines (${donation.totalQuantity} units)</span></div>
                        </div>
                        <p>This donation is no longer available for approval.</p>
                    </div>
                    <div class="footer"><p>This is an automated notification from MediSync.</p></div>
                </div>
            </body>
            </html>
        `;
        
        return await sendEmail(adminEmail, `❌ Donation Cancelled - ${donation.donationId}`, html);
    } catch (error) {
        console.error('Failed to send donation cancelled email:', error);
        return { success: false, error: error.message };
    }
};

const sendDonationDeliveredEmail = async (adminEmail, adminName, donation, hospital, manager) => {
    try {
        const donor = await User.findById(donation.donorId);
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .donation-card { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }
                    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                    .button { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; }
                    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header"><h1>📦 Donation Delivered!</h1><p>Donation ID: ${donation.donationId}</p></div>
                    <div class="content">
                        <h2>Hello ${adminName},</h2>
                        <p>The hospital manager has confirmed receipt of the donation.</p>
                        <div class="donation-card">
                            <h3>📋 Donation Details</h3>
                            <div class="detail-row"><span><strong>Donor:</strong></span><span>${donor.name} (${donor.email})</span></div>
                            <div class="detail-row"><span><strong>Hospital:</strong></span><span>${hospital.name}</span></div>
                            <div class="detail-row"><span><strong>Manager Confirmed By:</strong></span><span>${manager.name}</span></div>
                            <div class="detail-row"><span><strong>Items:</strong></span><span>${donation.totalItems} medicines (${donation.totalQuantity} units)</span></div>
                            ${donation.managerNotes ? `<div class="detail-row"><span><strong>Manager Notes:</strong></span><span>${donation.managerNotes}</span></div>` : ''}
                        </div>
                        <p>Please review and complete the donation to generate the certificate.</p>
                    </div>
                    <div class="footer"><p>This is an automated notification from MediSync.</p></div>
                </div>
            </body>
            </html>
        `;
        
        return await sendEmail(adminEmail, `📦 Donation Delivered - ${donation.donationId}`, html);
    } catch (error) {
        console.error('Failed to send donation delivered email:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { 
    sendStockUpdateNotification,
    sendStockArrivalSubmittedToAdmins,
    sendStockArrivalApprovedToManager,
    sendStockArrivalRejectedToManager,
    sendTransferRequestEmail,
    sendTransferApprovedEmail,
    sendTransferCompletedEmail,
    sendTransferRejectedEmail,
    sendDonationEmail,
    sendDonationApprovalEmail,
    sendDonationRejectedEmail,
    sendDonationCertificateEmail,
    sendDonationNotificationToHospital,
    sendDonationCompletedNotification,
    sendDonationUpdateEmail,
    sendDonationCancelledEmail,
    sendDonationDeliveredEmail
};
