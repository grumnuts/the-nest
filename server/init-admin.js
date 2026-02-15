const Database = require('./database');
const bcrypt = require('bcryptjs');
const db = new Database();

async function initializeAdmin() {
  try {
    console.log('🔧 Checking for initial admin setup...');
    
    // Check if admin user already exists
    const existingAdmin = await new Promise((resolve, reject) => {
      db.db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists. Verifying password and admin status...');
      
      // Ensure admin flag is set for existing admin user
      if (!existingAdmin.is_admin) {
        await new Promise((resolve, reject) => {
          db.db.run('UPDATE users SET is_admin = 1 WHERE username = ?', ['admin'], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('✅ Admin flag set for existing admin user');
      }
      
      // Test if password works
      const isValid = await bcrypt.compare('admin123', existingAdmin.password_hash);
      if (isValid) {
        console.log('✅ Admin password is correct');
      } else {
        console.log('⚠️  Admin password incorrect, resetting...');
        const newHash = await bcrypt.hash('admin123', 10);
        await new Promise((resolve, reject) => {
          db.db.run('UPDATE users SET password_hash = ?, is_admin = 1 WHERE username = ?', [newHash, 'admin'], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('✅ Admin password reset successfully');
      }
    } else {
      console.log('📝 No admin user found. Creating initial admin user...');
      
      // Create default admin
      const defaultPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      const userId = await new Promise((resolve, reject) => {
        db.db.run(
          'INSERT INTO users (username, email, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?)',
          ['admin', 'admin@localhost', hashedPassword, 1, new Date().toISOString()],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
      
      // Verify the admin was created correctly
      const createdAdmin = await new Promise((resolve, reject) => {
        db.db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (createdAdmin) {
        const isValid = await bcrypt.compare('admin123', createdAdmin.password_hash);
        if (isValid) {
          console.log('✅ Initial admin user created and verified successfully!');
          console.log('📋 Login credentials:');
          console.log('   Username: admin');
          console.log('   Email: admin@localhost');
          console.log('   Password: admin123');
          console.log('');
          console.log('🌐 Access your app at: http://localhost:5000');
          console.log('⚠️  Remember to change the password after first login!');
        } else {
          console.error('❌ Admin password verification failed!');
        }
      } else {
        console.error('❌ Failed to retrieve created admin user!');
      }
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
