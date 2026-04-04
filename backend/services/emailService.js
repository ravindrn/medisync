const nodemailer = require('nodemailer');
const User = require('../models/User');

let transporter = null;
let previewUrl = null;

// Create ethereal transporter (works on Render!)
const initTransporter = async () => {
    try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        console.log('✅ Ethereal email ready');
        console.log(`📧 Preview URL will be shown for each email`);
        return true;
    } catch (error) {
        console.error('Ethereal init failed:', error);
        return false;
    }
};

// Initialize on startup
initTransporter();

// Main email sender
const sendEmail = async (to, subject, html) => {
    if (!transporter) {
        console.log('⚠️ Transporter not ready, initializing...');
        await initTransporter();
        if (!transporter) return { success: false, error: 'Transporter not available' };
    }
    
    try {
        const info = await transporter.sendMail({
            from: '"MediSync" <medisync@ethereal.email>',
            to: to,
            subject: subject,
            html: html
        });
        
        const preview = nodemailer.getTestMessageUrl(info);
        console.log(`✅ Email would be sent to: ${to}`);
        console.log(`📧 Preview URL (for viva demonstration): ${preview}`);
        
        return { 
            success: true, 
            previewUrl: preview,
            message: `Email would be sent to ${to}. View at: ${preview}`
        };
    } catch (error) {
        console.error('Email failed:', error.message);
        return { success: false, error: error.message };
    }
};

