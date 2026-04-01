const nodemailer = require('nodemailer');

nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Error creating test account:', err);
        return;
    }
    
    console.log('\n=================================');
    console.log('✅ ETHEREAL TEST ACCOUNT CREATED');
    console.log('=================================\n');
    console.log('📧 EMAIL:', account.user);
    console.log('🔑 PASSWORD:', account.pass);
    console.log('\n📝 Add these to your .env file:\n');
    console.log(`ETHEREAL_EMAIL=${account.user}`);
    console.log(`ETHEREAL_PASSWORD=${account.pass}`);
    console.log('\n🔗 View emails at: https://ethereal.email/login');
    console.log(`   Email: ${account.user}`);
    console.log(`   Password: ${account.pass}\n`);
});