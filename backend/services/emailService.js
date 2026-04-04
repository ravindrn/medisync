const { Resend } = require('resend');
const User = require('../models/User');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Main email sender
const sendEmail = async (to, subject, html) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'MediSync <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: html
        });
        
        if (error) throw error;
        console.log(`✅ Email sent to ${to}`);
        return { success: true };
    } catch (error) {
        console.error('Email failed:', error.message);
        return { success: false };
    }
};

// Send stock update notification email
const sendStockUpdateNotification = async (userEmail, userName, medicineName, strength, hospitalName, district, newQuantity) => {
    try {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: white;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #3b82f6, #2563eb);
                        color: white;
                        padding: 30px;
                        text-align: center;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 28px;
                    }
                    .content {
                        padding: 30px;
                    }
                    .medicine-card {
                        background-color: #f0f9ff;
                        border-left: 4px solid #3b82f6;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 0;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    .detail-label {
                        font-weight: bold;
                        color: #4b5563;
                    }
                    .detail-value {
                        color: #1f2937;
                    }
                    .stock-badge {
                        display: inline-block;
                        background-color: #10b981;
                        color: white;
                        padding: 5px 12px;
                        border-radius: 20px;
                        font-size: 14px;
                        font-weight: bold;
                    }
                    .footer {
                        background-color: #f8fafc;
                        padding: 20px;
                        text-align: center;
                        font-size: 12px;
                        color: #6b7280;
                    }
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
                            <h3 style="margin-top: 0;">📋 Medicine Details</h3>
                            <div class="detail-row"><span class="detail-label">Medicine Name:</span><span class="detail-value"><strong>${medicineName}</strong></span></div>
                            <div class="detail-row"><span class="detail-label">Strength:</span><span class="detail-value">${strength}</span></div>
                            <div class="detail-row"><span class="detail-label">Hospital:</span><span class="detail-value">${hospitalName}</span></div>
                            <div class="detail-row"><span class="detail-label">District:</span><span class="detail-value">${district}</span></div>
                            <div class="detail-row"><span class="detail-label">Available Quantity:</span><span class="detail-value"><span class="stock-badge">${newQuantity} units</span></span></div>
                        </div>
                        <p>You can now visit the hospital or check the MediSync portal for more details.</p>
                    </div>
                    <div class="footer"><p>This is an automated notification from MediSync.</p></div>
                </div>
            </body>
            </html>
        `;

        const result = await sendEmail(userEmail, `📦 Stock Update Alert: ${medicineName} is Now Available!`, html);
        if (result && result.success) {
            console.log(`✅ Email sent to ${userEmail} for ${medicineName}`);
            return { success: true };
        }
        return { success: false, error: 'Resend failed' };
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        return { success: false, error: error.message };
    }
};

// Send email to all admins when manager submits stock arrival request
const sendStockArrivalSubmittedToAdmins = async (requestData) => {
    try {
        const admins = await User.find({ role: 'admin', isActive: { $ne: false } }).select('name email');

        if (!admins || admins.length === 0) {
            console.log('⚠️ No active admin users found');
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
                <head><style>body { font-family: Arial, sans-serif; } .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; } .header { background: #f59e0b; color: white; padding: 30px; text-align: center; } .content { padding: 30px; } .card { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; } .detail-row { display: flex; justify-content: space-between; padding: 8px 0; } table { width: 100%; border-collapse: collapse; } th, td { padding: 10px; border: 1px solid #ddd; }</style></head>
                <body>
                    <div class="container">
                        <div class="header"><h1>🏥 MediSync</h1><p>New Stock Arrival Request</p></div>
                        <div class="content">
                            <h2>Hello ${admin.name},</h2>
                            <p>A hospital manager has submitted a new stock arrival request.</p>
                            <div class="card">
                                <div class="detail-row"><span><strong>Hospital:</strong></span><span>${requestData.hospitalName}</span></div>
                                <div class="detail-row"><span><strong>District:</strong></span><span>${requestData.hospitalDistrict}</span></div>
                                <div class="detail-row"><span><strong>Arrival Date:</strong></span><span>${requestData.arrivalDate ? new Date(requestData.arrivalDate).toLocaleString() : new Date().toLocaleString()}</span></div>
                            </div>
                            <h3>📋 Medicines</h3>
                            <table><thead><tr><th>#</th><th>Medicine</th><th>Strength</th><th>Quantity</th><th>Batch No</th><th>Expiry Date</th></tr></thead><tbody>${medicineRows}</tbody></table>
                        </div>
                        <div class="footer"><p>This is an automated notification from MediSync.</p></div>
                    </div>
                </body>
                </html>
            `;

            const result = await sendEmail(admin.email, `📦 New Stock Arrival Request - ${requestData.hospitalName}`, html);
            results.push({ email: admin.email, success: result?.success || false });
        }

        return { success: true, totalAdmins: admins.length, sentCount: results.filter(r => r.success).length };
    } catch (error) {
        console.error('❌ Failed:', error);
        return { success: false, error: error.message };
    }
};

