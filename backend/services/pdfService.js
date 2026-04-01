const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure directories exist
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Generate Transfer Document PDF
const generateTransferDocument = async (transfer, type = 'transfer') => {
    return new Promise((resolve, reject) => {
        try {
            // Create documents directory if it doesn't exist
            const docsDir = path.join(__dirname, '../documents');
            ensureDirectoryExists(docsDir);
            
            const fileName = `${type}_${transfer.requestId}_${Date.now()}.pdf`;
            const filePath = path.join(docsDir, fileName);
            
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const stream = fs.createWriteStream(filePath);
            
            doc.pipe(stream);
            
            // Colors
            const colors = {
                primary: '#3b82f6',
                success: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444',
                dark: '#1f2937',
                medium: '#374151',
                light: '#6b7280',
                background: '#f3f4f6',
                border: '#e5e7eb',
                info: '#e0f2fe',
                infoBorder: '#0284c7'
            };
            
            const fonts = {
                bold: 'Helvetica-Bold',
                regular: 'Helvetica',
                italic: 'Helvetica-Oblique'
            };
            
            // Header
            doc.rect(0, 0, doc.page.width, 80).fill(colors.primary);
            doc.fillColor('white')
               .fontSize(24)
               .font(fonts.bold)
               .text('MediSync', 50, 25);
            doc.fontSize(12)
               .font(fonts.regular)
               .text('Medicine Transfer Document', 50, 55);
            
            // Document Title
            doc.fillColor(colors.dark)
               .fontSize(18)
               .font(fonts.bold)
               .text(`${type === 'transfer' ? 'Transfer' : 'Rejection'} Document`, 50, 100);
            
            // Document ID
            doc.fontSize(10)
               .font(fonts.regular)
               .fillColor(colors.light)
               .text(`Document ID: ${transfer.requestId}`, 50, 125);
            
            // Date
            doc.fillColor(colors.light)
               .fontSize(10)
               .font(fonts.regular)
               .text(`Date: ${new Date().toLocaleString()}`, 400, 140, { align: 'right' });
            
            // Status Badge
            let statusColor = colors.warning;
            let statusText = 'PENDING';
            if (transfer.status === 'completed') {
                statusColor = colors.success;
                statusText = 'COMPLETED';
            }
            if (transfer.status === 'rejected') {
                statusColor = colors.danger;
                statusText = 'REJECTED';
            }
            if (transfer.status === 'approved') {
                statusColor = colors.success;
                statusText = 'APPROVED';
            }
            
            doc.rect(50, 165, 100, 25).fill(statusColor);
            doc.fillColor('white')
               .fontSize(10)
               .font(fonts.bold)
               .text(statusText, 70, 172);
            
            // EXPLANATION SECTION - Clear direction of transfer
            doc.fillColor(colors.info)
               .rect(50, 205, 500, 55)
               .fill();
            doc.strokeColor(colors.infoBorder)
               .lineWidth(2)
               .rect(50, 205, 500, 55)
               .stroke();
            
            // Arrow and explanation (no emojis)
            doc.fillColor(colors.primary)
               .fontSize(12)
               .font(fonts.bold)
               .text('Transfer Direction', 60, 215);
            
            doc.fillColor(colors.medium)
               .fontSize(9)
               .font(fonts.regular)
               .text('This document shows medicines being SENT from the hospital on the LEFT to the hospital on the RIGHT.', 60, 235)
               .text('The "Sending Hospital" deducts stock, and the "Receiving Hospital" adds stock upon confirmation.', 60, 250);
            
            // Hospitals Information Section with clear labels
            doc.fillColor(colors.dark)
               .fontSize(14)
               .font(fonts.bold)
               .text('Transfer Details', 50, 285);
            
            doc.strokeColor(colors.border)
               .lineWidth(1)
               .moveTo(50, 295)
               .lineTo(550, 295)
               .stroke();
            
            // Sending Hospital (Left side with arrow)
            doc.fillColor(colors.danger)
               .fontSize(11)
               .font(fonts.bold)
               .text('>> SENDING HOSPITAL', 50, 310);
            doc.fillColor(colors.light)
               .fontSize(10)
               .font(fonts.regular)
               .text(transfer.toHospital.name, 50, 330)
               .text(`District: ${transfer.toHospital.district}`, 50, 345);
            
            // Arrow between hospitals
            doc.fillColor(colors.primary)
               .fontSize(18)
               .font(fonts.bold)
               .text('-->', 300, 338);
            
            // Receiving Hospital (Right side)
            doc.fillColor(colors.success)
               .fontSize(11)
               .font(fonts.bold)
               .text('RECEIVING HOSPITAL <<', 350, 310);
            doc.fillColor(colors.light)
               .fontSize(10)
               .font(fonts.regular)
               .text(transfer.fromHospital.name, 350, 330)
               .text(`District: ${transfer.fromHospital.district}`, 350, 345);
            
            // Medicines Section
            doc.fillColor(colors.dark)
               .fontSize(14)
               .font(fonts.bold)
               .text('Medicines Details', 50, 380);
            
            doc.strokeColor(colors.border)
               .lineWidth(1)
               .moveTo(50, 390)
               .lineTo(550, 390)
               .stroke();
            
            // Table Header
            const tableTop = 405;
            const col1 = 50;
            const col2 = 200;
            const col3 = 300;
            const col4 = 400;
            const col5 = 480;
            
            doc.fillColor(colors.background)
               .rect(col1, tableTop, 500, 28)
               .fill();
            doc.fillColor(colors.medium)
               .fontSize(10)
               .font(fonts.bold)
               .text('Medicine', col1 + 5, tableTop + 8)
               .text('Strength', col2 + 5, tableTop + 8)
               .text('Requested', col3 + 5, tableTop + 8)
               .text('Approved', col4 + 5, tableTop + 8)
               .text('Status', col5 + 5, tableTop + 8);
            
            // Table Rows
            let y = tableTop + 35;
            transfer.medicines.forEach((medicine, index) => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                    
                    // Repeat header on new page
                    doc.fillColor(colors.background)
                       .rect(col1, y, 500, 28)
                       .fill();
                    doc.fillColor(colors.medium)
                       .fontSize(10)
                       .font(fonts.bold)
                       .text('Medicine', col1 + 5, y + 8)
                       .text('Strength', col2 + 5, y + 8)
                       .text('Requested', col3 + 5, y + 8)
                       .text('Approved', col4 + 5, y + 8)
                       .text('Status', col5 + 5, y + 8);
                    y += 35;
                }
                
                const status = medicine.status || 'pending';
                let statusColor = colors.warning;
                let statusText = 'Pending';
                if (status === 'approved') {
                    statusColor = colors.success;
                    statusText = 'Approved';
                }
                if (status === 'rejected') {
                    statusColor = colors.danger;
                    statusText = 'Rejected';
                }
                
                doc.fillColor(colors.dark)
                   .fontSize(9)
                   .font(fonts.regular)
                   .text(medicine.medicineName, col1 + 5, y)
                   .text(`${medicine.weight}${medicine.unit}`, col2 + 5, y)
                   .text(`${medicine.requestedQuantity} units`, col3 + 5, y);
                
                // Approved quantity
                if (medicine.approvedQuantity && medicine.approvedQuantity > 0) {
                    doc.fillColor(colors.success)
                       .text(`${medicine.approvedQuantity} units`, col4 + 5, y);
                } else {
                    doc.fillColor(colors.light)
                       .text('-', col4 + 5, y);
                }
                
                // Status badge in table
                doc.fillColor(statusColor)
                   .rect(col5 + 5, y - 2, 70, 16)
                   .fill();
                doc.fillColor('white')
                   .fontSize(8)
                   .font(fonts.bold)
                   .text(statusText, col5 + 12, y);
                
                y += 25;
            });
            
            // Summary Section
            const totalRequested = transfer.medicines.reduce((sum, m) => sum + m.requestedQuantity, 0);
            const totalApproved = transfer.medicines.reduce((sum, m) => sum + (m.approvedQuantity || 0), 0);
            
            y += 15;
            doc.fillColor(colors.dark)
               .fontSize(12)
               .font(fonts.bold)
               .text('Summary', 50, y);
            
            y += 15;
            doc.fillColor(colors.medium)
               .fontSize(10)
               .font(fonts.regular)
               .text(`Total Requested: ${totalRequested} units`, 50, y);
            y += 20;
            doc.text(`Total Approved: ${totalApproved} units`, 50, y);
            
            // Stock Movement Explanation
            y += 25;
            doc.fillColor(colors.info)
               .rect(50, y, 500, 50)
               .fill();
            doc.strokeColor(colors.infoBorder)
               .lineWidth(1)
               .rect(50, y, 500, 50)
               .stroke();
            
            doc.fillColor(colors.primary)
               .fontSize(10)
               .font(fonts.bold)
               .text('Stock Movement Summary', 60, y + 8);
            doc.fillColor(colors.medium)
               .fontSize(9)
               .font(fonts.regular)
               .text('- Sending Hospital: Stock DEDUCTED for approved medicines', 60, y + 28)
               .text('- Receiving Hospital: Stock ADDED upon confirmation of receipt', 60, y + 42);
            
            if (transfer.status === 'completed') {
                y += 65;
                doc.fillColor(colors.success)
                   .fontSize(10)
                   .font(fonts.bold)
                   .text('TRANSFER COMPLETED - Stock has been successfully transferred and updated.', 50, y);
            } else if (transfer.status === 'rejected') {
                y += 65;
                doc.fillColor(colors.danger)
                   .fontSize(10)
                   .font(fonts.bold)
                   .text('TRANSFER REJECTED - No stock was transferred.', 50, y);
                if (transfer.rejectionReason) {
                    y += 15;
                    doc.fillColor(colors.danger)
                       .fontSize(9)
                       .text(`Reason: ${transfer.rejectionReason}`, 50, y);
                }
            }
            
            // Footer
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                doc.fillColor(colors.light)
                   .fontSize(8)
                   .text(
                       `Generated by MediSync - ${new Date().toLocaleString()}`,
                       50,
                       doc.page.height - 30,
                       { align: 'center', width: doc.page.width - 100 }
                   );
            }
            
            doc.end();
            
            stream.on('finish', () => {
                resolve({ success: true, filePath, fileName });
            });
            
            stream.on('error', (error) => {
                reject(error);
            });
            
        } catch (error) {
            reject(error);
        }
    });
};

// Generate Rejection Document
const generateRejectionDocument = async (transfer, reason) => {
    return generateTransferDocument({
        ...transfer.toObject(),
        rejectionReason: reason,
        status: 'rejected'
    }, 'rejection');
};

module.exports = {
    generateTransferDocument,
    generateRejectionDocument
};