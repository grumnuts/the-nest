# The Nest - Chore & Task Tracking Platform

A comprehensive task tracking platform designed for teams and families to manage chores and tasks with customizable reset periods and progress tracking.

## Features

### 📋 List Management
- **Customizable Lists**: Create lists with different reset periods:
  - Daily
  - Weekly
  - Monthly
  - Quarterly
  - Annually
  - Static (doesn't reset)
- **List Permissions**: Owner, Editor, and Viewer roles
- **List Descriptions**: Add context to your lists

### ✅ Task Management
- **Create Tasks**: Add tasks with titles and descriptions
- **Task Assignment**: Assign tasks to specific users
- **Task Status**: Mark tasks as complete/incomplete
- **Task History**: Track when tasks were completed

### 📊 Progress Tracking
- **Goal Setting**: Set goals for tasks per period per user
- **Progress Visualization**: See progress towards goals with visual indicators
- **Achievement Notifications**: Get notified when goals are met
- **Fair Share Monitoring**: Ensure everyone completes their fair share

### 📈 Historical Viewing
- **List Snapshots**: View past list states
- **Period Tracking**: See what was accomplished in previous periods
- **Progress History**: Track improvement over time

### 🔐 Authentication & Security
- **User Registration**: Secure user account creation
- **JWT Authentication**: Token-based authentication
- **Password Security**: Hashed passwords with bcrypt
- **Rate Limiting**: Protection against brute force attacks

## Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database
- **JWT** for authentication
- **bcryptjs** for password hashing
- **express-validator** for input validation

### Frontend
- **React** 18
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Axios** for API calls

### DevOps
- **Docker** for containerization
- **Docker Compose** for orchestration
- **Multi-stage builds** for optimized images

## Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd the-nest
   ```

2. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Open your browser and navigate to `http://localhost:5000`
   - Register a new account or login

### Development Setup

1. **Install dependencies**
   ```bash
   npm run install-all
   ```

2. **Set up environment variables**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your configuration
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:5000`
   - Frontend development server on `http://localhost:3000`

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### POST /api/auth/login
Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

### List Endpoints

#### GET /api/lists
Get all lists for the authenticated user.

#### POST /api/lists
Create a new list.

**Request Body:**
```json
{
  "name": "string",
  "description": "string (optional)",
  "reset_period": "daily|weekly|monthly|quarterly|annually|static"
}
```

#### GET /api/lists/:id
Get a specific list with its tasks.

#### GET /api/lists/:id/history
Get historical snapshots of a list.

### Task Endpoints

#### POST /api/tasks
Create a new task.

**Request Body:**
```json
{
  "title": "string",
  "description": "string (optional)",
  "list_id": "number",
  "assigned_to": "number (optional)"
}
```

#### PATCH /api/tasks/:id/status
Update task completion status.

**Request Body:**
```json
{
  "is_completed": "boolean"
}
```

#### GET /api/tasks/list/:listId
Get all tasks for a specific list.

### Goal Endpoints

#### GET /api/goals
Get all goals for the authenticated user.

#### POST /api/goals
Set a goal for a specific list.

**Request Body:**
```json
{
  "list_id": "number",
  "tasks_per_period": "number"
}
```

#### GET /api/goals/progress/:listId
Get progress tracking for a specific list.

## Database Schema

### Users
- `id` - Primary key
- `username` - Unique username
- `email` - Unique email address
- `password_hash` - Hashed password
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

### Lists
- `id` - Primary key
- `name` - List name
- `description` - List description
- `reset_period` - Reset frequency
- `created_by` - Foreign key to users
- `last_reset` - Last reset timestamp
- `is_active` - Active status

### Tasks
- `id` - Primary key
- `title` - Task title
- `description` - Task description
- `list_id` - Foreign key to lists
- `assigned_to` - Foreign key to users
- `created_by` - Foreign key to users
- `is_completed` - Completion status
- `completed_at` - Completion timestamp

### User Goals
- `id` - Primary key
- `user_id` - Foreign key to users
- `list_id` - Foreign key to lists
- `tasks_per_period` - Goal target
- `created_at` - Goal creation timestamp
- `updated_at` - Last update timestamp

### List Snapshots
- `id` - Primary key
- `list_id` - Foreign key to lists
- `snapshot_data` - JSON snapshot data
- `period_start` - Period start timestamp
- `period_end` - Period end timestamp

### User List Permissions
- `id` - Primary key
- `user_id` - Foreign key to users
- `list_id` - Foreign key to lists
- `permission_level` - Owner/Editor/Viewer

## Configuration

### Environment Variables

#### Server Configuration
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - JWT signing secret
- `CLIENT_URL` - Frontend URL for CORS

#### Database
- `DB_PATH` - SQLite database file path

## Deployment

### Docker Production Deployment

1. **Build the production image**
   ```bash
   docker build -t the-nest:latest .
   ```

2. **Run with production compose**
   ```bash
   docker-compose --profile production up -d
   ```

### Environment Setup

For production deployment:

1. Set a strong JWT secret
2. Configure proper CORS settings
3. Set up SSL/TLS termination
4. Configure backup strategy for the SQLite database
5. Set up monitoring and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Check the documentation for common solutions
- Review the API documentation for integration questions

## Roadmap

- [ ] Email notifications for task assignments
- [ ] Mobile app (React Native)
- [ ] Advanced reporting and analytics
- [ ] Team templates and presets
- [ ] Integration with calendar applications
- [ ] Bulk task operations
- [ ] Task dependencies
- [ ] Time tracking for tasks
