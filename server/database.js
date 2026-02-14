const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'the_nest.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  init() {
    this.db.serialize(() => {
      // Users table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
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
          reset_period TEXT NOT NULL CHECK (reset_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'static')),
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_reset DATETIME,
          is_active BOOLEAN DEFAULT 1,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `);

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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (list_id) REFERENCES lists (id),
          FOREIGN KEY (assigned_to) REFERENCES users (id),
          FOREIGN KEY (created_by) REFERENCES users (id)
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

      // User list permissions
      this.db.run(`
        CREATE TABLE IF NOT EXISTS user_list_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          list_id INTEGER NOT NULL,
          permission_level TEXT NOT NULL CHECK (permission_level IN ('owner', 'editor', 'viewer')),
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
    });
  }

  // User methods
  createUser(username, email, passwordHash, callback) {
    const stmt = this.db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    stmt.run([username, email, passwordHash], function(err) {
      callback(err, this ? this.lastID : null);
    });
    stmt.finalize();
  }

  getUserByEmail(email, callback) {
    this.db.get('SELECT * FROM users WHERE email = ?', [email], callback);
  }

  getUserById(id, callback) {
    this.db.get('SELECT * FROM users WHERE id = ?', [id], callback);
  }

  // List methods
  createList(name, description, resetPeriod, createdBy, callback) {
    const stmt = this.db.prepare('INSERT INTO lists (name, description, reset_period, created_by) VALUES (?, ?, ?, ?)');
    stmt.run([name, description, resetPeriod, createdBy], function(err) {
      callback(err, this ? this.lastID : null);
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
  createTask(title, description, listId, assignedTo, createdBy, callback) {
    const stmt = this.db.prepare('INSERT INTO tasks (title, description, list_id, assigned_to, created_by) VALUES (?, ?, ?, ?, ?)');
    stmt.run([title, description, listId, assignedTo, createdBy], function(err) {
      callback(err, this ? this.lastID : null);
    });
    stmt.finalize();
  }

  getTasksByList(listId, callback) {
    this.db.all(`
      SELECT t.*, u.username as assigned_username 
      FROM tasks t 
      LEFT JOIN users u ON t.assigned_to = u.id 
      WHERE t.list_id = ? 
      ORDER BY t.created_at ASC
    `, [listId], callback);
  }

  updateTaskStatus(taskId, isCompleted, callback) {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET is_completed = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run([isCompleted, isCompleted ? new Date().toISOString() : null, taskId], function(err) {
      callback(err, this ? this.changes : 0);
    });
    stmt.finalize();
  }

  // User goals methods
  setUserGoal(userId, listId, tasksPerPeriod, callback) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_goals (user_id, list_id, tasks_per_period, updated_at) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run([userId, listId, tasksPerPeriod], function(err) {
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