const sendStockArrivalApprovedToManager = async (managerEmail, managerName, stockRequest, approvedMedicine, adminUser, updatedQuantity) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #10b981;">✅ Stock Arrival Approved</h2>
            <p>Hello ${managerName},</p>
            <p>Your stock arrival request has been <strong>APPROVED</strong>.</p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
                <p><strong>Medicine:</strong> ${approvedMedicine.medicineName}</p>
                <p><strong>Strength:</strong> ${approvedMedicine.weight}${approvedMedicine.unit}</p>
                <p><strong>Approved Quantity:</strong> +${approvedMedicine.quantity} units</p>
                <p><strong>Updated Stock:</strong> ${updatedQuantity} units</p>
                <p><strong>Approved By:</strong> ${adminUser.name}</p>
            </div>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        </body>
        </html>
    `;
    const result = await sendEmail(managerEmail, `✅ Stock Arrival Approved - ${approvedMedicine.medicineName}`, html);
    return result?.success ? { success: true } : { success: false };
};

const sendStockArrivalRejectedToManager = async (managerEmail, managerName, stockRequest, rejectedMedicine, adminUser, rejectionReason) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #ef4444;">❌ Stock Arrival Rejected</h2>
            <p>Hello ${managerName},</p>
            <p>Your stock arrival request has been <strong>REJECTED</strong>.</p>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px;">
                <p><strong>Medicine:</strong> ${rejectedMedicine.medicineName}</p>
                <p><strong>Strength:</strong> ${rejectedMedicine.weight}${rejectedMedicine.unit}</p>
                <p><strong>Quantity:</strong> ${rejectedMedicine.quantity} units</p>
                <p><strong>Reason:</strong> ${rejectionReason || 'No reason provided'}</p>
            </div>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        </body>
        </html>
    `;
    const result = await sendEmail(managerEmail, `❌ Stock Arrival Rejected - ${rejectedMedicine.medicineName}`, html);
    return result?.success ? { success: true } : { success: false };
};

// Transfer emails
const sendTransferRequestEmail = async (toHospitalManager, fromHospital, toHospital, medicines, requestId) => {
    const medicineList = medicines.map(m => `- ${m.medicineName} (${m.weight}${m.unit}): ${m.requestedQuantity} units`).join('<br>');
    const html = `<h2>New Transfer Request</h2><p>Request ID: ${requestId}</p><p>From: ${fromHospital.name}</p><p>To: ${toHospital.name}</p><p>Medicines:<br>${medicineList}</p>`;
    const result = await sendEmail(toHospitalManager.email, `📋 New Transfer Request from ${fromHospital.name}`, html);
    return result?.success ? { success: true } : { success: false };
};

const sendTransferApprovedEmail = async (requestingHospitalManager, fromHospital, toHospital, medicines, requestId) => {
    const medicineList = medicines.map(m => `- ${m.medicineName} (${m.weight}${m.unit}): ${m.approvedQuantity} units`).join('<br>');
    const html = `<h2>✅ Transfer Approved</h2><p>Request ID: ${requestId}</p><p>From: ${toHospital.name}</p><p>To: ${fromHospital.name}</p><p>Approved:<br>${medicineList}</p>`;
    const result = await sendEmail(requestingHospitalManager.email, `✅ Transfer Approved - ${requestId}`, html);
    return result?.success ? { success: true } : { success: false };
};

const sendTransferCompletedEmail = async (sendingHospitalManager, fromHospital, toHospital, medicines, requestId) => {
    const medicineList = medicines.map(m => `- ${m.medicineName} (${m.weight}${m.unit}): ${m.approvedQuantity} units`).join('<br>');
    const html = `<h2>✅ Transfer Completed</h2><p>Request ID: ${requestId}</p><p>From: ${toHospital.name}</p><p>To: ${fromHospital.name}</p><p>Transferred:<br>${medicineList}</p>`;
    const result = await sendEmail(sendingHospitalManager.email, `✅ Transfer Completed - ${requestId}`, html);
    return result?.success ? { success: true } : { success: false };
};

