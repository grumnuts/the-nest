import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, Edit2, Edit, Trash2, X, Menu, ChevronDown, ChevronLeft, ChevronRight, Settings, LogOut, CheckCircle2, Circle, Clock, Check, Target, Repeat } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ToggleSwitch from './ToggleSwitch';
import ConfirmDialog from './ConfirmDialog';
import logoImage from '../assets/TheNestLogo.png';

const TaskCompletionInfo = ({ task, isDailyList }) => {
  if (task.is_completed !== true && task.is_completed !== 1) {
    return null;
  }
  
  // Parse completions if they exist
  let completions = [];
  if (task.completions) {
    try {
      // Check if it's multiple completions (contains },{) or single completion
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
    } catch (e) {
      console.error('Error parsing completions:', e);
    }
  }
  
  // Check if this is a repeating task with multiple completions
  const hasMultipleCompletions = completions.length > 0 && completions.some(c => c.id !== null);
  
  if (hasMultipleCompletions) {
    // Show all completions for repeating tasks
    return (
      <>
        {completions.map((completion, index) => {
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
          
          return (
            <p key={`completion-${index}`} className="text-green-400 text-sm mt-1">
              {completionText}{timeText}
            </p>
          );
        })}
      </>
    );
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
      
      return (
        <p key="completed" className="text-green-400 text-sm mt-1">
          {completionText}{timeText}
        </p>
      );
    }
  }
  return null;
};

