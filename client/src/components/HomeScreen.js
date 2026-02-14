import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, Edit2, Edit, Trash2, X, Menu, History, ChevronDown, Settings, LogOut, CheckCircle2, Circle, Clock, Check, Target } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const HomeScreen = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.username === 'admin';
  
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [listHistory, setListHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showEditList, setShowEditList] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [showDeleteListConfirm, setShowDeleteListConfirm] = useState(false);
  const [listToDelete, setListToDelete] = useState(null);
  const [draggedList, setDraggedList] = useState(null);
  const [dragOverList, setDragOverList] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [goals, setGoals] = useState([]);
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
      if (response.data.lists.length > 0 && !activeListId) {
        setActiveListId(response.data.lists[0].id);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  };

  const fetchGoals = async () => {
    try {
      const endpoint = isAdmin ? '/api/goals/all-goals' : '/api/goals/my-goals';
      const response = await axios.get(endpoint);
      setGoals(response.data.goals);
    } catch (error) {
      console.error('Error fetching goals:', error);
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

  const fetchListHistory = async (listId) => {
    if (!listId) return;
    
    setHistoryLoading(true);
    try {
      const response = await axios.get(`/api/lists/${listId}/history`);
      setListHistory(response.data.snapshots || []);
    } catch (error) {
      console.error('Error fetching list history:', error);
      setListHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getActiveList = () => {
    return lists.find(list => list.id === activeListId);
  };

  const isDailyList = () => {
    const activeList = getActiveList();
    return activeList && activeList.reset_period === 'daily';
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchLists(),
        fetchGoals()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Real-time updates - poll for changes every 500ms for instant updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeListId) {
        fetchListData(activeListId);
      }
      fetchLists();
      fetchGoals();
    }, 500); // Poll every 500ms for instant-feeling updates

    return () => clearInterval(interval);
  }, [activeListId]);

  useEffect(() => {
    if (activeListId) {
      fetchListData(activeListId);
    }
  }, [activeListId]);

  // Drag and drop functions for list reordering
  const handleDragStart = (e, list) => {
    setDraggedList(list);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, list) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Determine if we should insert before or after the target
    const rect = e.currentTarget.getBoundingClientRect();
    const midPoint = rect.left + rect.width / 2;
    const insertBefore = e.clientX < midPoint;
    
    setDragOverList({ ...list, insertBefore });
  };

  const handleDragLeave = (e) => {
    // Only clear if we're actually leaving the element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverList(null);
    }
  };

  const handleDrop = (e, targetList) => {
    e.preventDefault();
    setDragOverList(null);
    
    if (!draggedList || draggedList.id === targetList.id) {
      return;
    }

    const draggedIndex = lists.findIndex(list => list.id === draggedList.id);
    const targetIndex = lists.findIndex(list => list.id === targetList.id);
    
    const newLists = [...lists];
    newLists.splice(draggedIndex, 1);
    
    // Determine insertion position based on where the user dropped
    const rect = e.currentTarget.getBoundingClientRect();
    const midPoint = rect.left + rect.width / 2;
    const insertBefore = e.clientX < midPoint;
    
    const finalIndex = insertBefore ? targetIndex : targetIndex + 1;
    newLists.splice(finalIndex, 0, draggedList);
    
    setLists(newLists);
    setDraggedList(null);
    
    // Save the new order to the backend
    saveListOrder(newLists);
  };

  const saveListOrder = async (orderedLists) => {
    try {
      const listIds = orderedLists.map(list => list.id);
      await axios.post('/api/lists/reorder', { listIds });
      console.log('List order saved successfully');
    } catch (error) {
      console.error('Error saving list order:', error);
      // Optionally revert the order if save fails
      fetchLists();
    }
  };

  // Drag and drop functions for task reordering
  const handleTaskDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTaskDragOver = (e, task) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Determine if we should insert before or after the target
    const rect = e.currentTarget.getBoundingClientRect();
    const midPoint = rect.top + rect.height / 2;
    const insertBefore = e.clientY < midPoint;
    
    setDragOverTask({ ...task, insertBefore });
  };

  const handleTaskDragLeave = (e) => {
    // Only clear if we're actually leaving the element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverTask(null);
    }
  };

  const handleTaskDrop = (e, targetTask) => {
    e.preventDefault();
    setDragOverTask(null);
    
    if (!draggedTask || draggedTask.id === targetTask.id) {
      return;
    }

    const draggedIndex = tasks.findIndex(task => task.id === draggedTask.id);
    const targetIndex = tasks.findIndex(task => task.id === targetTask.id);
    
    const newTasks = [...tasks];
    newTasks.splice(draggedIndex, 1);
    
    // Determine insertion position based on where the user dropped
    const rect = e.currentTarget.getBoundingClientRect();
    const midPoint = rect.top + rect.height / 2;
    const insertBefore = e.clientY < midPoint;
    
    const finalIndex = insertBefore ? targetIndex : targetIndex + 1;
    newTasks.splice(finalIndex, 0, draggedTask);
    
    setTasks(newTasks);
    setDraggedTask(null);
    
    // Save the new order to the backend
    saveTaskOrder(newTasks);
  };

  const saveTaskOrder = async (orderedTasks) => {
    try {
      const taskIds = orderedTasks.map(task => task.id);
      await axios.post(`/api/tasks/reorder/${activeListId}`, { taskIds });
      console.log('Task order saved successfully');
    } catch (error) {
      console.error('Error saving task order:', error);
      // Optionally revert the order if save fails
      fetchListData(activeListId);
    }
  };

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
      
      // Trigger immediate update
      setLastUpdate(Date.now());
      
      fetchListData(activeListId);
      fetchGoals(); // Immediate goal progress update
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
      fetchGoals(); // Immediate goal progress update
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error updating task. Please try again.');
    }
  };

  const handleUndoTask = async (taskId) => {
    try {
      await axios.patch(`/api/tasks/${taskId}/undo`);
      fetchListData(activeListId);
      fetchGoals(); // Immediate goal progress update
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
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/login');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      
      // Trigger immediate update
      setLastUpdate(Date.now());
      
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task. Please try again.');
    }
  };

  const handleEditTask = (task) => {
    setEditingTask({
      id: task.id,
      title: task.title,
      description: task.description || '',
      duration_minutes: task.duration_minutes || 0,
      allow_multiple_completions: task.allow_multiple_completions === 1
    });
    setShowEditTask(true);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.patch(`/api/tasks/${editingTask.id}`, {
        title: editingTask.title,
        description: editingTask.description,
        duration_minutes: editingTask.duration_minutes,
        allow_multiple_completions: editingTask.allow_multiple_completions
      });
      console.log('Task updated:', response.data);
      fetchListData(activeListId);
      setShowEditTask(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
      const errorMsg = error.response?.data?.error || error.message;
      alert(`Error updating task: ${errorMsg}`);
    }
  };

  const handleEditList = (list) => {
    setEditingList({
      id: list.id,
      name: list.name,
      description: list.description,
      reset_period: list.reset_period
    });
    setShowEditList(true);
  };

  const handleUpdateList = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.patch(`/api/lists/${editingList.id}`, {
        name: editingList.name,
        description: editingList.description,
        reset_period: editingList.reset_period
      });
      console.log('List updated:', response.data);
      fetchLists();
      setShowEditList(false);
      setEditingList(null);
    } catch (error) {
      console.error('Error updating list:', error);
      const errorMsg = error.response?.data?.error || error.message;
      alert(`Error updating list: ${errorMsg}`);
    }
  };

  const handleDeleteList = (list) => {
    setListToDelete(list);
    setShowDeleteListConfirm(true);
  };

  const handleConfirmDeleteList = async () => {
    try {
      const response = await axios.delete(`/api/lists/${listToDelete.id}`);
      console.log('List deleted:', response.data);
      
      // If the deleted list was active, switch to another list
      if (activeListId === listToDelete.id) {
        const remainingLists = lists.filter(l => l.id !== listToDelete.id);
        if (remainingLists.length > 0) {
          setActiveListId(remainingLists[0].id);
        } else {
          setActiveListId(null);
        }
      }
      
      fetchLists();
      setShowDeleteListConfirm(false);
      setListToDelete(null);
    } catch (error) {
      console.error('Error deleting list:', error);
      const errorMsg = error.response?.data?.error || error.message;
      alert(`Error deleting list: ${errorMsg}`);
    }
  };

  const handleTaskClick = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      console.log('Clicked task:', task);
      console.log('Task is_completed:', task.is_completed);
      console.log('Task allow_multiple_completions:', task.allow_multiple_completions);
      
      // For repeating tasks, always add new completions even if already completed
      // For regular tasks, do nothing if already completed
      if (task.is_completed && task.allow_multiple_completions !== 1) {
        console.log('Regular task already completed, doing nothing');
        return;
      }
      
      // Mark as done (for regular tasks) or add completion (for repeating tasks)
      const response = await axios.patch(`/api/tasks/${taskId}/status`, { is_completed: true });
      console.log('Task marked as done:', response.data);
      
      // Trigger immediate update
      setLastUpdate(Date.now());
      
      // Refetch the task data to get updated completion info
      console.log('Refetching list data...');
      fetchListData(activeListId);
    } catch (error) {
      console.error('Error marking task as done:', error);
      alert('Error marking task as done. Please try again.');
    }
  };

  const handleUndoCompletion = async (taskId) => {
    try {
      const response = await axios.patch(`/api/tasks/${taskId}/undo`);
      console.log('Last completion removed:', response.data);
      
      // Trigger immediate update
      setLastUpdate(Date.now());
      
      // Refetch the task data to get updated completion info
      fetchListData(activeListId);
    } catch (error) {
      console.error('Error undoing task:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alert('Error undoing task. Please try again.');
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
              <div className="flex flex-col justify-center">
                <h1 className="text-2xl font-bold text-white leading-tight">The Nest</h1>
                <div className="text-sm text-gray-300">
                  Welcome, {user?.username}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              
              <button
                onClick={() => {
                  const newShowHistory = !showHistory;
                  setShowHistory(newShowHistory);
                  if (newShowHistory && activeListId) {
                    fetchListHistory(activeListId);
                  }
                }}
                className={`p-2 rounded-lg transition-colors ${
                  showHistory 
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                    : 'text-gray-300 hover:bg-purple-500/10 hover:text-purple-200'
                }`}
              >
                <History className="h-5 w-5" />
              </button>
              
              {isAdmin && (
                <button
                  onClick={() => setShowCreateList(!showCreateList)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create List</span>
                </button>
              )}
              
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

      {/* History Panel */}
      {showHistory && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="glass rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">List History</h3>
              <div className="flex items-center space-x-2">
                                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-400">Loading history...</div>
              </div>
            ) : listHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400">No history available for this list.</div>
              </div>
            ) : (
              <div className="space-y-4">
                {listHistory.map((snapshot, index) => (
                  <div key={snapshot.id || index} className="border-l-2 border-purple-500/30 pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        {new Date(snapshot.period_start).toLocaleString()}
                      </span>
                      <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                        {JSON.parse(snapshot.snapshot_data || '{}').snapshot_type || 'Snapshot'}
                      </span>
                    </div>
                    
                    {snapshot.snapshot_data && (() => {
                      try {
                        const data = JSON.parse(snapshot.snapshot_data);
                        return data && (
                      <div className="text-sm text-gray-300">
                          <div className="mb-1">
                            <strong>Tasks:</strong> {data.tasks ? data.tasks.length : 0}
                          </div>
                          {data.tasks && data.tasks.length > 0 && (
                            <div className="ml-4 space-y-1">
                              {data.tasks.slice(0, 3).map(task => (
                                <div key={task.id} className="text-xs text-gray-400">
                                  • {task.title} {task.is_completed ? '(completed)' : ''}
                                </div>
                              ))}
                              {data.tasks.length > 3 && (
                                <div className="text-xs text-gray-500">
                                  ... and {data.tasks.length - 3} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        );
                      } catch (e) {
                        console.error('Error parsing snapshot data:', e);
                        return null;
                      }
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
            {isAdmin && (
              <button
                onClick={() => setShowCreateList(true)}
                className="btn-primary"
              >
                Create Your First List
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* List Tabs */}
            <div className="flex space-x-1 mb-6 overflow-x-auto">
              {lists.map((list) => (
                <div
                  key={list.id}
                  draggable={isAdmin}
                  onDragStart={(e) => handleDragStart(e, list)}
                  onDragOver={(e) => handleDragOver(e, list)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, list)}
                  className={`px-4 py-2 rounded-t-lg font-medium transition-all cursor-move relative ${
                    activeListId === list.id
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${
                    draggedList?.id === list.id ? 'opacity-50' : ''
                  }`}
                  onClick={() => setActiveListId(list.id)}
                >
                  {/* Left indicator - insert before */}
                  {dragOverList?.id === list.id && dragOverList?.insertBefore && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-400 rounded-l-lg"></div>
                  )}
                  
                  {/* Right indicator - insert after */}
                  {dragOverList?.id === list.id && !dragOverList?.insertBefore && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-purple-400 rounded-r-lg"></div>
                  )}
                  
                  {list.name}
                </div>
              ))}
            </div>

            {/* Goals Tracker */}
            {goals.length > 0 && (
              <div className="space-y-2 mb-6">
                {goals.map((goal) => (
                  <div key={goal.id} className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 border border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Target className="h-4 w-4 text-purple-400" />
                        <span className="font-medium text-white">{goal.name}</span>
                      </div>
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <span className="text-lg font-bold text-white">
                          {Math.round(goal.progress?.percentage || 0)}%
                        </span>
                        <span className="text-sm text-gray-400">
                          {goal.calculation_type === 'percentage_time' || goal.calculation_type === 'percentage_task_count' 
                            ? `${Math.round(goal.progress?.completed || 0)}/${goal.progress?.required || goal.target_value}%`
                            : goal.calculation_type === 'fixed_time' 
                            ? `${goal.progress?.completed || 0}/${goal.progress?.required || goal.target_value}min`
                            : `${goal.progress?.completed || 0}/${goal.progress?.required || goal.target_value}`
                          }
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 relative overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          (goal.progress?.percentage || 0) >= 150 ? 'bg-purple-500' :
                          (goal.progress?.percentage || 0) >= 125 ? 'bg-pink-500' :
                          (goal.progress?.percentage || 0) >= 100 ? 'bg-green-500' :
                          (goal.progress?.percentage || 0) >= 75 ? 'bg-blue-500' :
                          (goal.progress?.percentage || 0) >= 50 ? 'bg-yellow-500' :
                          (goal.progress?.percentage || 0) >= 25 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(goal.progress?.percentage || 0, 150)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Active List Content */}
            {activeList && (
              <div className="space-y-6">
                {/* List Header */}
                <div className="glass rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">{activeList.name}</h2>
                      {activeList.description && (
                        <p className="text-gray-300 mb-3">{activeList.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isAdmin && (
                        <button
                          onClick={() => handleEditList(activeList)}
                          className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center space-x-2"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit List</span>
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => setShowCreateTask(!showCreateTask)}
                          className="btn bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Task</span>
                        </button>
                      )}
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
                      <div>
                        <label className="label text-gray-200">Duration (minutes)</label>
                        <input
                          type="number"
                          value={newTask.duration_minutes}
                          onChange={(e) => {
                          const value = e.target.value;
                          setNewTask({ ...newTask, duration_minutes: value === '' ? '' : parseInt(value) || 0 });
                        }}
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

                {/* Edit Task Modal */}
                {showEditTask && (
                  <div className="glass rounded-xl p-6 border border-purple-500/20">
                    <h3 className="text-xl font-semibold mb-4 text-white">Edit Task</h3>
                    <form onSubmit={handleUpdateTask} className="space-y-4">
                      <div>
                        <label className="label text-gray-200">Task Title *</label>
                        <input
                          type="text"
                          value={editingTask.title}
                          onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                          className="input w-full"
                          placeholder="Enter task title"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="label text-gray-200">Description or instructions (optional)</label>
                        <textarea
                          value={editingTask.description}
                          onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                          className="input w-full"
                          placeholder="Enter description or instructions (optional)"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="label text-gray-200">Duration (minutes)</label>
                        <input
                          type="number"
                          min="0"
                          value={editingTask.duration_minutes}
                          onChange={(e) => {
                          const value = e.target.value;
                          setEditingTask({...editingTask, duration_minutes: value === '' ? '' : parseInt(value) || 0 });
                        }}
                          className="input w-full"
                          placeholder="0"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit_allow_multiple"
                          checked={editingTask.allow_multiple_completions}
                          onChange={(e) => setEditingTask({...editingTask, allow_multiple_completions: e.target.checked})}
                          className="rounded"
                        />
                        <label htmlFor="edit_allow_multiple" className="text-gray-200">
                          Allow multiple completions
                        </label>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button type="submit" className="btn-primary">
                          Update Task
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditTask(false);
                            setEditingTask(null);
                          }}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Edit List Modal */}
                {showEditList && (
                  <div className="glass rounded-xl p-6 border border-purple-500/20">
                    <h3 className="text-xl font-semibold mb-4 text-white">Edit List</h3>
                    <form onSubmit={handleUpdateList} className="space-y-4">
                      <div>
                        <label className="label text-gray-200">List Name *</label>
                        <input
                          type="text"
                          value={editingList.name}
                          onChange={(e) => setEditingList({...editingList, name: e.target.value})}
                          className="input w-full"
                          placeholder="Enter list name"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="label text-gray-200">Description (optional)</label>
                        <textarea
                          value={editingList.description}
                          onChange={(e) => setEditingList({...editingList, description: e.target.value})}
                          className="input w-full"
                          placeholder="Enter list description"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="label text-gray-200">Reset Period</label>
                        <select
                          value={editingList.reset_period}
                          onChange={(e) => setEditingList({...editingList, reset_period: e.target.value})}
                          className="input w-full"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="annually">Annually</option>
                          <option value="static">None - do not reset</option>
                        </select>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button type="submit" className="btn-primary">
                          Update List
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditList(false);
                            setEditingList(null);
                          }}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteList(editingList);
                            setShowEditList(false);
                            setEditingList(null);
                          }}
                          className="btn bg-red-600 text-white hover:bg-red-700 flex items-center space-x-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete List</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Delete List Confirmation Modal */}
                {showDeleteListConfirm && (
                  <div className="glass rounded-xl p-6 border border-red-500/20">
                    <h3 className="text-xl font-semibold mb-4 text-white">Delete List</h3>
                    <div className="mb-6">
                      <p className="text-gray-300 mb-2">
                        Are you sure you want to delete the list "<span className="font-semibold text-white">{listToDelete?.name}</span>"?
                      </p>
                      <p className="text-red-400 text-sm">
                        This action cannot be undone. All tasks in this list will be permanently deleted.
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleConfirmDeleteList}
                        className="btn bg-red-600 text-white hover:bg-red-700 flex items-center space-x-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete List</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteListConfirm(false);
                          setListToDelete(null);
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
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
                          draggable={isAdmin}
                          onDragStart={(e) => handleTaskDragStart(e, task)}
                          onDragOver={(e) => handleTaskDragOver(e, task)}
                          onDragLeave={handleTaskDragLeave}
                          onDrop={(e) => handleTaskDrop(e, task)}
                          className={`p-4 rounded-lg border transition-all cursor-move relative ${
                            task.is_completed
                              ? 'bg-green-900/30 border-green-500/50'
                              : 'bg-gray-800/50 border-gray-700 hover:border-purple-500/50'
                          } ${
                            draggedTask?.id === task.id ? 'opacity-50' : ''
                          }`}
                          onClick={() => handleTaskClick(task.id)}
                        >
                          {/* Top indicator - insert before */}
                          {dragOverTask?.id === task.id && dragOverTask?.insertBefore && (
                            <div className="absolute left-0 right-0 top-0 h-1 bg-purple-400 rounded-t-lg"></div>
                          )}
                          
                          {/* Bottom indicator - insert after */}
                          {dragOverTask?.id === task.id && !dragOverTask?.insertBefore && (
                            <div className="absolute left-0 right-0 bottom-0 h-1 bg-purple-400 rounded-b-lg"></div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <div>
                                {(() => {
                                  const elements = [];
                                  elements.push(
                                    <h4 key="title" className={`font-medium ${
                                      task.is_completed ? 'text-gray-400 line-through' : 'text-white'
                                    }`}>
                                      {task.title}
                                    </h4>
                                  );
                                  if (task.description) {
                                    elements.push(
                                      <p key="desc" className="text-gray-400 text-sm mt-1">{task.description}</p>
                                    );
                                  }
                                  if (task.duration_minutes && task.duration_minutes > 0) {
                                    elements.push(
                                      <p key="duration" className="text-gray-500 text-sm mt-1">
                                        <Clock className="h-3 w-3 inline mr-1" />
                                        {task.duration_minutes} minutes
                                      </p>
                                    );
                                  }
                                  if (task.is_completed) {
                                    // Parse completions if they exist
                                    let completions = [];
                                    if (task.completions) {
                                      console.log('Raw completions data:', task.completions);
                                      try {
                                        // Check if it's multiple completions (contains },{) or single completion
                                        if (task.completions.includes('},{')) {
                                          // Multiple completions - split and parse each
                                          const completionStrings = task.completions.split('},{').map((str, index, arr) => {
                                            if (index === 0) return str + '}';
                                            if (index === arr.length - 1) return '{' + str;
                                            return '{' + str + '}';
                                          });
                                          console.log('Split completion strings:', completionStrings);
                                          completions = completionStrings.map(str => JSON.parse(str));
                                        } else {
                                          // Single completion - parse directly
                                          console.log('Parsing single completion');
                                          completions = [JSON.parse(task.completions)];
                                        }
                                        console.log('Parsed completions:', completions);
                                      } catch (e) {
                                        console.error('Error parsing completions:', e);
                                        console.error('Task completions value that failed:', task.completions);
                                      }
                                    }
                                    
                                    // Check if this is a repeating task with multiple completions
                                    const hasMultipleCompletions = completions.length > 0 && completions.some(c => c.id !== null);
                                    console.log('Task allow_multiple_completions:', task.allow_multiple_completions);
                                    console.log('Completions array:', completions);
                                    console.log('Has multiple completions:', hasMultipleCompletions);
                                    
                                    if (hasMultipleCompletions) {
                                      // Show multiple completions for repeating tasks
                                      completions.filter(completion => completion.id !== null).forEach((completion, index) => {
                                        const completionText = completion.username ? 
                                          `Completed by ${completion.username}` : 
                                          'Completed';
                                        
                                        let timeText = '';
                                        if (completion.completed_at) {
                                          const completedDate = new Date(completion.completed_at);
                                          if (isDailyList()) {
                                            timeText = ` at ${completedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                          } else {
                                            timeText = ` on ${completedDate.toLocaleString([], { hour: '2-digit', minute: '2-digit' })}`;
                                          }
                                        }
                                        
                                        elements.push(
                                          <p key={`completion-${index}`} className="text-green-400 text-sm mt-1">
                                            {completionText}{timeText}
                                          </p>
                                        );
                                      });
                                    } else {
                                      // Show single completion for regular tasks
                                      if (task.completed_by_username || task.completed_at) {
                                        const completionText = task.completed_by_username ? 
                                          `Completed by ${task.completed_by_username}` : 
                                          'Completed';
                                        
                                        let timeText = '';
                                        if (task.completed_at) {
                                          const completedDate = new Date(task.completed_at);
                                          if (isDailyList()) {
                                            timeText = ` at ${completedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                          } else {
                                            timeText = ` on ${completedDate.toLocaleString([], { hour: '2-digit', minute: '2-digit' })}`;
                                          }
                                        }
                                        
                                        elements.push(
                                          <p key="completed" className="text-green-400 text-sm mt-1">
                                            {completionText}{timeText}
                                          </p>
                                        );
                                      }
                                    }
                                  }
                                  return elements;
                                })()}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {task.assigned_username && (
                                <span className="text-sm text-gray-400">
                                  <User className="h-3 w-3 inline mr-1" />
                                  {task.assigned_username}
                                </span>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTask(task);
                                  }}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                              {(() => {
                                const buttons = [];
                                
                                if (task.is_completed) {
                                  // Check if current user can undo this task
                                  let canUndo = false;
                                  let completions = [];
                                  
                                  console.log(`Checking undo for task ${task.id}:`);
                                  console.log('- Current user ID:', user.userId);
                                  console.log('- Current username:', user.username);
                                  console.log('- Task completions:', task.completions);
                                  
                                  if (task.completions) {
                                    try {
                                      // Parse completions to get the last completion
                                      if (task.completions.includes('},{')) {
                                        // Multiple completions - split and parse each
                                        const completionStrings = task.completions.split('},{').map((str, index, arr) => {
                                          if (index === 0) return str + '}';
                                          if (index === arr.length - 1) return '{' + str;
                                          return '{' + str + '}';
                                        });
                                        completions = completionStrings.map(str => JSON.parse(str));
                                      } else {
                                        // Single completion - parse directly
                                        completions = [JSON.parse(task.completions)];
                                      }
                                      console.log('- Parsed completions:', completions);
                                    } catch (e) {
                                      console.error('Error parsing completions for undo check:', e);
                                    }
                                  }
                                  
                                  // Check if the last completion was by the current user
                                  if (completions.length > 0) {
                                    const lastCompletion = completions[0];
                                    console.log('- Last completion:', lastCompletion);
                                    console.log('- Last completed_by:', lastCompletion.completed_by);
                                    
                                    // Allow undo if:
                                    // 1. The task was completed by the current user (any of their completions), OR
                                    // 2. The task has null completion data (old system) and the current user is admin
                                    const userCompletions = completions.filter(c => c.completed_by === user.userId);
                                    if (userCompletions.length > 0) {
                                      canUndo = true;
                                      console.log('- Can undo? true (user has completed this task)');
                                    } else if (lastCompletion.completed_by === null && user.username === 'admin') {
                                      // Admin can undo legacy tasks with null completion data
                                      canUndo = true;
                                      console.log('- Can undo? true (admin undoing legacy task)');
                                    } else {
                                      console.log('- Can undo? false (user has not completed this task)');
                                    }
                                  } else {
                                    console.log('- No completions found');
                                  }
                                  
                                  if (canUndo) {
                                    buttons.push(
                                      <button
                                        key="undo"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUndoCompletion(task.id);
                                        }}
                                        className="btn bg-orange-500 text-white hover:bg-orange-600 flex items-center justify-center space-x-1 px-3"
                                        title="Undo last completion"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        <span className="text-xs">Undo</span>
                                      </button>
                                    );
                                  }
                                }
                                
                                buttons.push(
                                  <button
                                    key="main"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTaskClick(task.id);
                                    }}
                                    className={`btn flex items-center justify-center space-x-2 min-w-[140px] ${
                                      task.is_completed
                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                        : 'bg-gray-500 text-white hover:bg-gray-600'
                                    }`}
                                  >
                                    {task.is_completed ? <Check className="h-4 w-4" /> : null}
                                    <span>
                                      {task.is_completed ? 
                                        (task.allow_multiple_completions === 1 ? 'Done Again?' : 'Done') : 
                                        'Mark Done'
                                      }
                                    </span>
                                  </button>
                                );
                                
                                return (
                                  <div key="button-container" className="flex items-center space-x-2">
                                    {buttons}
                                  </div>
                                );
                              })()}
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
