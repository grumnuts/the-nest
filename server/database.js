const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Generate a local timestamp string respecting the TZ environment variable
// SQLite's CURRENT_TIMESTAMP always returns UTC regardless of TZ
function localNow() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Use /app/data directory in Docker, local directory otherwise
// Check if we're in Docker by looking for the Docker-specific path or environment
const isDocker = process.env.DOCKER_ENV === 'true' || fs.existsSync('/.dockerenv') || process.env.NODE_ENV === 'production';
const dataDir = isDocker ? '/app/data' : __dirname;
const dbPath = path.join(dataDir, 'the_nest.db');
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (error) {
  console.error('Failed to setup data directory:', error.message);
  // In Docker production, this is a critical error
  if (isDocker) {
    process.exit(1);
  }
}

class Database {
  constructor() {
    console.log(`🗄️  Initializing database at: ${dbPath}`);
    console.log(`🐳 Docker environment: ${isDocker ? 'YES' : 'NO'}`);
    console.log(`📁 Data directory: ${dataDir}`);
    console.log(`🔍 Checking if data directory exists: ${fs.existsSync(dataDir) ? 'YES' : 'NO'}`);
    
    // Check if database directory is accessible before attempting to open
    try {
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        throw new Error(`Database directory does not exist: ${dbDir}`);
      }
    } catch (checkError) {
      console.error('❌ Database directory check failed:', checkError.message);
      if (isDocker) {
        console.error('🐳 Docker environment detected, but data directory is not accessible');
        console.error('💡 Please check your volume mount: /app/data should be mounted to a writable host directory');
      }
      throw checkError;
    }
    
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        // In Docker production, this is a critical error
        if (isDocker) {
          console.error('🐳 Docker environment detected, database creation failed');
          console.error('💡 Please check volume permissions and disk space');
          process.exit(1);
        }
        return;
      }
      
      this.initialize();
    });
  }

  initialize() {
    this.db.serialize(() => {
      // Users table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          is_admin BOOLEAN DEFAULT 0,
          hide_goals BOOLEAN DEFAULT 0,
          hide_completed_tasks BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Lists table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          reset_period TEXT NOT NULL CHECK (reset_period IN ('daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'annually', 'static')),
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_reset DATETIME,
          is_active BOOLEAN DEFAULT 1,
          sort_order INTEGER DEFAULT 0,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `);

      // Ensure lists.reset_period allows fortnightly in existing databases
      this.db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='lists'", (err, row) => {
        if (err) {
          console.error('Error reading lists schema:', err);
          return;
        }

        if (row?.sql && !row.sql.includes('fortnightly')) {
          this.db.serialize(() => {
            this.db.run('PRAGMA foreign_keys=off');
            this.db.run('BEGIN TRANSACTION');
            this.db.run(`
              CREATE TABLE IF NOT EXISTS lists_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                reset_period TEXT NOT NULL CHECK (reset_period IN ('daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'annually', 'static')),
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_reset DATETIME,
                is_active BOOLEAN DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                FOREIGN KEY (created_by) REFERENCES users (id)
              )
            `);
            this.db.run(`
              INSERT INTO lists_new (id, name, description, reset_period, created_by, created_at, updated_at, last_reset, is_active, sort_order)
              SELECT id, name, description, reset_period, created_by, created_at, updated_at, last_reset, is_active, sort_order
              FROM lists
            `);
            this.db.run('DROP TABLE lists');
            this.db.run('ALTER TABLE lists_new RENAME TO lists');
            this.db.run('COMMIT');
            this.db.run('PRAGMA foreign_keys=on');
          });
        }
      });

      // Tasks table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          list_id INTEGER NOT NULL,
          assigned_to INTEGER,
          created_by INTEGER NOT NULL,
          is_completed BOOLEAN DEFAULT 0,
          completed_at DATETIME,
          completed_by INTEGER,
          duration_minutes INTEGER DEFAULT 0,
          allow_multiple_completions BOOLEAN DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (list_id) REFERENCES lists (id),
          FOREIGN KEY (assigned_to) REFERENCES users (id),
          FOREIGN KEY (created_by) REFERENCES users (id),
          FOREIGN KEY (completed_by) REFERENCES users (id)
        )
      `);

      // User goals for progress tracking
      this.db.run(`
        CREATE TABLE IF NOT EXISTS user_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          list_id INTEGER NOT NULL,
          tasks_per_period INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (list_id) REFERENCES lists (id),
          UNIQUE(user_id, list_id)
        )
      `);

      // Goals table for the new goal system
      this.db.run(`
        CREATE TABLE IF NOT EXISTS goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          calculation_type TEXT NOT NULL CHECK (calculation_type IN ('percentage_task_count', 'percentage_time', 'fixed_task_count', 'fixed_time')),
          target_value INTEGER NOT NULL,
          period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')),
          list_ids TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `);

      // List snapshots for historical viewing
      this.db.run(`
        CREATE TABLE IF NOT EXISTS list_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          list_id INTEGER NOT NULL,
          snapshot_data TEXT NOT NULL,
          period_start DATETIME NOT NULL,
          period_end DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (list_id) REFERENCES lists (id)
        )
      `);

      // Add missing columns to existing tasks table
      this.db.run(`ALTER TABLE tasks ADD COLUMN duration_minutes INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding duration_minutes column:', err);
        }
      });
      
      this.db.run(`ALTER TABLE tasks ADD COLUMN allow_multiple_completions BOOLEAN DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding allow_multiple_completions column:', err);
        }
      });

      this.db.run(`ALTER TABLE tasks ADD COLUMN completed_by INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding completed_by column:', err);
        }
      });

      this.db.run(`ALTER TABLE lists ADD COLUMN sort_order INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding sort_order column:', err);
        }
      });

      this.db.run(`ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding sort_order column to tasks:', err);
        }
      });

      // Add is_admin column to users table for multiple admin support
      this.db.run(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding is_admin column to users:', err);
        }
      });

      // Add hide_goals column to users table for per-user goal visibility
      this.db.run(`ALTER TABLE users ADD COLUMN hide_goals BOOLEAN DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding hide_goals column to users:', err);
        }
      });

      // Add hide_completed_tasks column to users table for per-user task visibility
      this.db.run(`ALTER TABLE users ADD COLUMN hide_completed_tasks BOOLEAN DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding hide_completed_tasks column to users:', err);
        }
      });

      // Add role column to users table for multiple role support (user, admin, owner)
      this.db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding role column to users:', err);
        } else {
          // Migrate existing is_admin values to role
          this.db.run(`UPDATE users SET role = CASE 
            WHEN is_admin = 1 THEN 'admin' 
            ELSE 'user' 
          END`, (migrationErr) => {
            if (migrationErr) {
              console.error('Error migrating is_admin to role:', migrationErr);
            } else {
              // Set the default admin account (ID 1) to owner role
              this.db.run(`UPDATE users SET role = 'owner' WHERE id = 1`, (ownerErr) => {
                if (ownerErr) {
                  console.error('Error setting owner role for default admin:', ownerErr);
                }
              });
            }
          });
        }
      });

      // Add first_name and last_name columns to users table for user names feature
      this.db.run(`ALTER TABLE users ADD COLUMN first_name TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding first_name column to users:', err);
        } else {
          console.log('✅ Added first_name column to users table');
        }
      });

      this.db.run(`ALTER TABLE users ADD COLUMN last_name TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding last_name column to users:', err);
        } else {
          console.log('✅ Added last_name column to users table');
        }
      });

      // Task completions history
      this.db.run(`
        CREATE TABLE IF NOT EXISTS task_completions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          completed_by INTEGER NOT NULL,
          completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES tasks (id),
          FOREIGN KEY (completed_by) REFERENCES users (id)
        )
      `);

      // User list permissions
      this.db.run(`
        CREATE TABLE IF NOT EXISTS user_list_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          list_id INTEGER NOT NULL,
          permission_level TEXT NOT NULL CHECK (permission_level IN ('admin', 'owner', 'user')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (list_id) REFERENCES lists (id),
          UNIQUE(user_id, list_id)
        )
      `);

      // Create indexes
      this.db.run('CREATE INDEX IF NOT EXISTS idx_lists_created_by ON lists(created_by)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_list_snapshots_list_id ON list_snapshots(list_id)');

      // Create default admin user if no users exist
      this.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (!err && row.count === 0) {
          const bcrypt = require('bcryptjs');
          const defaultPassword = 'admin123';
          bcrypt.hash(defaultPassword, 10, (hashErr, hash) => {
            if (!hashErr) {
              const now = localNow();
              this.db.run(
                'INSERT INTO users (username, email, password_hash, is_admin, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                ['admin', 'admin@thenest.local', hash, 1, 'owner', now, now]
              );
            }
          });
        }
      });
    });
  }

  // User methods
  createUser(username, email, passwordHash, firstName = null, lastName = null, callback) {
    const now = localNow();
    const stmt = this.db.prepare('INSERT INTO users (username, email, password_hash, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run([username, email, passwordHash, firstName, lastName, now, now], function(err) {
      callback(err, this ? this.lastID : null);
    });
    stmt.finalize();
  }

  updateUserPassword(userId, newPasswordHash, callback) {
    const stmt = this.db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?');
    stmt.run([newPasswordHash, localNow(), userId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  updateUser(userId, username, email, firstName = null, lastName = null, callback) {
    const stmt = this.db.prepare('UPDATE users SET username = ?, email = ?, first_name = ?, last_name = ?, updated_at = ? WHERE id = ?');
    stmt.run([username, email, firstName, lastName, localNow(), userId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  updateUserUsername(userId, newUsername, callback) {
    const stmt = this.db.prepare('UPDATE users SET username = ?, updated_at = ? WHERE id = ?');
    stmt.run([newUsername, localNow(), userId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  updateUserEmail(userId, newEmail, callback) {
    const stmt = this.db.prepare('UPDATE users SET email = ?, updated_at = ? WHERE id = ?');
    stmt.run([newEmail, localNow(), userId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  getUserByEmail(email, callback) {
    this.db.get('SELECT * FROM users WHERE email = ?', [email], callback);
  }

  getUserByUsername(username, callback) {
    this.db.get('SELECT * FROM users WHERE username = ?', [username], callback);
  }

  getUserById(id, callback) {
    this.db.get('SELECT * FROM users WHERE id = ?', [id], callback);
  }

  updateUserHideGoals(userId, hideGoals, callback) {
    const stmt = this.db.prepare('UPDATE users SET hide_goals = ?, updated_at = ? WHERE id = ?');
    stmt.run([hideGoals, localNow(), userId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  updateUserHideCompletedTasks(userId, hideCompletedTasks, callback) {
    const stmt = this.db.prepare('UPDATE users SET hide_completed_tasks = ?, updated_at = ? WHERE id = ?');
    stmt.run([hideCompletedTasks, localNow(), userId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  // List methods
  createList(name, description, resetPeriod, createdBy, callback) {
    const now = localNow();
    const stmt = this.db.prepare('INSERT INTO lists (name, description, reset_period, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run([name, description, resetPeriod, createdBy, now, now], function(err) {
      callback(err, this ? this.lastID : null);
    });
    stmt.finalize();
  }

  getListsByResetPeriod(resetPeriod, callback) {
    const stmt = this.db.prepare('SELECT * FROM lists WHERE reset_period = ? ORDER BY created_at');
    stmt.all([resetPeriod], callback);
    stmt.finalize();
  }

  updateList(id, name, description, resetPeriod, callback) {
    const stmt = this.db.prepare(`
      UPDATE lists 
      SET name = ?, description = ?, reset_period = ?, updated_at = ? 
      WHERE id = ?
    `);
    stmt.run([name, description, resetPeriod, localNow(), id], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  updateListSortOrder(listId, sortOrder, callback) {
    const stmt = this.db.prepare(`
      UPDATE lists 
      SET sort_order = ?, updated_at = ? 
      WHERE id = ?
    `);
    stmt.run([sortOrder, localNow(), listId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  deleteList(listId, callback) {
    const stmt = this.db.prepare('DELETE FROM lists WHERE id = ?');
    stmt.run([listId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  getListsByUser(userId, callback) {
    const query = `
      SELECT l.*, ulp.permission_level 
      FROM lists l 
      JOIN user_list_permissions ulp ON l.id = ulp.list_id 
      WHERE ulp.user_id = ? AND l.is_active = 1
      ORDER BY l.created_at DESC
    `;
    this.db.all(query, [userId], callback);
  }

  getListById(listId, callback) {
    this.db.get('SELECT * FROM lists WHERE id = ?', [listId], callback);
  }

  // Task methods
  createTask(title, description, listId, assignedTo, createdBy, durationMinutes, allowMultipleCompletions, callback) {
    const stmt = this.db.prepare('INSERT INTO tasks (title, description, list_id, assigned_to, created_by, duration_minutes, allow_multiple_completions) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run([title, description, listId, assignedTo, createdBy, durationMinutes || 0, allowMultipleCompletions || 0], function(err) {
      callback(err, this ? this.lastID : null);
    });
    stmt.finalize();
  }

  getTasksByList(listId, callback) {
    this.db.all(`
      SELECT t.*, 
             u.username as assigned_username,
             c.username as completed_by_username,
             c.first_name as completed_by_firstname,
             GROUP_CONCAT(
               json_object(
                 'id', tc.id,
                 'completed_by', tc.completed_by,
                 'username', cu.username,
                 'first_name', cu.first_name,
                 'completed_at', tc.completed_at
               )
             ) as completions
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      LEFT JOIN users c ON t.completed_by = c.id 
      LEFT JOIN task_completions tc ON t.id = tc.task_id
      LEFT JOIN users cu ON tc.completed_by = cu.id
      WHERE t.list_id = ? 
      GROUP BY t.id
      ORDER BY t.sort_order ASC, t.created_at ASC
    `, [listId], callback);
  }

  getTasksByListForDate(listId, dateStart, dateEnd, callback) {
    this.db.all(`
      SELECT t.*, 
             u.username as assigned_username,
             GROUP_CONCAT(
               json_object(
                 'id', tc.id,
                 'completed_by', tc.completed_by,
                 'username', cu.username,
                 'first_name', cu.first_name,
                 'completed_at', tc.completed_at
               )
             ) as completions
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      LEFT JOIN task_completions tc ON t.id = tc.task_id 
        AND tc.completed_at >= ? AND tc.completed_at <= ?
      LEFT JOIN users cu ON tc.completed_by = cu.id
      WHERE t.list_id = ? 
      GROUP BY t.id
      ORDER BY t.sort_order ASC, t.created_at ASC
    `, [dateStart, dateEnd, listId], (err, tasks) => {
      if (err) return callback(err);
      // Derive is_completed and completed_by from the date-scoped completions
      const result = tasks.map(t => {
        let hasCompletions = false;
        let lastCompletedBy = null;
        let lastCompletedByUsername = null;
        let lastCompletedAt = null;
        if (t.completions) {
          try {
            const parts = t.completions.includes('},{') 
              ? t.completions.split('},{').map((s, i, a) => {
                  if (i === 0) return s + '}';
                  if (i === a.length - 1) return '{' + s;
                  return '{' + s + '}';
                })
              : [t.completions];
            const parsed = parts.map(s => JSON.parse(s)).filter(c => c.id !== null);
            if (parsed.length > 0) {
              hasCompletions = true;
              const last = parsed[parsed.length - 1];
              lastCompletedBy = last.completed_by;
              lastCompletedByUsername = last.username;
              lastCompletedAt = last.completed_at;
            }
          } catch (e) { /* ignore parse errors */ }
        }
        return {
          ...t,
          is_completed: hasCompletions ? 1 : 0,
          completed_by: lastCompletedBy,
          completed_by_username: lastCompletedByUsername,
          completed_at: lastCompletedAt
        };
      });
      callback(null, result);
    });
  }

  getTaskById(taskId, callback) {
    this.db.get(`
      SELECT t.*, 
             u.username as assigned_username,
             c.username as completed_by_username,
             c.first_name as completed_by_firstname
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      LEFT JOIN users c ON t.completed_by = c.id 
      WHERE t.id = ?
    `, [taskId], callback);
  }

  updateTaskStatus(taskId, isCompleted, completedBy, callback) {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET is_completed = ?, completed_at = ?, completed_by = ?, updated_at = ? 
      WHERE id = ?
    `);
    const now = localNow();
    stmt.run([isCompleted, isCompleted ? now : null, isCompleted ? completedBy : null, now, taskId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  updateTask(taskId, title, description, durationMinutes, allowMultipleCompletions, callback) {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET title = ?, description = ?, duration_minutes = ?, allow_multiple_completions = ?, updated_at = ? 
      WHERE id = ?
    `);
    stmt.run([title, description, durationMinutes, allowMultipleCompletions ? 1 : 0, localNow(), taskId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  // Task completion methods
  addTaskCompletion(taskId, completedBy, completedAt, callback) {
    if (typeof completedAt === 'function') {
      callback = completedAt;
      completedAt = localNow();
    }
    const stmt = this.db.prepare('INSERT INTO task_completions (task_id, completed_by, completed_at) VALUES (?, ?, ?)');
    stmt.run([taskId, completedBy, completedAt || localNow()], function(err) {
      callback(err, this ? this.lastID : null);
    });
    stmt.finalize();
  }

  getTaskCompletions(taskId, callback) {
    this.db.all(`
      SELECT tc.*, u.username 
      FROM task_completions tc 
      JOIN users u ON tc.completed_by = u.id 
      WHERE tc.task_id = ? 
      ORDER BY tc.completed_at DESC
    `, [taskId], callback);
  }

  removeLastCompletion(taskId, callback) {
    const stmt = this.db.prepare('DELETE FROM task_completions WHERE id = (SELECT id FROM task_completions WHERE task_id = ? ORDER BY completed_at DESC LIMIT 1)');
    stmt.run([taskId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  removeTaskCompletion(completionId, callback) {
    const stmt = this.db.prepare('DELETE FROM task_completions WHERE id = ?');
    stmt.run([completionId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  updateTaskSortOrder(taskId, sortOrder, callback) {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET sort_order = ?, updated_at = ? 
      WHERE id = ?
    `);
    stmt.run([sortOrder, localNow(), taskId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  deleteTask(taskId, callback) {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run([taskId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  // Goals methods
  createGoal(userId, name, description, calculationType, targetValue, periodType, listIds, createdBy, callback) {
    const stmt = this.db.prepare(`
      INSERT INTO goals (user_id, name, description, calculation_type, target_value, period_type, list_ids, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([userId, name, description, calculationType, targetValue, periodType, JSON.stringify(listIds), createdBy], function(err) {
      callback(err, this ? this.lastID : null);
    });
    stmt.finalize();
  }

  getGoalsByUserId(userId, callback) {
    this.db.all(`
      SELECT g.*, u.username as user_username, c.username as created_by_username
      FROM goals g 
      LEFT JOIN users u ON g.user_id = u.id 
      LEFT JOIN users c ON g.created_by = c.id 
      WHERE g.user_id = ? AND g.is_active = 1
      ORDER BY g.created_at DESC
    `, [userId], callback);
  }

  getAllGoals(callback) {
    this.db.all(`
      SELECT g.*, u.username as user_username, c.username as created_by_username
      FROM goals g 
      LEFT JOIN users u ON g.user_id = u.id 
      LEFT JOIN users c ON g.created_by = c.id 
      WHERE g.is_active = 1
      ORDER BY u.username, g.created_at DESC
    `, [], callback);
  }

  getGoalById(goalId, callback) {
    this.db.get(`
      SELECT g.*, u.username as user_username, c.username as created_by_username
      FROM goals g 
      LEFT JOIN users u ON g.user_id = u.id 
      LEFT JOIN users c ON g.created_by = c.id 
      WHERE g.id = ?
    `, [goalId], callback);
  }

  updateGoal(goalId, name, description, calculationType, targetValue, periodType, listIds, callback) {
    const stmt = this.db.prepare(`
      UPDATE goals 
      SET name = ?, description = ?, calculation_type = ?, target_value = ?, period_type = ?, list_ids = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run([name, description, calculationType, targetValue, periodType, JSON.stringify(listIds), localNow(), goalId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  deleteGoal(goalId, callback) {
    const stmt = this.db.prepare('UPDATE goals SET is_active = 0 WHERE id = ?');
    stmt.run([goalId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  saveGoalProgress(goalId, periodStart, periodEnd, requiredValue, completedValue, completionPercentage, isAchieved, callback) {
    const stmt = this.db.prepare(`
      INSERT INTO goal_progress (goal_id, period_start, period_end, required_value, completed_value, completion_percentage, is_achieved) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([goalId, periodStart, periodEnd, requiredValue, completedValue, completionPercentage, isAchieved], function(err) {
      callback(err, this ? this.lastID : null);
    });
    stmt.finalize();
  }

  getGoalProgress(goalId, callback) {
    this.db.all(`
      SELECT * FROM goal_progress 
      WHERE goal_id = ? 
      ORDER BY period_start DESC
    `, [goalId], callback);
  }

  getTaskCompletionsInPeriod(userId, periodStart, periodEnd, callback) {
    // Convert Date/ISO strings to local database format (YYYY-MM-DD HH:MM:SS)
    const formatDate = (input) => {
      const date = new Date(input);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };
    
    const formattedStart = formatDate(periodStart);
    const formattedEnd = formatDate(periodEnd);
    
    this.db.all(`
      SELECT tc.*, t.list_id, t.duration_minutes
      FROM task_completions tc
      JOIN tasks t ON tc.task_id = t.id
      WHERE tc.completed_by = ? 
      AND tc.completed_at >= ? 
      AND tc.completed_at <= ?
      ORDER BY tc.completed_at DESC
    `, [userId, formattedStart, formattedEnd], callback);
  }

  // User goals methods (legacy - keep for compatibility)
  setUserGoal(userId, listId, tasksPerPeriod, callback) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_goals (user_id, list_id, tasks_per_period, updated_at) 
      VALUES (?, ?, ?, ?)
    `);
    stmt.run([userId, listId, tasksPerPeriod, localNow()], function(err) {
      callback(err, this ? this.lastID : null);
    });
    stmt.finalize();
  }

  getUserGoals(userId, callback) {
    const query = `
      SELECT ug.*, l.name as list_name, l.reset_period
      FROM user_goals ug
      JOIN lists l ON ug.list_id = l.id
      WHERE ug.user_id = ?
    `;
    this.db.all(query, [userId], callback);
  }

  // List permissions
  addUserToList(userId, listId, permissionLevel, callback) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO user_list_permissions (user_id, list_id, permission_level) VALUES (?, ?, ?)');
    stmt.run([userId, listId, permissionLevel], function(err) {
      callback(err, this ? this.lastID : null);
    });
    stmt.finalize();
  }

  // Get user's permission level for a specific list
  getUserListPermission(userId, listId, callback) {
    const stmt = this.db.prepare('SELECT permission_level FROM user_list_permissions WHERE user_id = ? AND list_id = ?');
    stmt.get([userId, listId], (err, row) => {
      callback(err, row ? row.permission_level : null);
    });
    stmt.finalize();
  }

  // Get all users with permissions for a specific list
  getListUsers(listId, callback) {
    const stmt = this.db.prepare(`
      SELECT u.id, u.username, ulp.permission_level 
      FROM users u 
      JOIN user_list_permissions ulp ON u.id = ulp.user_id 
      WHERE ulp.list_id = ?
      ORDER BY ulp.created_at ASC
    `);
    stmt.all([listId], (err, rows) => {
      callback(err, rows);
    });
    stmt.finalize();
  }

  // Remove user from list
  removeUserFromList(userId, listId, callback) {
    const stmt = this.db.prepare('DELETE FROM user_list_permissions WHERE user_id = ? AND list_id = ?');
    stmt.run([userId, listId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  
  // List snapshots for history
  createListSnapshot(listId, snapshotData, periodStart, periodEnd, callback) {
    const stmt = this.db.prepare('INSERT INTO list_snapshots (list_id, snapshot_data, period_start, period_end) VALUES (?, ?, ?, ?)');
    stmt.run([listId, JSON.stringify(snapshotData), periodStart, periodEnd], function(err) {
      callback(err, this ? this.lastID : null);
    });
    stmt.finalize();
  }

  getListSnapshots(listId, callback) {
    this.db.all('SELECT * FROM list_snapshots WHERE list_id = ? ORDER BY period_start DESC', [listId], callback);
  }

  
  // Close database connection
  close() {
    this.db.close();
  }
}

module.exports = Database;