const HomeScreen = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.is_admin === 1;
  
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showEditList, setShowEditList] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [showDeleteListConfirm, setShowDeleteListConfirm] = useState(false);
  const [listToDelete, setListToDelete] = useState(null);
  const [draggedList, setDraggedList] = useState(null);
  const [dragOverList, setDragOverList] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [goals, setGoals] = useState([]);
  const [goalDates, setGoalDates] = useState({}); // { goalId: 'YYYY-MM-DD' }
  const goalDatesRef = useRef(goalDates);
  goalDatesRef.current = goalDates; // Keep ref in sync with state
  const [listDates, setListDates] = useState({}); // { listId: 'YYYY-MM-DD' }
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

  // Date helpers
  const formatDateKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayKey = formatDateKey(new Date());

  const getSelectedDate = (listId) => {
    return listDates[listId] || todayKey;
  };

  const isToday = (dateStr) => dateStr === todayKey;

  const isFutureDate = (dateStr) => dateStr > todayKey;

  const navigateDate = (listId, direction) => {
    const current = getSelectedDate(listId);
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    const d = new Date(current + 'T12:00:00');
    
    switch (list.reset_period) {
      case 'daily':
        d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'weekly':
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'monthly':
        d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'quarterly':
        d.setMonth(d.getMonth() + (direction === 'next' ? 3 : -3));
        break;
      case 'annually':
        d.setFullYear(d.getFullYear() + (direction === 'next' ? 1 : -1));
        break;
      default:
        return; // static lists don't navigate
    }
    const newDate = formatDateKey(d);
    if (!isFutureDate(newDate)) {
      setListDates(prev => ({ ...prev, [listId]: newDate }));
    }
  };

  const goToToday = (listId) => {
    setListDates(prev => ({ ...prev, [listId]: todayKey }));
  };

  const getPeriodLabel = (list, dateStr) => {
    if (!list || list.reset_period === 'static') return '';
    const d = new Date(dateStr + 'T12:00:00');
    const options = { weekday: 'long' };
    
    switch (list.reset_period) {
      case 'daily':
        if (isToday(dateStr)) return 'Today';
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (dateStr === formatDateKey(yesterday)) return 'Yesterday';
        return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      case 'weekly': {
        const weekStart = new Date(d);
        const dow = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1)); // Monday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
      case 'monthly':
        return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      case 'quarterly': {
        const q = Math.floor(d.getMonth() / 3) + 1;
        return `Q${q} ${d.getFullYear()}`;
      }
      case 'annually':
        return `${d.getFullYear()}`;
      default:
        return '';
    }
  };

  const getPeriodDateRange = (list, dateStr) => {
    if (!list) return { start: dateStr, end: dateStr };
    const d = new Date(dateStr + 'T12:00:00');
    let start, end;
    
    switch (list.reset_period) {
      case 'daily':
        return { start: dateStr, end: dateStr };
      case 'weekly': {
        const ws = new Date(d);
        const wdow = ws.getDay();
        ws.setDate(ws.getDate() - (wdow === 0 ? 6 : wdow - 1)); // Monday
        const we = new Date(ws);
        we.setDate(we.getDate() + 6);
        return { start: formatDateKey(ws), end: formatDateKey(we) };
      }
      case 'monthly': {
        const ms = new Date(d.getFullYear(), d.getMonth(), 1);
        const me = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return { start: formatDateKey(ms), end: formatDateKey(me) };
      }
      case 'quarterly': {
        const q = Math.floor(d.getMonth() / 3);
        const qs = new Date(d.getFullYear(), q * 3, 1);
        const qe = new Date(d.getFullYear(), (q + 1) * 3, 0);
        return { start: formatDateKey(qs), end: formatDateKey(qe) };
      }
      case 'annually': {
        return { start: `${d.getFullYear()}-01-01`, end: `${d.getFullYear()}-12-31` };
      }
      default:
        return { start: dateStr, end: dateStr };
    }
  };

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
      setGoals(prev => {
        const newGoals = response.data.goals;
        // Preserve per-goal overridden progress from goalDates navigation
        return newGoals.map(g => {
          const existing = prev.find(p => p.id === g.id);
          // Only preserve if we have a custom date set for this goal
          if (goalDatesRef.current[g.id]) {
            // If we have existing progress, keep it; otherwise fetch the historical progress
            if (existing && existing.progress) {
              return { ...g, progress: existing.progress };
            } else {
              // Need to fetch the historical progress
              fetchGoalProgress(g.id, goalDatesRef.current[g.id]);
              return g;
            }
          }
          return g;
        });
      });
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const fetchGoalProgress = async (goalId, date) => {
    try {
      const url = date ? `/api/goals/${goalId}/progress?date=${date}` : `/api/goals/${goalId}/progress`;
      const response = await axios.get(url);
      setGoals(prev => prev.map(g => 
        g.id === goalId ? { ...g, progress: response.data.progress } : g
      ));
    } catch (error) {
      console.error('Error fetching goal progress:', error);
    }
  };

  const getGoalPeriodLabel = (goal) => {
    const dateStr = goalDatesRef.current[goal.id];
    if (!dateStr) return 'Current';
    return goal.progress?.periodLabel || dateStr;
  };

  const navigateGoalDate = (goal, direction) => {
    const current = goalDatesRef.current[goal.id] || todayKey;
    const d = new Date(current + 'T12:00:00');
    
    switch (goal.period_type) {
      case 'daily':
        d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'weekly':
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'monthly':
        d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'quarterly':
        d.setMonth(d.getMonth() + (direction === 'next' ? 3 : -3));
        break;
      case 'annually':
        d.setFullYear(d.getFullYear() + (direction === 'next' ? 1 : -1));
        break;
      default:
        return;
    }
    const newDate = formatDateKey(d);
    if (!isFutureDate(newDate)) {
      // If navigating lands on today or future (current period), reset to current
      if (newDate >= todayKey) {
        goToCurrentGoalPeriod(goal);
      } else {
        setGoalDates(prev => ({ ...prev, [goal.id]: newDate }));
        fetchGoalProgress(goal.id, newDate);
      }
    }
  };

  const goToCurrentGoalPeriod = (goal) => {
    setGoalDates(prev => {
      const next = { ...prev };
      delete next[goal.id];
      return next;
    });
    fetchGoalProgress(goal.id, null);
  };

  const isCurrentGoalPeriod = (goal) => {
    return !goalDatesRef.current[goal.id];
  };

  const fetchListData = async (listId, dateOverride) => {
    try {
      const list = lists.find(l => l.id === listId);
      const dateStr = dateOverride || getSelectedDate(listId);
      
      if (list && list.reset_period !== 'static') {
        const range = getPeriodDateRange(list, dateStr);
        if (range.start === range.end) {
          // Single day (daily)
          const tasksResponse = await axios.get(`/api/tasks/list/${listId}?date=${range.start}`);
          setTasks(tasksResponse.data.tasks || []);
        } else {
          // Date range (weekly/monthly/quarterly/annually)
          const tasksResponse = await axios.get(`/api/tasks/list/${listId}?dateStart=${range.start}&dateEnd=${range.end}`);
          setTasks(tasksResponse.data.tasks || []);
        }
      } else {
        const tasksResponse = await axios.get(`/api/tasks/list/${listId}`);
        setTasks(tasksResponse.data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching list data:', error);
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

  // Real-time updates - poll for changes every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeListId) {
        fetchListData(activeListId);
      }
      fetchLists();
      fetchGoals();
    }, 2000);

    return () => clearInterval(interval);
  }, [activeListId, listDates]);

  useEffect(() => {
    if (activeListId) {
      fetchListData(activeListId);
    }
  }, [activeListId, listDates]);

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
      const selectedDate = getSelectedDate(activeListId);
      const payload = { is_completed: isCompleted };
      if (!isToday(selectedDate)) payload.date = selectedDate;
      await axios.patch(`/api/tasks/${taskId}/status`, payload);
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

  const handleDeleteTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    setTaskToDelete(task);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      await axios.delete(`/api/tasks/${taskToDelete.id}`);
      fetchListData(activeListId);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task: ' + (error.response?.data?.error || error.message));
      setTaskToDelete(null);
    }
  };

  const cancelDeleteTask = () => {
    setTaskToDelete(null);
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
      
            
      // For repeating tasks, always add new completions even if already completed
      // For regular tasks, do nothing if already completed
      if (task.is_completed && task.allow_multiple_completions !== 1) {
                return;
      }
      
      // Mark as done (for regular tasks) or add completion (for repeating tasks)
      const selectedDate = getSelectedDate(activeListId);
      const payload = { is_completed: true };
      if (!isToday(selectedDate)) payload.date = selectedDate;
      const response = await axios.patch(`/api/tasks/${taskId}/status`, payload);
            
      // Trigger immediate update
      setLastUpdate(Date.now());
      
      // Refetch the task data to get updated completion info
            fetchListData(activeListId);
    } catch (error) {
      console.error('Error marking task as done:', error);
      alert('Error marking task as done. Please try again.');
    }
  };

  const handleUndoCompletion = async (taskId) => {
    try {
      const selectedDate = getSelectedDate(activeListId);
      const payload = {};
      if (!isToday(selectedDate)) payload.date = selectedDate;
      const response = await axios.patch(`/api/tasks/${taskId}/undo`, payload);
            
      // Trigger immediate update
      setLastUpdate(Date.now());
      
      // Refetch the task data to get updated completion info
      fetchListData(activeListId);
    } catch (error) {
      console.error('Error undoing task:', error);
      alert('Error undoing task. Please try again.');
    }
  };

  const toggleHideGoals = async () => {
    try {
      const newHideGoals = !user?.hide_goals;
      const response = await axios.patch('/api/users/hide-goals', { hide_goals: newHideGoals });
      
      // Update the user context with the new preference
      if (response.data) {
        updateUser({ hide_goals: newHideGoals });
      }
    } catch (error) {
      console.error('Error updating hide goals preference:', error);
      alert('Error updating preference. Please try again.');
    }
  };

  const toggleHideCompletedTasks = async () => {
    try {
      const newHideCompletedTasks = !user?.hide_completed_tasks;
      const response = await axios.patch('/api/users/hide-completed-tasks', { hide_completed_tasks: newHideCompletedTasks });
      
      // Update the user context with the new preference
      if (response.data) {
        updateUser({ hide_completed_tasks: newHideCompletedTasks });
      }
    } catch (error) {
      console.error('Error updating hide completed tasks preference:', error);
      alert('Error updating preference. Please try again.');
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
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="glass border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img 
                src={logoImage} 
                alt="The Nest Logo" 
                className="h-6 w-6 sm:h-8 sm:w-8 rounded"
              />
              <div className="flex flex-col justify-center">
                <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">The Nest</h1>
                <div className="text-xs sm:text-sm text-gray-300 hidden sm:block">
                  Welcome, {user?.username}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {lists.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">No Lists Yet</h2>
            <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">Create your first list to get started!</p>
            {isAdmin && (
              <button
                onClick={() => setShowCreateList(true)}
                className="btn-primary text-sm sm:text-base px-4 sm:px-6 py-2"
              >
                Create Your First List
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* List Tabs */}
            <div className="flex space-x-1 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {lists.map((list) => (
                <div
                  key={list.id}
                  draggable={isAdmin}
                  onDragStart={(e) => handleDragStart(e, list)}
                  onDragOver={(e) => handleDragOver(e, list)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, list)}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-t-lg text-xs sm:text-sm font-medium transition-all cursor-move relative whitespace-nowrap ${
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

            {/* Goals Tracker - Show header if goals exist, content only if not hidden */}
            {goals.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Goals Progress</h3>
                  <ToggleSwitch
                    isOn={!user?.hide_goals}
                    onToggle={toggleHideGoals}
                    icon={Settings}
                    labelText="Show Goals"
                    mobileText={!user?.hide_goals ? 'Hide' : 'Show'}
                    size="small"
                  />
                </div>
                
                {!user?.hide_goals && (
                  <div className="space-y-2 mb-4 sm:mb-6">
                    {goals.map((goal) => (
                    <div key={goal.id} className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 border border-purple-500/30">
                      <div className="flex items-center mb-1 sm:hidden">
                        <Target className="h-3 w-3 text-purple-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-white truncate ml-1">{goal.name}</span>
                        <span className="text-[10px] text-gray-500 flex-shrink-0 whitespace-nowrap ml-2">
                          {goal.calculation_type === 'percentage_time' ? '% Time' :
                           goal.calculation_type === 'percentage_task_count' ? '% Tasks' :
                           goal.calculation_type === 'fixed_time' ? 'Fixed Time' :
                           'Fixed Count'}
                        </span>
                      </div>
                      <div className="flex items-center mb-1 sm:mb-2">
                        <div className="hidden sm:flex items-center space-x-2 min-w-0 flex-1">
                          <Target className="h-4 w-4 text-purple-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-white truncate">{goal.name}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                            {goal.calculation_type === 'percentage_time' ? '% Time' :
                             goal.calculation_type === 'percentage_task_count' ? '% Tasks' :
                             goal.calculation_type === 'fixed_time' ? 'Fixed Time' :
                             'Fixed Count'}
                          </span>
                        </div>
                        <div className="flex items-center flex-shrink-0 w-full sm:w-[290px] justify-between sm:justify-end">
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => navigateGoalDate(goal, 'prev')}
                              className="p-0.5 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white transition-colors"
                              title="Previous period"
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => goToCurrentGoalPeriod(goal)}
                              className={`px-1.5 py-0.5 rounded text-xs font-medium transition-colors w-[110px] text-center ${
                                isCurrentGoalPeriod(goal)
                                  ? 'bg-purple-600/50 text-purple-200'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                              }`}
                            >
                              {getGoalPeriodLabel(goal)}
                            </button>
                            <button
                              onClick={() => navigateGoalDate(goal, 'next')}
                              disabled={isCurrentGoalPeriod(goal)}
                              className={`p-0.5 rounded transition-colors ${
                                isCurrentGoalPeriod(goal)
                                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                              }`}
                              title="Next period"
                            >
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex items-baseline ml-1 sm:ml-2">
                            <span className="text-sm sm:text-lg font-bold text-white w-[55px] text-right">
                              {goal.calculation_type === 'percentage_time' || goal.calculation_type === 'percentage_task_count' 
                                ? `${Math.round(goal.progress?.percentage || 0)}%`
                                : goal.calculation_type === 'fixed_time' 
                                ? `${Math.round(goal.progress?.completed || 0)}min`
                                : `${goal.progress?.completed || 0}`
                              }
                            </span>
                            <span className="text-xs sm:text-sm text-gray-400 w-[85px] text-right whitespace-nowrap">
                              {goal.calculation_type === 'percentage_time' || goal.calculation_type === 'percentage_task_count' 
                                ? `${Math.round(goal.progress?.completed || 0)}% /${goal.target_value}%`
                                : goal.calculation_type === 'fixed_time' 
                                ? `${Math.round(goal.progress?.completed || 0)} /${goal.progress?.required || goal.target_value}min`
                                : `${goal.progress?.completed || 0} /${goal.progress?.required || goal.target_value}`
                              }
                            </span>
                          </div>
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
              </>
            )}

            {/* Active List Content */}
            {activeList && (
              <div className="space-y-6">
                {/* List Header */}
                <div className="glass rounded-xl p-3 sm:p-4 border border-purple-500/20 relative">
                  {tasks.length > 0 && (
                    <span className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-[10px] sm:text-sm font-medium bg-gray-700 text-gray-300">
                      {tasks.filter(t => t.is_completed).length}/{tasks.length} Done
                    </span>
                  )}
                  <div className="mb-2">
                    <h2 className="text-lg sm:text-3xl font-bold text-white truncate pr-20 sm:pr-28">{activeList.name}</h2>
                    {activeList.reset_period !== 'static' && (
                      <p className="text-xs sm:text-sm text-gray-400">
                        {new Date(getSelectedDate(activeListId) + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {activeList.description && (
                    <p className="text-gray-300 text-sm mb-2">{activeList.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    {activeList.reset_period !== 'static' && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => navigateDate(activeListId, 'prev')}
                          className="p-1 sm:p-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                          title="Previous period"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                        </button>
                        <button
                          onClick={() => goToToday(activeListId)}
                          className={`px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-sm font-medium transition-colors w-[100px] sm:w-[200px] text-center ${
                            isToday(getSelectedDate(activeListId))
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                          }`}
                        >
                          {getPeriodLabel(activeList, getSelectedDate(activeListId))}
                        </button>
                        <button
                          onClick={() => navigateDate(activeListId, 'next')}
                          disabled={isToday(getSelectedDate(activeListId))}
                          className={`p-1 sm:p-1.5 rounded-lg transition-colors ${
                            isToday(getSelectedDate(activeListId))
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                          }`}
                          title="Next period"
                        >
                          <ChevronRight className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    )}
                    {activeList.reset_period === 'static' && <div />}
                    {isAdmin && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEditList(activeList)}
                          className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center space-x-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setShowCreateTask(!showCreateTask)}
                          className="btn bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 flex items-center space-x-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>Add</span>
                        </button>
                      </div>
                    )}
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
                      
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="btn-primary flex-1 min-w-[100px]">
                          Update Task
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditTask(false);
                            setEditingTask(null);
                          }}
                          className="btn-secondary flex-1 min-w-[80px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteTask(editingTask.id);
                            setShowEditTask(false);
                            setEditingTask(null);
                          }}
                          className="btn bg-red-600 text-white hover:bg-red-700 flex items-center justify-center space-x-2 flex-1 min-w-[120px]"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Task</span>
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
                <div className="mt-2 sm:mt-3 glass rounded-xl p-4 sm:p-6 border border-purple-500/20">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Tasks</h3>
                    <ToggleSwitch
                      isOn={!user?.hide_completed_tasks}
                      onToggle={toggleHideCompletedTasks}
                      icon={CheckCircle2}
                      labelText="Show Complete"
                      mobileText={!user?.hide_completed_tasks ? 'Hide' : 'Show'}
                      size="small"
                    />
                  </div>
                  {tasks.length === 0 ? (
                    <p className="text-gray-400 text-center py-6 text-sm">No tasks yet. Create your first task above!</p>
                  ) : user?.hide_completed_tasks && tasks.every(task => task.is_completed) ? (
                    <p className="text-gray-400 text-center py-6 text-sm">All tasks are completed. Toggle to show completed tasks.</p>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {tasks
                        .filter(task => !user?.hide_completed_tasks || !task.is_completed)
                        .map((task) => (
                        <div
                          key={task.id}
                          draggable={isAdmin}
                          onDragStart={(e) => handleTaskDragStart(e, task)}
                          onDragOver={(e) => handleTaskDragOver(e, task)}
                          onDragLeave={handleTaskDragLeave}
                          onDrop={(e) => handleTaskDrop(e, task)}
                          className={`p-3 sm:p-4 rounded-lg border transition-all cursor-move relative ${
                            task.is_completed
                              ? 'bg-green-900/30 border-green-500/50'
                              : 'bg-gray-800/50 border-gray-700 hover:border-purple-500/50'
                          } ${
                            draggedTask?.id === task.id ? 'opacity-50' : ''
                          }`}
                        >
                          {/* Top indicator - insert before */}
                          {dragOverTask?.id === task.id && dragOverTask?.insertBefore && (
                            <div className="absolute left-0 right-0 top-0 h-1 bg-purple-400 rounded-t-lg"></div>
                          )}
                          
                          {/* Bottom indicator - insert after */}
                          {dragOverTask?.id === task.id && !dragOverTask?.insertBefore && (
                            <div className="absolute left-0 right-0 bottom-0 h-1 bg-purple-400 rounded-b-lg"></div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h4 className={`font-medium ${
                                    (task.is_completed === true || task.is_completed === 1) ? 'text-gray-400 line-through' : 'text-white'
                                  }`}>
                                    {task.title}
                                  </h4>
                                  {(task.allow_multiple_completions === true || task.allow_multiple_completions === 1) && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30" title="Repeating task">
                                      <Repeat className="h-3.5 w-3.5 text-purple-400" />
                                    </span>
                                  )}
                                </div>
                                {task.description && (
                                  <p className="text-gray-400 text-sm mt-1">{task.description}</p>
                                )}
                                {task.duration_minutes !== null && task.duration_minutes !== undefined && Number(task.duration_minutes) > 0 && (
                                  <p className="text-gray-500 text-sm mt-1">
                                    <Clock className="h-3 w-3 inline mr-1" />
                                    {task.duration_minutes} minutes
                                  </p>
                                )}
                                {(task.is_completed === true || task.is_completed === 1) && <TaskCompletionInfo task={task} isDailyList={isDailyList} />}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
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
                              {(() => {
                                const buttons = [];
                                
                                if (task.is_completed) {
                                  // Check if current user can undo this task
                                  let canUndo = false;
                                  let completions = [];
                                  
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
                                    } catch (e) {
                                      console.error('Error parsing completions for undo check:', e);
                                    }
                                  }
                                  
                                  if (completions.length > 0) {
                                    const lastCompletion = completions[completions.length - 1];
                                    
                                    // User can undo if:
                                    // 1. The task was completed by the current user (any of their completions), OR
                                    // 2. The task was completed by null (legacy system) and user is admin
                                    const userCompletions = completions.filter(c => c.completed_by === user.userId);
                                    
                                    if (userCompletions.length > 0) {
                                      canUndo = true;
                                    } else if (lastCompletion.completed_by === null && user.is_admin === 1) {
                                      canUndo = true;
                                    }
                                  }
                                  
                                  if (canUndo) {
                                    buttons.push(
                                      <button
                                        key="undo"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUndoCompletion(task.id);
                                        }}
                                        className="btn bg-orange-500 text-white hover:bg-orange-600 flex items-center justify-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm"
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
                                    className={`btn flex items-center justify-center space-x-1 sm:space-x-2 px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm min-w-[100px] sm:min-w-[140px] ${
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
        </div>
      </div>
      
      <ConfirmDialog
      isOpen={!!taskToDelete}
      title="Delete Task"
      message={`Are you sure you want to delete the task "${taskToDelete?.title}"? This action cannot be undone.`}
      confirmText="Delete Task"
      cancelText="Cancel"
      onConfirm={confirmDeleteTask}
      onCancel={cancelDeleteTask}
      type="delete"
    />
    </>
  );
};

export default HomeScreen;
