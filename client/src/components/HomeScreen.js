import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, History, Menu, X, ChevronLeft, ChevronRight, Settings, LogOut, Check, Undo, Clock, User, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const HomeScreen = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    duration_minutes: 0, 
    allow_multiple_completions: false 
  });
  const [newList, setNewList] = useState({
    name: '',
    description: '',
    reset_period: 'daily'
  });
  
  const activeList = lists.find(list => list.id === activeListId) || null;

  const fetchLists = async () => {
    try {
      const response = await axios.get('/api/lists');
      setLists(response.data.lists);
      if (response.data.lists.length > 0) {
        setActiveListId(response.data.lists[0].id);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListData = async (listId) => {
    try {
      const tasksResponse = await axios.get(`/api/tasks/list/${listId}`);
      
      setTasks(tasksResponse.data.tasks || []);
    } catch (error) {
      console.error('Error fetching list data:', error);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    if (activeListId) {
      fetchListData(activeListId);
    }
  }, [activeListId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateList('prev');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateList('next');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lists, activeListId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    try {
      const taskData = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        list_id: activeListId
      };
      
      if (newTask.duration_minutes && newTask.duration_minutes > 0) {
        taskData.duration_minutes = parseInt(newTask.duration_minutes);
      }
      
      if (newTask.allow_multiple_completions) {
        taskData.allow_multiple_completions = true;
      }
      
      const response = await axios.post('/api/tasks', taskData);
      setNewTask({ 
        title: '', 
        description: '', 
        duration_minutes: 0, 
        allow_multiple_completions: false 
      });
      setShowCreateTask(false);
      fetchListData(activeListId);
    } catch (error) {
      console.error('Error creating task:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.errors 
        ? error.response.data.errors.map(e => e.msg).join(', ')
        : error.response?.data?.error || error.message;
      alert(`Error creating task: ${errorMsg}`);
    }
  };

  const handleSetGoal = async (e) => {
    e.preventDefault();
    // Goals functionality removed
    alert('Goals functionality has been removed.');
  };

  const handleToggleTask = async (taskId, isCompleted) => {
    try {
      await axios.patch(`/api/tasks/${taskId}/status`, { is_completed: isCompleted });
      fetchListData(activeListId);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error updating task. Please try again.');
    }
  };

  const handleUndoTask = async (taskId) => {
    try {
      await axios.patch(`/api/tasks/${taskId}/undo`);
      fetchListData(activeListId);
    } catch (error) {
      console.error('Error undoing task:', error);
      alert('Error undoing task. Please try again.');
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/lists', {
        name: newList.name,
        description: newList.description,
        reset_period: newList.reset_period
      });
      
      setNewList({
        name: '',
        description: '',
        reset_period: 'daily'
      });
      setShowCreateList(false);
      fetchLists();
    } catch (error) {
      console.error('Error creating list:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.errors 
        ? error.response.data.errors.map(e => e.msg).join(', ')
        : error.response?.data?.error || error.message;
      alert(`Error creating list: ${errorMsg}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task. Please try again.');
    }
  };

  const handleTaskClick = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      const newStatus = !task.is_completed;
      await axios.patch(`/api/tasks/${taskId}`, { is_completed: newStatus });
      
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, is_completed: newStatus } : t
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error updating task. Please try again.');
    }
  };

  const navigateList = (direction) => {
    if (lists.length === 0) return;
    
    const currentIndex = lists.findIndex(list => list.id === activeListId);
    let newIndex;
    
    if (currentIndex === -1) {
      // If activeListId is not found, use the first list
      newIndex = 0;
    } else if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : lists.length - 1;
    } else {
      newIndex = currentIndex < lists.length - 1 ? currentIndex + 1 : 0;
    }
    
    if (lists[newIndex]) {
      setActiveListId(lists[newIndex].id);
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'from-green-500 to-emerald-500';
    if (progress >= 75) return 'from-blue-500 to-cyan-500';
    if (progress >= 50) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getResetPeriodColor = (period) => {
    switch (period) {
      case 'daily': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'weekly': return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'monthly': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
      case 'quarterly': return 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
      case 'annually': return 'bg-red-500/20 text-red-300 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="glass border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="/TheNestLogo.png" 
                alt="The Nest Logo" 
                className="h-8 w-8 rounded"
              />
              <h1 className="text-2xl font-bold text-white">The Nest</h1>
              <div className="text-sm text-gray-300">
                Welcome, {user?.username}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-400">
                <span>Tip:</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded">Alt</kbd>
                <kbd className="px-2 py-1 bg-slate-700 rounded">←</kbd>
                <span>/</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded">→</kbd>
                <span>to navigate lists</span>
              </div>
              
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-lg transition-colors ${
                  showHistory 
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                    : 'text-gray-300 hover:bg-purple-500/10 hover:text-purple-200'
                }`}
              >
                <History className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowCreateList(!showCreateList)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create List</span>
              </button>
              
              <button
                onClick={() => navigate('/admin/reset-password')}
                className="p-2 text-gray-300 hover:bg-purple-500/10 hover:text-purple-200 rounded-lg transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-300 hover:bg-purple-500/10 hover:text-red-400 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-300 hover:bg-purple-500/10 hover:text-purple-200 rounded-lg transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Create List Form */}
      {showCreateList && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="glass rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-lg font-semibold mb-4 text-white">Create New List</h3>
            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label className="label text-gray-200">List Name *</label>
                <input
                  type="text"
                  className="input bg-slate-800/50 border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-500"
                  value={newList.name}
                  onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                  placeholder="Enter list name"
                  required
                />
              </div>
              
              <div>
                <label className="label text-gray-200">Period</label>
                <select
                  className="input bg-slate-800/50 border-purple-500/30 text-white focus:border-purple-500"
                  value={newList.reset_period}
                  onChange={(e) => setNewList({ ...newList, reset_period: e.target.value })}
                >
                  <option value="static">Static (Does not reset)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
              
              <div>
                <label className="label text-gray-200">Description (Optional)</label>
                <textarea
                  className="input bg-slate-800/50 border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-500"
                  value={newList.description}
                  onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                  placeholder="Enter list description (optional)"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-3">
                <button type="submit" className="btn-primary">
                  Create List
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateList(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {lists.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">No Lists Yet</h2>
            <p className="text-gray-300 mb-6">Create your first list to get started!</p>
            <button
              onClick={() => setShowCreateList(true)}
              className="btn-primary"
            >
              Create Your First List
            </button>
          </div>
        ) : (
          <div>
            {/* List Tabs */}
            <div className="flex space-x-1 mb-6 overflow-x-auto">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => setActiveListId(list.id)}
                  className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
                    activeListId === list.id
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {list.name}
                </button>
              ))}
            </div>

            {/* Active List Content */}
            {activeList && (
              <div className="space-y-6">
                {/* List Header */}
                <div className="glass rounded-xl p-6 border border-purple-500/20">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">{activeList.name}</h2>
                      {activeList.description && (
                        <p className="text-gray-300 mb-3">{activeList.description}</p>
                      )}
                      {activeList.reset_period && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getResetPeriodColor(activeList.reset_period)}`}>
                          {activeList.reset_period}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowCreateTask(!showCreateTask)}
                        className="btn-primary flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Create Task Form */}
                {showCreateTask && (
                  <div className="glass rounded-xl p-6 border border-purple-500/20">
                    <h3 className="text-xl font-semibold mb-4 text-white">Create New Task</h3>
                    <form onSubmit={handleCreateTask} className="space-y-4">
                      <div>
                        <label className="label text-gray-200">Task Title *</label>
                        <input
                          type="text"
                          value={newTask.title}
                          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                          className="input w-full"
                          placeholder="Enter task title"
                          required
                        />
                      </div>
                      <div>
                        <label className="label text-gray-200">Description or instructions (optional)</label>
                        <textarea
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                          className="input w-full"
                          placeholder="Enter description or instructions (optional)"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="label text-gray-200">Duration (minutes)</label>
                          <input
                            type="number"
                            value={newTask.duration_minutes}
                            onChange={(e) => setNewTask({ ...newTask, duration_minutes: parseInt(e.target.value) || 0 })}
                            className="input w-full"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="allow_multiple"
                            checked={newTask.allow_multiple_completions}
                            onChange={(e) => setNewTask({ ...newTask, allow_multiple_completions: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="allow_multiple" className="text-gray-200">
                            Allow multiple completions
                          </label>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button type="submit" className="btn-primary">
                          Create Task
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateTask(false)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Tasks List */}
                <div className="glass rounded-xl p-6 border border-purple-500/20">
                  <h3 className="text-xl font-semibold mb-4 text-white">Tasks</h3>
                  {tasks.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No tasks yet. Create your first task above!</p>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`p-4 rounded-lg border transition-all cursor-pointer ${
                            task.is_completed
                              ? 'bg-green-900/30 border-green-500/50'
                              : 'bg-gray-800/50 border-gray-700 hover:border-purple-500/50'
                          }`}
                          onClick={() => handleTaskClick(task.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={task.is_completed}
                                onChange={() => handleTaskClick(task.id)}
                                className="rounded text-purple-600 focus:ring-purple-500"
                              />
                              <div>
                                <h4 className={`font-medium ${
                                  task.is_completed ? 'text-gray-400 line-through' : 'text-white'
                                }`}>
                                  {task.title}
                                </h4>
                                {task.description && (
                                  <p className="text-gray-400 text-sm mt-1">{task.description}</p>
                                )}
                                {task.duration_minutes > 0 && (
                                  <p className="text-gray-500 text-sm mt-1">
                                    <Clock className="h-3 w-3 inline mr-1" />
                                    {task.duration_minutes} minutes
                                  </p>
                                )}
                                {task.allow_multiple_completions && (
                                  <p className="text-blue-400 text-sm mt-1">
                                    Can be completed multiple times
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {task.assigned_username && (
                                <span className="text-sm text-gray-400">
                                  <User className="h-3 w-3 inline mr-1" />
                                  {task.assigned_username}
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeScreen;
