const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const testEmail = async () => {
    console.log('=================================');
    console.log('📧 TESTING EMAIL CONFIGURATION');
    console.log('=================================\n');
    
    // Check if credentials exist
    if (!process.env.ETHEREAL_EMAIL || !process.env.ETHEREAL_PASSWORD) {
        console.error('❌ ERROR: ETHEREAL_EMAIL and ETHEREAL_PASSWORD are not set in .env file!');
        console.log('\nPlease run: node scripts/createEtherealAccount.js first');
        return;
    }
    
    console.log('Using credentials:');
    console.log(`📧 EMAIL: ${process.env.ETHEREAL_EMAIL}`);
    console.log(`🔑 PASSWORD: ${process.env.ETHEREAL_PASSWORD.substring(0, 10)}...\n`);
    
    // Create transporter
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: process.env.ETHEREAL_EMAIL,
            pass: process.env.ETHEREAL_PASSWORD
        }
    });
    
    // Verify connection
    try {
        console.log('🔌 Testing SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!\n');
    } catch (error) {
        console.error('❌ SMTP connection failed:', error.message);
        return;
    }
    
    // Send test email
    const mailOptions = {
        from: '"MediSync Test" <test@medisync.com>',
        to: 'recipient@example.com',
        subject: 'MediSync Email Test',
        html: `
            <h1>MediSync Email Test</h1>
            <p>If you're seeing this, your email configuration is working!</p>
            <p>This is a test email from MediSync.</p>
            <p>Sent at: ${new Date().toLocaleString()}</p>
        `
    };
    
    console.log('📧 Sending test email...');
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('\n✅ Email sent successfully!');
        console.log('📧 Message ID:', info.messageId);
        console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
        console.log('\n💡 Open the preview URL above to see the email in your browser.');
    } catch (error) {
        console.error('\n❌ Failed to send email:', error.message);
    }
};

testEmail();