// Send stock update notification email
const sendStockUpdateNotification = async (userEmail, userName, medicineName, strength, hospitalName, district, newQuantity) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; }
                .content { padding: 30px; }
                .medicine-card { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                .stock-badge { display: inline-block; background: #10b981; color: white; padding: 5px 12px; border-radius: 20px; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>🏥 MediSync</h1><p>Medicine Stock Alert</p></div>
                <div class="content">
                    <h2>Hello ${userName}!</h2>
                    <p>Good news! The medicine you requested is now available.</p>
                    <div class="medicine-card">
                        <div class="detail-row"><strong>Medicine:</strong> <span>${medicineName} (${strength})</span></div>
                        <div class="detail-row"><strong>Hospital:</strong> <span>${hospitalName}</span></div>
                        <div class="detail-row"><strong>District:</strong> <span>${district}</span></div>
                        <div class="detail-row"><strong>Available:</strong> <span class="stock-badge">${newQuantity} units</span></div>
                    </div>
                </div>
                <div class="footer"><p>This is an automated notification from MediSync.</p></div>
            </div>
        </body>
        </html>
    `;
    return await sendEmail(userEmail, `📦 Stock Update: ${medicineName} is Now Available!`, html);
};

// Send email to all admins
const sendStockArrivalSubmittedToAdmins = async (requestData) => {
    try {
        const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('name email');
        if (!admins || admins.length === 0) return { success: false, error: 'No admins found' };

        const medicineRows = requestData.medicines.map((med, index) => `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${med.medicineName}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${med.weight}${med.unit}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${med.quantity} units</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${med.batchNumber || 'N/A'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : 'N/A'}</td>
            </tr>
        `).join('');

        const results = [];
        for (const admin of admins) {
            const html = `
                <h2>📦 New Stock Arrival Request</h2>
                <p><strong>Hospital:</strong> ${requestData.hospitalName}</p>
                <p><strong>District:</strong> ${requestData.hospitalDistrict}</p>
                <p><strong>Arrival Date:</strong> ${requestData.arrivalDate ? new Date(requestData.arrivalDate).toLocaleString() : new Date().toLocaleString()}</p>
                <h3>Medicines:</h3>
                <table border="1" cellpadding="8" style="border-collapse: collapse;">
                    <thead><tr><th>#</th><th>Medicine</th><th>Strength</th><th>Quantity</th><th>Batch No</th><th>Expiry Date</th></tr></thead>
                    <tbody>${medicineRows}</tbody>
                </table>
                ${requestData.notes ? `<p><strong>Notes:</strong> ${requestData.notes}</p>` : ''}
                <hr>
                <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
            `;
            const result = await sendEmail(admin.email, `📦 New Stock Arrival Request - ${requestData.hospitalName}`, html);
            results.push({ email: admin.email, success: result.success, previewUrl: result.previewUrl });
        }
        return { success: true, sentCount: results.filter(r => r.success).length, results };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const sendStockArrivalApprovedToManager = async (managerEmail, managerName, stockRequest, approvedMedicine, adminUser, updatedQuantity) => {
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #10b981;">✅ Stock Arrival Approved</h2>
            <p>Hello ${managerName},</p>
            <p>Your stock arrival request has been <strong style="color:green;">APPROVED</strong>.</p>
            <div style="background:#f0fdf4; padding:15px; border-radius:8px;">
                <p><strong>Medicine:</strong> ${approvedMedicine.medicineName}</p>
                <p><strong>Strength:</strong> ${approvedMedicine.weight}${approvedMedicine.unit}</p>
                <p><strong>Approved Quantity:</strong> +${approvedMedicine.quantity} units</p>
                <p><strong>Updated Stock:</strong> ${updatedQuantity} units</p>
                <p><strong>Approved By:</strong> ${adminUser.name}</p>
            </div>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        </div>
    `;
    return await sendEmail(managerEmail, `✅ Stock Arrival Approved - ${approvedMedicine.medicineName}`, html);
};

const sendStockArrivalRejectedToManager = async (managerEmail, managerName, stockRequest, rejectedMedicine, adminUser, rejectionReason) => {
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #ef4444;">❌ Stock Arrival Rejected</h2>
            <p>Hello ${managerName},</p>
            <p>Your stock arrival request has been <strong style="color:red;">REJECTED</strong>.</p>
            <div style="background:#fef2f2; padding:15px; border-radius:8px;">
                <p><strong>Medicine:</strong> ${rejectedMedicine.medicineName}</p>
                <p><strong>Strength:</strong> ${rejectedMedicine.weight}${rejectedMedicine.unit}</p>
                <p><strong>Quantity:</strong> ${rejectedMedicine.quantity} units</p>
                <p><strong>Reason:</strong> ${rejectionReason || 'No reason provided'}</p>
            </div>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        </div>
    `;
    return await sendEmail(managerEmail, `❌ Stock Arrival Rejected - ${rejectedMedicine.medicineName}`, html);
};

// Transfer emails
const sendTransferRequestEmail = async (toHospitalManager, fromHospital, toHospital, medicines, requestId) => {
    const medicineList = medicines.map(m => `- ${m.medicineName} (${m.weight}${m.unit}): ${m.requestedQuantity} units`).join('<br>');
    const html = `
        <h2>📋 New Transfer Request</h2>
        <p><strong>Request ID:</strong> ${requestId}</p>
        <p><strong>From:</strong> ${fromHospital.name} (${fromHospital.district})</p>
        <p><strong>To:</strong> ${toHospital.name} (${toHospital.district})</p>
        <p><strong>Medicines Requested:</strong><br>${medicineList}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
    `;
    return await sendEmail(toHospitalManager.email, `📋 New Transfer Request from ${fromHospital.name}`, html);
};

const sendTransferApprovedEmail = async (requestingHospitalManager, fromHospital, toHospital, medicines, requestId) => {
    const medicineList = medicines.map(m => `- ${m.medicineName} (${m.weight}${m.unit}): ${m.approvedQuantity} units`).join('<br>');
    const html = `
        <h2>✅ Transfer Approved</h2>
        <p><strong>Request ID:</strong> ${requestId}</p>
        <p><strong>From:</strong> ${toHospital.name}</p>
        <p><strong>To:</strong> ${fromHospital.name}</p>
        <p><strong>Approved Medicines:</strong><br>${medicineList}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
    `;
    return await sendEmail(requestingHospitalManager.email, `✅ Transfer Approved - ${requestId}`, html);
};

const sendTransferCompletedEmail = async (sendingHospitalManager, fromHospital, toHospital, medicines, requestId) => {
    const medicineList = medicines.map(m => `- ${m.medicineName} (${m.weight}${m.unit}): ${m.approvedQuantity} units`).join('<br>');
    const html = `
        <h2>✅ Transfer Completed</h2>
        <p><strong>Request ID:</strong> ${requestId}</p>
        <p><strong>From:</strong> ${toHospital.name}</p>
        <p><strong>To:</strong> ${fromHospital.name}</p>
        <p><strong>Medicines Transferred:</strong><br>${medicineList}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
    `;
    return await sendEmail(sendingHospitalManager.email, `✅ Transfer Completed - ${requestId}`, html);
};

const sendTransferRejectedEmail = async (requestingHospitalManager, fromHospital, toHospital, reason, requestId) => {
    const html = `
        <h2>❌ Transfer Rejected</h2>
        <p><strong>Request ID:</strong> ${requestId}</p>
        <p><strong>To:</strong> ${toHospital.name}</p>
        <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
    `;
    return await sendEmail(requestingHospitalManager.email, `❌ Transfer Rejected - ${requestId}`, html);
};

// Donation emails
const sendDonationEmail = async (email, name, donation) => {
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #10b981;">❤️ Thank You, ${name}!</h2>
            <p>Your donation pledge has been received and is pending review.</p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
                <p><strong>Donation ID:</strong> ${donation.donationId}</p>
                <p><strong>Hospital:</strong> ${donation.hospitalName}</p>
                <p><strong>Items:</strong> ${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
                <p><strong>Status:</strong> Pending Review</p>
            </div>
            <p>We will notify you once your donation is approved.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        </div>
    `;
    return await sendEmail(email, `Thank You for Your Donation Pledge - MediSync`, html);
};

const sendDonationApprovalEmail = async (email, name, donation, hospital) => {
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #10b981;">✅ Great News, ${name}!</h2>
            <p>Your donation has been <strong>APPROVED</strong>!</p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
                <p><strong>Donation ID:</strong> ${donation.donationId}</p>
                <p><strong>Hospital:</strong> ${donation.hospitalName}</p>
                <p><strong>Items:</strong> ${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
            </div>
            <p>Please coordinate with the hospital for delivery arrangements.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        </div>
    `;
    return await sendEmail(email, `✅ Your Donation Has Been Approved! - MediSync`, html);
};

const sendDonationRejectedEmail = async (email, name, donation, reason) => {
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #ef4444;">📋 Update on Your Donation</h2>
            <p>Dear ${name}, your donation could not be approved.</p>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px;">
                <p><strong>Donation ID:</strong> ${donation.donationId}</p>
                <p><strong>Reason:</strong> ${reason || 'No specific reason provided'}</p>
            </div>
            <p>You may submit a new donation request.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        </div>
    `;
    return await sendEmail(email, `📋 Update on Your Donation - MediSync`, html);
};

const sendDonationCertificateEmail = async (email, name, donation, certificate) => {
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #f59e0b;">🎉 Congratulations, ${name}!</h2>
            <p>Your donation certificate is ready!</p>
            <div style="background: #fffbeb; padding: 15px; border-radius: 8px; text-align: center;">
                <h3>🏆 Certificate of Appreciation</h3>
                <p>Donation ID: ${donation.donationId}</p>
                <p>${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
                <p>To: ${donation.hospitalName}</p>
            </div>
            <p>You can download your certificate from your donor portal.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        </div>
    `;
    return await sendEmail(email, `🎉 Your Donation Certificate - MediSync`, html);
};

const sendDonationNotificationToHospital = async (email, name, donation, donor) => {
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #3b82f6;">📦 New Donation Assigned</h2>
            <p>A new donation has been assigned to your hospital!</p>
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px;">
                <p><strong>Donation ID:</strong> ${donation.donationId}</p>
                <p><strong>Donor:</strong> ${donor.name} (${donor.email})</p>
                <p><strong>Items:</strong> ${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
            </div>
            <p>Please coordinate with the donor for delivery.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        </div>
    `;
    return await sendEmail(email, `📦 New Donation Assigned to Your Hospital - MediSync`, html);
};

const sendDonationCompletedNotification = async (email, name, donation, donor) => {
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #10b981;">✅ Donation Completed!</h2>
            <p>The donation has been successfully completed.</p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
                <p><strong>Donation ID:</strong> ${donation.donationId}</p>
                <p><strong>Donor:</strong> ${donor.name}</p>
                <p><strong>Items Received:</strong> ${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
            </div>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        </div>
    `;
    return await sendEmail(email, `✅ Donation Completed - ${donation.donationId}`, html);
};

const sendDonationUpdateEmail = async (adminEmail, adminName, donation, donorId, previousState) => {
    try {
        const donor = await User.findById(donorId);
        const html = `
            <h2>✏️ Donation Updated</h2>
            <p>A donor has updated their donation request.</p>
            <div style="background:#fffbeb; padding:15px; border-radius:8px;">
                <p><strong>Donor:</strong> ${donor?.name || 'Unknown'}</p>
                <p><strong>Donation ID:</strong> ${donation.donationId}</p>
                <p><strong>Items:</strong> ${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
            </div>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        `;
        return await sendEmail(adminEmail, `✏️ Donation Updated - ${donation.donationId}`, html);
    } catch (error) {
        return { success: false };
    }
};

const sendDonationCancelledEmail = async (adminEmail, adminName, donation) => {
    try {
        const donor = await User.findById(donation.donorId);
        const html = `
            <h2>❌ Donation Cancelled</h2>
            <p>A donor has cancelled their donation request.</p>
            <div style="background:#fef2f2; padding:15px; border-radius:8px;">
                <p><strong>Donor:</strong> ${donor?.name || 'Unknown'}</p>
                <p><strong>Donation ID:</strong> ${donation.donationId}</p>
                <p><strong>Items:</strong> ${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
            </div>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        `;
        return await sendEmail(adminEmail, `❌ Donation Cancelled - ${donation.donationId}`, html);
    } catch (error) {
        return { success: false };
    }
};

const sendDonationDeliveredEmail = async (adminEmail, adminName, donation, hospital, manager) => {
    try {
        const donor = await User.findById(donation.donorId);
        const html = `
            <h2>📦 Donation Delivered!</h2>
            <p>The hospital manager has confirmed receipt.</p>
            <div style="background:#f0fdf4; padding:15px; border-radius:8px;">
                <p><strong>Donor:</strong> ${donor.name}</p>
                <p><strong>Hospital:</strong> ${hospital.name}</p>
                <p><strong>Items:</strong> ${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
            </div>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        `;
        return await sendEmail(adminEmail, `📦 Donation Delivered - ${donation.donationId}`, html);
    } catch (error) {
        return { success: false };
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
