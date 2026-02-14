const db = require('./database');
const bcrypt = require('bcryptjs');

async function initializeAdmin() {
  try {
    console.log('🔧 Checking for initial admin setup...');
    
    // Check if any users exist
    const userCount = await new Promise((resolve, reject) => {
      db.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    
    if (userCount === 0) {
      console.log('📝 No users found. Creating initial admin user...');
      
      // Create default admin
      const defaultPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      await new Promise((resolve, reject) => {
        db.db.run(
          'INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
          ['admin', 'admin@localhost', hashedPassword, new Date().toISOString()],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      
      console.log('✅ Initial admin user created successfully!');
      console.log('📋 Login credentials:');
      console.log('   Username: admin');
      console.log('   Email: admin@localhost');
      console.log('   Password: admin123');
      console.log('');
      console.log('🌐 Access your app at: http://localhost:5000');
      console.log('⚠️  Remember to change the password after first login!');
      
    } else {
      console.log('✅ Users already exist. Skipping admin initialization.');
    }
    
  } catch (error) {
    console.error('❌ Error during admin initialization:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  initializeAdmin().then(() => {
    console.log('🎉 Admin initialization completed.');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Admin initialization failed:', error);
    process.exit(1);
  });
}

module.exports = initializeAdmin;
