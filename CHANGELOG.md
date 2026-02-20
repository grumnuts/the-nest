# Changelog

All notable changes to The Nest will be documented in this file.

## [Unreleased]

### ✨ New Features
- Added support for users first and last name
- Display user's first name in welcome message
- Task completions now show user's first name instead of username

### 🐛 Bug Fixes
- Fixed user editor not pre-populating first/last name fields
- Fixed task completions showing usernames instead of first names
- Resolved browser caching problems preventing first name display

### ⚒️ Enhancements
- Users are now referenced by their first name rather than username
- Added automatic database schema migration for existing installations
- Edit task button now toggles the edit form (clicking again closes without saving)
- Edit task form now appears directly below the task being edited
- UI Improvements

## [v1.0.0] - 2026-02-17

### 🎉 Initial Release

#### 📋 Core Features
- **Smart Lists Management** - Create lists with customizable reset periods (daily, weekly, monthly, quarterly, annually, or static)
- **Task Management** - Comprehensive task system with titles, descriptions, and time estimates
- **Repeating Tasks** - Tasks that can be completed multiple times per period
- **Goal System** - Track progress by task count, time duration, or percentage completion
- **Multi-User Support** - Collaborative task management with role-based permissions

#### 👥 User Management & Roles
- **Three-Tier Role System**:
  - **Owner** - Full system control, can manage all users and lists
  - **Admin** - User and list management, cannot edit owners
  - **User** - Basic task completion and list viewing
- **User Settings** - Profile management with role-based UI permissions
- **List Permissions** - Granular control per list (owner, admin, user)
- **User Creation** - Admins can create new users with role assignment

#### 📝 Task Features
- **Task Creation** - Rich task details with title, description, and time estimates
- **Task Editing** - Full task modification capabilities for authorized users
- **Task Assignment** - Assign tasks to specific users
- **Task Completion** - Mark tasks as done with completion history tracking
- **Drag & Drop Reordering** - Visual task organization
- **Multiple Completions** - Support for tasks that can be done multiple times

#### 📊 Progress Tracking
- **Goal System** - Set and track goals by:
  - Task count per period
  - Total time duration
  - Percentage completion
- **Visual Progress** - Progress bars and completion indicators
- **Historical Data** - Track task completion history over time
- **Period-Based Tracking** - Progress resets according to list periods

#### 🎨 User Interface
- **Responsive Design** - Mobile-friendly interface for phones, tablets, and desktop
- **Modern UI** - Clean, intuitive design
- **Dark Theme** - Easy on the eyes dark interface
- **Role-Based UI** - Interface adapts based on user permissions

#### 🏠 List Management
- **List Creation** - Create lists with customizable names and descriptions
- **List Editing** - Modify list settings and permissions
- **List Permissions** - Add/remove users with role assignment
- **Period Management** - Configure reset periods for recurring tasks
- **List History** - Navigate through different time periods

#### ⚙️ Administrative Features
- **User Management** - Complete user administration in settings
- **Role Assignment** - Promote/demote users between roles
- **List Administration** - Manage list permissions and memberships
- **System Settings** - Profile management and preferences
- **Audit Trail** - Track user actions and changes

#### 🔧 Technical Features
- **Docker Support** - Full containerization with Docker and Docker Compose
- **Database Management** - SQLite database with automatic migrations
- **API Endpoints** - RESTful API for all operations
- **Health Checks** - Built-in health monitoring endpoints
- **Environment Configuration** - Flexible configuration via environment variables
- **Volume Persistence** - Data persistence across container restarts

#### 🌐 Accessibility & Performance
- **Mobile Responsive** - Optimized for mobile devices
- **Fast Loading** - Efficient data loading and caching
- **Offline Support** - Basic functionality without network
- **Cross-Browser Compatible** - Works on all modern browsers
- **Touch-Friendly** - Optimized for touch screen interactions

#### 🛠️ Developer Features
- **Comprehensive API** - Full REST API for all operations
- **Database Migrations** - Automatic schema updates
- **Error Handling** - Comprehensive error reporting and logging
- **Development Tools** - Hot reloading and development environment
- **Documentation** - Complete API and setup documentation

#### 🔒 Security Features
- **Input Validation** - Comprehensive input sanitization
- **SQL Injection Protection** - Parameterized queries throughout
- **XSS Protection** - Output escaping and content security
- **Rate Limiting** - API endpoint protection
- **CORS Configuration** - Secure cross-origin resource sharing

#### 📱 User Experience
- **Intuitive Navigation** - Easy-to-use interface design
- **Quick Actions** - Fast access to common operations
- **Visual Feedback** - Clear indicators for all actions
- **Error Messages** - User-friendly error reporting
- **Success Confirmations** - Clear feedback for completed actions

#### 🔄 Data Management
- **Automatic Backups** - Database backup and restore capabilities
- **Data Export** - Export user data and task information
- **Import/Export** - Support for data migration
- **Data Integrity** - Referential integrity and constraints
- **Concurrent Access** - Multi-user data safety