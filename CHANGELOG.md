## [Unreleased]

## [v1.3.2] - 2026-04-01

### 🐛 Bug Fixes
- **Reduced request volume on task completion** — toggling a task now only re-fetches tasks and progress (2 requests) instead of all list data (6 requests), preventing rate limit errors during active use
- **Removed redundant auth verification calls** — `ListView` now reads the current user from `AuthContext` instead of calling `/api/auth/verify` on every data refresh

### ⚒️ Enhancements
- **Raised rate limits** — general API limit increased from 300 → 600 req/15 min; auth login limit increased from 20 → 100 req/15 min, giving households sharing an IP more headroom

## [v1.3.1] - 2026-03-31

### ⚒️ Enhancements
- **Improved editor modals** — Edit List, Edit Task, Add Task, and Add Completion forms now have better visual hierarchy, proper field spacing, a styled checkbox, a card-based permissions panel, and a more polished overall appearance

## [v1.3.0] - 2026-03-30

### ✨ New Features
- **Audit Log** — new Audit Log tab in Settings (admin/owner only) showing a paginated, colour-coded table of all important system events with timestamps, usernames, and IP addresses
- **Comprehensive event logging** — server now records login (success and failure with attempted username), logout, user creation/modification/deletion, username/email/password changes, profile updates, list creation/modification/deletion, and task creation/modification/deletion

### 🐛 Bug Fixes
- **Fixed sign-in rate-limit errors** — `loading` state was not exposed from `AuthContext`, causing the app to briefly show the login screen on every page load for users with a valid token; this triggered repeated login attempts and hit the auth rate limiter

## [v1.2.0] - 2026-03-24

### 🔒 Security
- **Re-enabled Helmet** security headers (X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, etc.) — these were accidentally left disabled after a debugging session
- **Re-enabled rate limiting** on all API endpoints (300 req/15 min general, 20 req/15 min on login) — was accidentally left disabled after a debugging session
- **Server now refuses to start** without a valid `JWT_SECRET` environment variable — previously fell back to a hardcoded insecure default
- **Removed hardcoded `admin123` default admin password** — first-run admin password is now cryptographically random and printed once to server logs
- **Fixed CORS** — production no longer falls back to `origin: true` (allow all origins); requires explicit `CLIENT_URL`
- **Fixed Docker database path detection** — now uses explicit `DOCKER_ENV=true` flag instead of fragile filesystem heuristics (`.dockerenv` detection)
- **Prevent self-deletion** — users can no longer delete their own account via the admin panel
- **Prevent admins deleting owners** — only owners can delete owner-level accounts
- **Consistent admin role checks** — `checkAdmin` middleware and delete-user endpoint now use the `role` field consistently alongside the legacy `is_admin` flag

### ✨ New Features
- **Added `POST /api/auth/logout` endpoint** — client now explicitly notifies the server on logout
- **Added `.env.example`** — documents all supported environment variables with descriptions

### 🐛 Bug Fixes
- **Fixed assigned task uncompletion** — regular users could previously uncomplete tasks assigned to someone else via the status endpoint; now only the assigned user or a list admin can uncomplete an assigned task
- **Fixed user ID comparison inconsistency in HomeScreen** — auth user comparisons now consistently use `user.userId` instead of a mix of `user.id` and `user.userId`
- **Fixed password minimum not enforced on user creation/update** — admins can no longer create or update accounts with passwords shorter than 8 characters

### ⚒️ Enhancements
- **Atomic list reorder** — list sort-order updates are now wrapped in a database transaction, preventing partial/inconsistent state on error
- **Date parameter validation** — `/api/tasks/list/:id` now validates `date`, `dateStart`, and `dateEnd` query parameters as proper `YYYY-MM-DD` dates before using them
- **Goal field validation** — create/update goal endpoints now validate `name` length, `targetValue` range (0–1,000,000), and that `listIds` is a non-empty array
- **Reduced JSON body limit** from 10mb to 1mb
- **bcrypt cost factor** increased from 10 to 12 rounds for new password hashes (existing hashes unaffected until next password change)
- **Removed dead code** — unused `checkAdminOrOwner` pass-through middleware removed from auth module

## [v1.1.1] - 2026-03-01

### 🐛 Bug Fixes
- Fixed weekly goals resetting prematurely due to timezone mismatch between server (UTC) and Australia
- Fixed weekly period calculation using improper date arithmetic
- Fixed completion entries not showing appropriate day format based on list type
- Fixed weekly goal period end calculation causing goals to not count completions from Thursday onwards

### ⚒️ Enhancements
- Server now logs timezone information on startup for debugging
- Updated documentation to explain importance of TZ environment variable
- Changed default timezone examples from UTC to Australia/Sydney
- Completion entries now display day information appropriately: daily lists show time only, weekly lists show abbreviated weekday, all other lists show date format

## [v1.1.0] - 2026-02-23

### ✨ New Features
- Added support for users first and last name
- Display user's first name in welcome message
- Task completions now show user's first name instead of username
- Added help text explaining permission levels in user and list editors
- Added completion management to task editor - view and delete individual completions for the current period
- Added manual completion entry - admins can now add completions for any user with a custom timestamp
- Added task assignment with assignee-only completion and assigned user display

### 🐛 Bug Fixes
- Fixed user editor not pre-populating first/last name fields
- Fixed task completions showing usernames instead of first names
- Resolved browser caching problems preventing first name display
- Fixed list editor buttons overflowing container on mobile devices
- Fixed "Add List" button text not showing on mobile devices
- Fixed list creation failing for fortnightly reset period
- Fixed history navigation for fortnightly lists
- Fixed add completion user selection using correct list user id
- Fixed goals view console error caused by missing period fetch handler

### ⚒️ Enhancements
- Users are now referenced by their first name rather than username
- Added automatic database schema migration for existing installations
- Edit list button now toggles the edit form (clicking again closes without saving)
- Edit list form now appears below the edit button and above tasks
- Edit task button now toggles the edit form (clicking again closes without saving)
- Edit task form now appears directly below the task being edited
- Navigating between lists now automatically closes any open editors without saving
- Reduced horizontal padding in edit forms to match container padding
- Evenly distributed buttons in create list and create task forms
- Assigned user display now falls back to username when first name is missing
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