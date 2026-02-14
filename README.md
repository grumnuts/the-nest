# The Nest - Chore & Task Tracking Platform

A comprehensive task tracking platform designed for teams and families to manage chores and tasks with customizable reset periods, goal tracking, and progress visualization.

## 🌟 Features

### 📋 List Management
- **Customizable Lists**: Create lists with different reset periods:
  - Daily, Weekly, Monthly, Quarterly, Annually
  - Static (doesn't reset)
- **Drag & Drop**: Reorder tasks with beautiful animations
- **List Descriptions**: Add context and details to your lists
- **Smart Reset**: Automatic list reset based on configured periods

### ✅ Task Management
- **Rich Task Creation**: Add tasks with titles, descriptions, and time tracking
- **Task Assignment**: Assign tasks to specific users
- **Time Tracking**: Set duration for tasks (perfect for time-based goals)
- **Task History**: Complete audit trail of when tasks were completed
- **Visual Status**: Clear visual indicators for task completion

### 🎯 Goal System (NEW!)
- **Multiple Goal Types**:
  - **Percentage of Tasks**: Complete X% of tasks in a list
  - **Percentage of Time**: Complete X% of total task time
  - **Fixed Task Count**: Complete exactly X tasks
  - **Fixed Time**: Complete X minutes of work
- **Flexible Periods**: Daily, Weekly, Monthly, Quarterly, Annually
- **Real-time Progress**: Live progress tracking with color-coded bars
- **Achievement Notifications**: Visual indicators when goals are met
- **Progress Over 100%**: Track when users exceed their goals
- **Admin Dashboard**: Create and manage goals for all users

### � Progress Visualization
- **Color-coded Progress Bars**: Visual indicators from red to purple
- **Percentage Display**: Clear progress metrics for all goal types
- **Home Screen Integration**: Slim goal tracker on main dashboard
- **Real-time Updates**: Progress updates every 5 seconds
- **Achievement Badges**: Visual rewards for goal completion

### 🏠 User Interface
- **Modern Design**: Beautiful glass morphism effects with purple theme
- **Responsive Layout**: Works perfectly on desktop and mobile
- **Dark Theme**: Easy on the eyes dark mode design
- **Smooth Animations**: Polished transitions and micro-interactions
- **Intuitive Navigation**: Clean, user-friendly interface

### 🔐 Authentication & Security
- **Username-based Login**: Simple username and password authentication
- **JWT Authentication**: Secure token-based authentication
- **Password Security**: Hashed passwords with bcrypt
- **Admin System**: Role-based access control
- **Auto Admin Creation**: First-time setup creates default admin account

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database with optimized queries
- **JWT** for authentication
- **bcryptjs** for password hashing
- **express-validator** for input validation
- **Rate limiting** and security middleware

### Frontend
- **React** 18 with hooks and context
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Lucide React** for beautiful icons
- **Axios** for API communication
- **React Beautiful DND** for drag & drop

### DevOps & Deployment
- **Docker** multi-stage builds
- **Docker Compose** for orchestration
- **Single Container Architecture** (frontend + backend together)
- **Production-optimized** images with security best practices
- **Health Checks** built-in

## 🚀 Quick Start

### Method 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd the-nest
   ```

2. **Build and run**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Navigate to `http://localhost:5000`
   - **Default Admin Login**:
     - Username: `admin`
     - Password: `admin123`

### Method 2: Development Setup

1. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd server && npm install
   
   # Install frontend dependencies  
   cd ../client && npm install
   ```

2. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd server && npm run dev
   
   # Terminal 2: Frontend
   cd client && npm start
   ```

3. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

## 📚 API Documentation

### Authentication

#### POST /api/auth/register
```json
{
  "username": "string (3-30 chars)",
  "email": "string (valid email)",
  "password": "string (min 6 chars)"
}
```

#### POST /api/auth/login
```json
{
  "username": "string",
  "password": "string"
}
```

#### GET /api/auth/verify
Verify JWT token and get user info.

### Lists

#### GET /api/lists
Get all lists for authenticated user.

#### POST /api/lists
```json
{
  "name": "string",
  "description": "string (optional)",
  "reset_period": "daily|weekly|monthly|quarterly|annually|static"
}
```

### Tasks

#### POST /api/tasks
```json
{
  "title": "string",
  "description": "string (optional)",
  "list_id": "number",
  "duration_minutes": "number (optional)",
  "assigned_to": "number (optional)"
}
```

#### PATCH /api/tasks/:id/status
```json
{
  "is_completed": "boolean"
}
```

### Goals (Admin Only)

#### GET /api/goals/my-goals
Get goals for current user.

#### GET /api/goals/all-goals
Get all goals (admin only).

#### POST /api/goals
```json
{
  "userId": "number",
  "name": "string",
  "description": "string (optional)",
  "calculationType": "percentage_task_count|percentage_time|fixed_task_count|fixed_time",
  "targetValue": "number",
  "periodType": "daily|weekly|monthly|quarterly|annually",
  "listIds": "array of numbers"
}
```

## 📦 Docker Deployment

### Build & Publish

```bash
# Build the image
./build.sh v1.0.0

# Publish to registry
docker login
./publish.sh the-nest v1.0.0 docker.io your-username
```

### Production Deployment

```bash
# Deploy with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
curl http://localhost:5000/api/health
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `5000` | Application port |
| `JWT_SECRET` | `your-secret-key` | JWT signing secret |
| `CLIENT_URL` | `http://localhost:5000` | Frontend URL |

## 🗄 Database Schema

### Users
- `id` - Primary key
- `username` - Unique username (for login)
- `email` - Unique email (for future features)
- `password_hash` - Hashed password
- `created_at` - Account creation timestamp

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
- `duration_minutes` - Task duration in minutes
- `assigned_to` - Foreign key to users
- `created_by` - Foreign key to users
- `is_completed` - Completion status
- `completed_at` - Completion timestamp

### Goals
- `id` - Primary key
- `user_id` - Foreign key to users
- `name` - Goal name
- `description` - Goal description
- `calculation_type` - Type of calculation
- `target_value` - Target value
- `period_type` - Period type
- `list_ids` - Associated lists (JSON)
- `created_at` - Goal creation timestamp

### Task Completions
- `id` - Primary key
- `task_id` - Foreign key to tasks
- `completed_by` - Foreign key to users
- `completed_at` - Completion timestamp

## 🎯 Goal System Guide

### Goal Types Explained

1. **Percentage of Tasks**: Complete X% of tasks in selected lists
2. **Percentage of Time**: Complete X% of total task duration
3. **Fixed Task Count**: Complete exactly X tasks
4. **Fixed Time**: Complete X minutes of work

### Progress Calculation

- **Real-time**: Progress updates every 5 seconds
- **Period-based**: Calculated based on goal period (daily, weekly, etc.)
- **Multi-list**: Can span across multiple lists
- **Overachievement**: Progress can exceed 100%

### Visual Indicators

- **Red**: 0-24% progress
- **Orange**: 25-49% progress
- **Yellow**: 50-74% progress
- **Blue**: 75-99% progress
- **Green**: 100% achieved
- **Pink**: 125% exceeded
- **Purple**: 150% massively exceeded

## 🔧 Configuration

### Admin Setup

The system automatically creates an admin user on first startup:

```
Username: admin
Password: admin123
Email: admin@localhost
```

**Important**: Change the default password after first login!

### Manual Admin Creation

```bash
# Create additional admin
node create-admin.js myadmin mypassword

# Create default admin
node create-admin.js
```

## 🚀 Production Deployment

### Security Checklist

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET
- [ ] Configure proper CORS
- [ ] Set up SSL/TLS
- [ ] Configure database backups
- [ ] Set up monitoring

### Docker Production

```bash
# Build production image
docker build -f Dockerfile.prod -t the-nest:latest .

# Run with persistent data
docker run -d \
  --name the-nest \
  -p 5000:5000 \
  -v nest_data:/app/data \
  -e NODE_ENV=production \
  -e JWT_SECRET="your-secure-secret" \
  the-nest:latest
```

### Environment Variables for Production

```yaml
environment:
  - NODE_ENV=production
  - PORT=5000
  - JWT_SECRET=your-super-secure-jwt-secret
  - CLIENT_URL=https://yourdomain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
- Create an issue in the GitHub repository
- Check the [Docker Guide](DOCKER.md) for deployment help
- Review the API documentation above

## 🗺 Roadmap

### Completed ✅
- [x] Goal system with multiple calculation types
- [x] Real-time progress tracking
- [x] Username-based authentication
- [x] Docker single-container deployment
- [x] Mobile-responsive design
- [x] Admin dashboard
- [x] Drag & drop task ordering

### In Progress 🚧
- [ ] Email notifications system
- [ ] Advanced analytics dashboard

### Planned 📋
- [ ] Mobile app (React Native)
- [ ] Calendar integration
- [ ] Task dependencies
- [ ] Bulk operations
- [ ] Team templates
- [ ] Time tracking reports
- [ ] API rate limiting
- [ ] Multi-language support

---

**Built with ❤️ for teams and families who want to stay organized and productive.**
