#!/usr/bin/env node

const db = require('./server/database');
const bcrypt = require('bcryptjs');

// Get command line arguments
const args = process.argv.slice(2);
const username = args[0] || 'admin';
const password = args[1] || 'admin123';

async function createAdmin() {
  try {
    console.log(`🔧 Creating admin user: ${username}`);
    
    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingUser) {
      console.log(`❌ User '${username}' already exists!`);
      process.exit(1);
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await new Promise((resolve, reject) => {
      db.db.run(
        'INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
        [username, `${username}@localhost`, hashedPassword, new Date().toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📋 Login credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${username}@localhost`);
    console.log(`   Password: ${password}`);
    console.log('');
    console.log('🌐 Access your app at: http://localhost:5000');
    console.log('⚠️  Remember to change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
}

// Show usage if no arguments or help requested
if (args.includes('--help') || args.includes('-h')) {
  console.log('📖 Usage: node create-admin.js [username] [password]');
  console.log('');
  console.log('Examples:');
  console.log('  node create-admin.js                    # Default: admin/admin123');
  console.log('  node create-admin.js myadmin mypass      # Custom credentials');
  console.log('  node create-admin.js admin securepass    # Custom admin');
  process.exit(0);
}

createAdmin();
