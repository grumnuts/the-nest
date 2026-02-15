# The Nest - Chore & Task Tracking Platform

A comprehensive task tracking platform designed for housemantes and families to manage chores and tasks with customizable reset periods, goal tracking, and progress visualization.

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

## 🚀 Deployment

### Docker Run
```bash
docker run -d \
  --name the-nest \
  -p 5000:5000 \
  -v nest_data:/app/data \
  -e JWT_SECRET="your-random-jwt-secret-key-here-min-32-characters" \
  -e CLIENT_URL="https://your-domain.com" \
  -e TZ="UTC" \
  --restart unless-stopped \
  grumnuts/the-nest:latest
```

### Docker Compose
```yaml
services:
  the-nest:
    image: grumnuts/the-nest:latest
    container_name: the-nest
    ports:
      - "5000:5000"
    environment:
      - JWT_SECRET=your-random-jwt-secret-key-here-min-32-characters
      - CLIENT_URL=https://your-domain.com
      - TZ=UTC
    volumes:
      - nest_data:/app/data
    restart: unless-stopped

volumes:
  nest_data:
    driver: local
```

---

**Built with ❤️ for families and teams who want to stay organized and productive.**

**Docker Image**: `grumnuts/the-nest` - Available on Docker Hub