const sendTransferRejectedEmail = async (requestingHospitalManager, fromHospital, toHospital, reason, requestId) => {
    const html = `<h2>❌ Transfer Rejected</h2><p>Request ID: ${requestId}</p><p>To: ${toHospital.name}</p><p>Reason: ${reason || 'No reason provided'}</p>`;
    const result = await sendEmail(requestingHospitalManager.email, `❌ Transfer Rejected - ${requestId}`, html);
    return result?.success ? { success: true } : { success: false };
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
    const result = await sendEmail(email, `Thank You for Your Donation Pledge - MediSync`, html);
    return result?.success ? { success: true } : { success: false };
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
    const result = await sendEmail(email, `✅ Your Donation Has Been Approved! - MediSync`, html);
    return result?.success ? { success: true } : { success: false };
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
    const result = await sendEmail(email, `📋 Update on Your Donation - MediSync`, html);
    return result?.success ? { success: true } : { success: false };
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
    const result = await sendEmail(email, `🎉 Your Donation Certificate - MediSync`, html);
    return result?.success ? { success: true } : { success: false };
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
    const result = await sendEmail(email, `📦 New Donation Assigned to Your Hospital - MediSync`, html);
    return result?.success ? { success: true } : { success: false };
};

const sendDonationCompletedNotification = async (email, name, donation, donor) => {
    const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2 style="color: #10b981;">✅ Donation Completed!</h2>
            <p>The donation has been successfully completed.</p>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
                <p><strong>Donation ID:</strong> ${donation.donationId}</p>
                <p><strong>Donor:</strong> ${donor.name}</p>
                <p><strong>Items:</strong> ${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
            </div>
            <hr>
            <p style="font-size: 12px; color: #666;">MediSync - University Project</p>
        </div>
    `;
    const result = await sendEmail(email, `✅ Donation Completed - ${donation.donationId}`, html);
    return result?.success ? { success: true } : { success: false };
};

const sendDonationUpdateEmail = async (adminEmail, adminName, donation, donorId, previousState) => {
    try {
        const donor = await User.findById(donorId);
        const html = `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #f59e0b;">✏️ Donation Updated</h2>
                <p>A donor has updated their donation request.</p>
                <div style="background: #fffbeb; padding: 15px; border-radius: 8px;">
                    <p><strong>Donor:</strong> ${donor?.name || 'Unknown'}</p>
                    <p><strong>Donation ID:</strong> ${donation.donationId}</p>
                    <p><strong>Items:</strong> ${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
                </div>
                <p>Please review in the admin dashboard.</p>
            </div>
        `;
        const result = await sendEmail(adminEmail, `✏️ Donation Updated - ${donation.donationId}`, html);
        return result?.success ? { success: true } : { success: false };
    } catch (error) {
        return { success: false };
    }
};

const sendDonationCancelledEmail = async (adminEmail, adminName, donation) => {
    try {
        const donor = await User.findById(donation.donorId);
        const html = `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #ef4444;">❌ Donation Cancelled</h2>
                <p>A donor has cancelled their donation request.</p>
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px;">
                    <p><strong>Donor:</strong> ${donor?.name || 'Unknown'}</p>
                    <p><strong>Donation ID:</strong> ${donation.donationId}</p>
                    <p><strong>Items:</strong> ${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
                </div>
            </div>
        `;
        const result = await sendEmail(adminEmail, `❌ Donation Cancelled - ${donation.donationId}`, html);
        return result?.success ? { success: true } : { success: false };
    } catch (error) {
        return { success: false };
    }
};

const sendDonationDeliveredEmail = async (adminEmail, adminName, donation, hospital, manager) => {
    try {
        const donor = await User.findById(donation.donorId);
        const html = `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #10b981;">📦 Donation Delivered!</h2>
                <p>The hospital manager has confirmed receipt.</p>
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
                    <p><strong>Donor:</strong> ${donor.name}</p>
                    <p><strong>Hospital:</strong> ${hospital.name}</p>
                    <p><strong>Items:</strong> ${donation.totalItems} medicines (${donation.totalQuantity} units)</p>
                </div>
                <p>Please complete the donation to generate the certificate.</p>
            </div>
        `;
        const result = await sendEmail(adminEmail, `📦 Donation Delivered - ${donation.donationId}`, html);
        return result?.success ? { success: true } : { success: false };
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
