# The Nest - Chore & Task Tracking Platform

A comprehensive task tracking platform designed for teams and families to manage chores and tasks with customizable reset periods, goal tracking, and progress visualization.

## 🌟 Key Features

### 📋 Smart List Management
- **Customizable Reset Periods**: Daily, Weekly, Monthly, Quarterly, Annually, or Static
- **Drag & Drop**: Beautiful animations for reordering tasks
- **Smart Reset**: Automatic list clearing based on your schedule
- **List Descriptions**: Add context and organization to your tasks

### ✅ Task Management
- **Rich Task Details**: Add titles, descriptions, and time estimates
- **Task History**: Complete audit trail of when tasks were completed
- **Time Tracking**: Perfect for time-based goals and productivity tracking
- **Visual Status**: Clear indicators for completed and pending tasks

### 🎯 Goal System
- **Multiple Goal Types**:
  - Complete a percentage of tasks in a list
  - Achieve a percentage of total work time
  - Finish a specific number of tasks
  - Complete a set amount of work time
- **Flexible Periods**: Track goals daily, weekly, monthly, quarterly, or annually
- **Live Progress**: Real-time progress updates with beautiful color-coded bars
- **Achievement Tracking**: Visual rewards when you meet and exceed your goals

### 🏠 Beautiful Interface
- **Modern Design**: Clean, dark theme with purple accents
- **Mobile Friendly**: Works perfectly on phones, tablets, and desktop
- **Smooth Animations**: Polished transitions and micro-interactions
- **Intuitive Navigation**: Easy to use for all family members

## � Quick Deployment

### Prerequisites
- Docker and Docker Compose installed
- About 10 minutes of setup time

### Step 1: Create Environment File
```bash
# Create a copy of the environment template
cp .env.production .env
```

### Step 2: Configure Your Settings
Edit the `.env` file with your information:

```bash
# Required: Generate a secure secret (32+ characters)
JWT_SECRET=your-random-jwt-secret-key-here-min-32-characters

# Required: Set your domain or tunnel URL
CLIENT_URL=https://your-domain.com

# Optional: Set your timezone
TZ=UTC
```

**Security Tip**: Generate a strong JWT secret with:
```bash
openssl rand -base64 32
```

### Step 3: Deploy with Docker Compose
```bash
# Deploy the application
docker-compose --env-file .env up -d

# Check if it's running
docker-compose logs -f
```

### Step 4: Access Your Application
- Open your browser to your configured URL
- **Default Admin Login**:
  - Username: `admin`
  - Password: `admin123`

**Important**: Change the default password after first login!

## 🌐 Deployment Options

### Standard Server
```bash
# Standard deployment on port 5000
CLIENT_URL=https://yourdomain.com
```

### Cloudflare Tunnel (Recommended for Home Use)
```bash
# Use with Cloudflare Tunnel
CLIENT_URL=https://your-app.pages.dev
```

### Local Development
```bash
# For testing on your local machine
CLIENT_URL=http://localhost:5001
```

## 📊 Goal Tracking Examples

### Family Chores
- **Goal**: Complete 80% of weekly chores
- **Period**: Weekly
- **Lists**: Kitchen Duties, Bathroom Cleaning, Yard Work

### Personal Productivity
- **Goal**: Work 20 hours per week on side projects
- **Period**: Weekly  
- **Lists**: Development, Learning, Planning

### Fitness Tracking
- **Goal**: Complete 5 workouts per week
- **Period**: Weekly
- **Lists**: Cardio, Strength Training, Stretching

## 🔧 Basic Administration

### Create Additional Users
1. Login as admin
2. Go to Settings → Users
3. Add new family/team members

### Manage Goals
1. Go to Settings → Goals
2. Create goals for yourself or others
3. Choose calculation types and periods
4. Track progress on the home screen

### Backup Your Data
```bash
# Backup your task database
docker cp the-nest:/app/data/the_nest.db ./backup-$(date +%Y%m%d).db
```

## 🆘 Need Help?

### Common Issues
- **Can't access the app**: Check your CLIENT_URL matches exactly what you type in browser
- **Login not working**: Ensure JWT_SECRET is set in your environment file
- **Tasks not saving**: Check that Docker has permission to write to the data volume

### Getting Support
- Check the deployment environment variables
- Review the Docker logs: `docker-compose logs the-nest`
- Ensure your CLIENT_URL includes https:// for production use

## 📱 Mobile Access

The Nest works great on mobile devices! Simply access your configured URL from any phone or tablet. The responsive design ensures a smooth experience on any screen size.

---

**Built with ❤️ for families and teams who want to stay organized and productive.**

**Docker Image**: `nchanson93/the-nest` - Available on Docker Hub
