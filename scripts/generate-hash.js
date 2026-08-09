const bcrypt = require('bcryptjs');

const password = 'Admin@123456';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error generating hash:', err);
        return;
    }
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('');
    console.log('Copy this SQL:');
    console.log(`UPDATE admins SET password_hash = '${hash}' WHERE uid = 'superadmin@tgllbd.com';`);
    console.log(`UPDATE admins SET password_hash = '${hash}' WHERE uid = 'admin@tgllbd.com';`);
});
