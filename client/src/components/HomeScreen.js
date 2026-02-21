import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, Edit2, Trash2, X, Menu, ChevronDown, ChevronLeft, ChevronRight, Settings, LogOut, CheckCircle2, Circle, Clock, Check, Target, Repeat, Users, UserPlus, UserMinus, User, Crown, Star } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ToggleSwitch from './ToggleSwitch';
import ConfirmDialog from './ConfirmDialog';
import logoImage from '../assets/TheNestLogo.png';

// Helper function to get completion display name
const getCompletionDisplayName = (completion) => {
  if (!completion) return '';
  
  const firstName = completion.first_name;
  
  // If completion has first name, use it
  if (firstName) {
    return firstName;
  }
  
  // Fallback to username if no first name is set
  return completion.username || '';
};

// Helper function to get task completion display name
const getTaskCompletionDisplayName = (task) => {
  if (!task) return '';
  
  const firstName = task.completed_by_firstname;
  
  // If task has first name, use it
  if (firstName) {
    return firstName;
  }
  
  // Fallback to username if no first name is set
  return task.completed_by_username || '';
};

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
            `Completed by ${getCompletionDisplayName(completion)}` : 
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
            <p key={`completion-${index}`} className="text-green-400 text-xs mt-1">
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
        `Completed by ${getTaskCompletionDisplayName(task)}` : 
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
        <p key="completed" className="text-green-400 text-xs mt-1">
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

  // Helper function to get user's display name
  const getUserDisplayName = (user) => {
    if (!user) return '';
    
    const firstName = user.first_name;
    
    // If user has first name, use it
    if (firstName) {
      return firstName;
    }
    
    // Fallback to username if no first name is set
    return user.username;
  };

    
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
  const [animatingTasks, setAnimatingTasks] = useState(new Set()); // Track tasks showing checkbox animation
  const [listPermissions, setListPermissions] = useState({}); // { listId: 'admin' | 'user' }
  const [listUsers, setListUsers] = useState([]);
  const [selectedListForUsers, setSelectedListForUsers] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [completionsToDelete, setCompletionsToDelete] = useState([]); // Track completion IDs to delete
  const [selectedNewUser, setSelectedNewUser] = useState('');
  const [selectedNewUserPermission, setSelectedNewUserPermission] = useState('user');
  const [pendingUserChanges, setPendingUserChanges] = useState([]); // Stage user changes locally
  const [actionMessage, setActionMessage] = useState('');
  const [actionStatus, setActionStatus] = useState('success');
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
  
  // State for managing users in new list creation
  const [newListUsers, setNewListUsers] = useState([]);
  const [selectedNewListUser, setSelectedNewListUser] = useState('');
  const [selectedNewListUserPermission, setSelectedNewListUserPermission] = useState('user');
  
  // State for managing task completion dialog
  const [addingCompletionForTask, setAddingCompletionForTask] = useState(null);
  const [newCompletion, setNewCompletion] = useState({
    user_id: '',
    time: ''
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

  const showActionMessage = (message, status = 'success') => {
    setActionStatus(status);
    setActionMessage(message);
    setTimeout(() => setActionMessage(''), 2500);
  };

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
      
      // Fetch actual permissions for each list
      const permissions = {};
      for (const list of response.data.lists) {
        try {
          const userResponse = await axios.get(`/api/lists/${list.id}/users`);
          
          // Try multiple ways to find the user ID
          let userPermission = null;
          if (user?.id) {
            userPermission = userResponse.data.find(u => u.id === user.id);
          } else if (user?.username) {
            userPermission = userResponse.data.find(u => u.username === user.username);
          }
          
          permissions[list.id] = userPermission ? userPermission.permission_level : null;
        } catch (error) {
          console.error(`Error fetching permissions for list ${list.id}:`, error);
          permissions[list.id] = null;
        }
      }
      setListPermissions(permissions);
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  };

  // Check if user has admin permission for a list (admin or owner)
  const hasListAdminPermission = (listId) => {
    return listPermissions[listId] === 'admin' || listPermissions[listId] === 'owner';
  };

  // Check if user has owner permission for a list (only owners can edit lists)
  const hasListOwnerPermission = (listId) => {
    return listPermissions[listId] === 'owner';
  };

  // Check if user has any permission for a list
  const hasListPermission = (listId) => {
    return !!listPermissions[listId];
  };

  // Get effective permission for a user (including pending changes)
  const getEffectivePermission = (userId, originalPermission) => {
    const pendingChange = pendingUserChanges.find(
      change => change.userId === userId && (change.action === 'update' || change.action === 'add')
    );
    
    if (pendingChange) {
      return pendingChange.permissionLevel;
    }
    
    return originalPermission;
  };

  // Fetch all users for dropdown
  const fetchAllUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      const users = Array.isArray(response.data) ? response.data : response.data.users || [];
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  // Fetch list users for management
  const fetchListUsers = async (listId) => {
    try {
      const response = await axios.get(`/api/lists/${listId}/users`);
      // The API returns users directly in the response array, not in response.data.users
      const users = response.data || [];
      
      // Sort users by role hierarchy (owner > admin > user) then alphabetically
      const sortedUsers = [...users].sort((a, b) => {
        // Role hierarchy
        const roleOrder = { owner: 0, admin: 1, user: 2 };
        const aRoleOrder = roleOrder[a.permission_level] ?? 999;
        const bRoleOrder = roleOrder[b.permission_level] ?? 999;
        
        if (aRoleOrder !== bRoleOrder) {
          return aRoleOrder - bRoleOrder;
        }
        
        // Alphabetical by username if same role
        return a.username.localeCompare(b.username);
      });
      
      setListUsers(sortedUsers);
      setSelectedListForUsers(listId);
    } catch (error) {
      console.error('Error fetching list users:', error);
      setListUsers([]);
    }
  };

  // Add user to list (stage change locally)
  const addUserToList = (listId, userId, permissionLevel) => {
    // Convert userId to number for proper lookup
    const numericUserId = parseInt(userId, 10);
    
    // Check if this user is already in pending changes
    const existingChange = pendingUserChanges.find(
      change => change.userId === numericUserId && change.listId === listId
    );
    
    if (!existingChange) {
      const newChange = {
        listId,
        userId: numericUserId,
        action: 'add',
        permissionLevel,
        user: allUsers.find(u => u.id === numericUserId)
      };
      setPendingUserChanges(prev => [...prev, newChange]);
      
      // Update local display immediately with proper sorting
      setListUsers(prev => {
        const newUser = {
          id: numericUserId,
          username: allUsers.find(u => u.id === numericUserId)?.username,
          permission_level: permissionLevel
        };
        
        const updatedList = [...prev, newUser];
        
        // Sort by role hierarchy (owner > admin > user) then alphabetically
        return updatedList.sort((a, b) => {
          const roleOrder = { owner: 0, admin: 1, user: 2 };
          const aRoleOrder = roleOrder[a.permission_level] ?? 999;
          const bRoleOrder = roleOrder[b.permission_level] ?? 999;
          
          if (aRoleOrder !== bRoleOrder) {
            return aRoleOrder - bRoleOrder;
          }
          
          return a.username.localeCompare(b.username);
        });
      });
    }
  };

  // Add user to list by selection
  const addUserToListBySelection = (listId, userId, permissionLevel = 'user') => {
    if (!userId) {
      showActionMessage('Please select a user', 'error');
      return;
    }
    
    addUserToList(listId, userId, permissionLevel);
    setSelectedNewUser('');
    setSelectedNewUserPermission('user');
  };

  // Remove user from list (stage change locally)
  const removeUserFromList = (listId, userId) => {
    // Remove any existing add change for this user
    const filteredChanges = pendingUserChanges.filter(
      change => !(change.userId === userId && change.action === 'add')
    );
    
    // Add remove change
    setPendingUserChanges([...filteredChanges, {
      action: 'remove',
      userId
    }]);
    
    // Update local display immediately
    setListUsers(prev => prev.filter(user => user.id !== userId));
  };

  // Add user to new list (for list creation dialog)
  const addUserToNewList = (userId, permissionLevel) => {
    const numericUserId = parseInt(userId, 10);
    
    // Check if user is already in the list
    if (newListUsers.some(user => user.id === numericUserId)) {
      return;
    }
    
    const newUser = {
      id: numericUserId,
      username: allUsers.find(u => u.id === numericUserId)?.username,
      permission_level: permissionLevel
    };
    
    setNewListUsers(prev => {
      const updatedList = [...prev, newUser];
      
      // Sort by role hierarchy (owner > admin > user) then alphabetically
      const roleOrder = { owner: 0, admin: 1, user: 2 };
      return updatedList.sort((a, b) => {
        const aRoleOrder = roleOrder[a.permission_level] ?? 999;
        const bRoleOrder = roleOrder[b.permission_level] ?? 999;
        
        if (aRoleOrder !== bRoleOrder) {
          return aRoleOrder - bRoleOrder;
        }
        
        return a.username.localeCompare(b.username);
      });
    });
    
    setSelectedNewListUser('');
    setSelectedNewListUserPermission('user');
  };

  // Remove user from new list (for list creation dialog)
  const removeUserFromNewList = (userId) => {
    setNewListUsers(prev => prev.filter(user => user.id !== userId));
  };

  // Handle opening create list dialog
  const handleOpenCreateList = async () => {
    await fetchAllUsers();
    
    // Add current user as owner by default
    const currentUser = {
      id: user?.id,
      username: user?.username,
      permission_level: 'owner'
    };
    
    setNewListUsers([currentUser]);
    setSelectedNewListUser('');
    setSelectedNewListUserPermission('user');
    setShowCreateList(true);
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
    if (!dateStr) return 'Current Period';
    
    const d = new Date(dateStr + 'T12:00:00');
    
    switch (goal.period_type) {
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
        return 'Current Period';
    }
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
          const tasksResponse = await axios.get(`/api/tasks/list/${listId}?date=${range.start}&_t=${Date.now()}`);
          setTasks(tasksResponse.data.tasks || []);
        } else {
          // Date range (weekly/monthly/quarterly/annually)
          const tasksResponse = await axios.get(`/api/tasks/list/${listId}?dateStart=${range.start}&dateEnd=${range.end}&_t=${Date.now()}`);
          setTasks(tasksResponse.data.tasks || []);
        }
      } else {
        const tasksResponse = await axios.get(`/api/tasks/list/${listId}?_t=${Date.now()}`);
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
    if (!hasListAdminPermission(list.id)) {
      e.preventDefault();
      return;
    }
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
    setDragOverList(null);
  };

  const handleDrop = (e, targetList) => {
    e.preventDefault();
    setDragOverList(null);
    
    if (!hasListAdminPermission(targetList.id) || !draggedList || draggedList.id === targetList.id) {
      setDraggedList(null);
      return;
    }

    const draggedIndex = lists.findIndex(list => list.id === draggedList.id);
    const targetIndex = lists.findIndex(list => list.id === targetList.id);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedList(null);
      return;
    }
    
    const newLists = [...lists];
    const [movedList] = newLists.splice(draggedIndex, 1);
    
    // Determine insertion position based on where the user dropped
    const rect = e.currentTarget.getBoundingClientRect();
    const midPoint = rect.left + rect.width / 2;
    const insertBefore = e.clientX < midPoint;
    
    // Calculate the final index accounting for the removal
    let finalIndex;
    if (draggedIndex < targetIndex) {
      // If dragging forward, the target index shifts back by 1
      finalIndex = insertBefore ? targetIndex - 1 : targetIndex;
    } else {
      // If dragging backward, target index stays the same
      finalIndex = insertBefore ? targetIndex : targetIndex + 1;
    }
    
    // Ensure index is within bounds
    finalIndex = Math.max(0, Math.min(finalIndex, newLists.length));
    
    newLists.splice(finalIndex, 0, movedList);
    
    setLists(newLists);
    setDraggedList(null);
    
    // Save the new order to the backend
    saveListOrder(newLists);
  };

  const saveListOrder = async (orderedLists) => {
    try {
      const listIds = orderedLists.map(list => list.id);
      await axios.post('/api/lists/reorder', { listIds });
    } catch (error) {
      console.error('Error saving list order:', error);
      // Optionally revert the order if save fails
      fetchLists();
    }
  };

  // Drag and drop functions for task reordering
  const handleTaskDragStart = (e, task) => {
    if (!hasListAdminPermission(activeListId)) {
      e.preventDefault();
      return;
    }
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
    setDragOverTask(null);
  };

  const handleTaskDrop = (e, targetTask) => {
    e.preventDefault();
    setDragOverTask(null);
    
    if (!hasListAdminPermission(activeListId) || !draggedTask || draggedTask.id === targetTask.id) {
      setDraggedTask(null);
      return;
    }

    const draggedIndex = tasks.findIndex(task => task.id === draggedTask.id);
    const targetIndex = tasks.findIndex(task => task.id === targetTask.id);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedTask(null);
      return;
    }
    
    const newTasks = [...tasks];
    const [movedTask] = newTasks.splice(draggedIndex, 1);
    
    // Determine insertion position based on where the user dropped
    const rect = e.currentTarget.getBoundingClientRect();
    const midPoint = rect.top + rect.height / 2;
    const insertBefore = e.clientY < midPoint;
    
    // Calculate the final index accounting for the removal
    let finalIndex;
    if (draggedIndex < targetIndex) {
      // If dragging forward, the target index shifts back by 1
      finalIndex = insertBefore ? targetIndex - 1 : targetIndex;
    } else {
      // If dragging backward, target index stays the same
      finalIndex = insertBefore ? targetIndex : targetIndex + 1;
    }
    
    // Ensure index is within bounds
    finalIndex = Math.max(0, Math.min(finalIndex, newTasks.length));
    
    newTasks.splice(finalIndex, 0, movedTask);
    
    setTasks(newTasks);
    setDraggedTask(null);
    
    // Save the new order to the backend
    saveTaskOrder(newTasks);
  };

  const saveTaskOrder = async (orderedTasks) => {
    try {
      const taskIds = orderedTasks.map(task => task.id);
      await axios.post(`/api/tasks/reorder/${activeListId}`, { taskIds });
      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Error saving task order:', error);
      // Optionally revert the order on error
      fetchListData(activeListId);
    }
  };

  
  // Global drag end handler for cleanup
  useEffect(() => {
    const handleDragEnd = () => {
      setDraggedList(null);
      setDraggedTask(null);
      setDragOverList(null);
      setDragOverTask(null);
    };

    document.addEventListener('dragend', handleDragEnd);
    return () => document.removeEventListener('dragend', handleDragEnd);
  }, []);

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
  }, [activeListId, lists]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    // Check if user has admin permission for the current list
    if (!hasListAdminPermission(activeListId)) {
      showActionMessage('Only list admins can create tasks', 'error');
      return;
    }
    
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
      showActionMessage(`Error creating task: ${errorMsg}`, 'error');
    }
  };

  const handleSetGoal = async (e) => {
    e.preventDefault();
    // Goals functionality removed
    showActionMessage('Goals functionality has been removed.', 'error');
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
      showActionMessage('Error updating task. Please try again.', 'error');
    }
  };

  const handleUndoTask = async (taskId) => {
    try {
      await axios.patch(`/api/tasks/${taskId}/undo`);
      fetchListData(activeListId);
      fetchGoals(); // Immediate goal progress update
    } catch (error) {
      console.error('Error undoing task:', error);
      showActionMessage('Error undoing task. Please try again.', 'error');
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    try {
      // Create the list first
      const response = await axios.post('/api/lists', {
        name: newList.name,
        description: newList.description,
        reset_period: newList.reset_period
      });
      
      const listId = response.data.listId;
      
      // Add users to the new list (excluding current user who is automatically added as owner)
      for (const userListUser of newListUsers) {
        // Skip the current user since they're automatically added as owner by the backend
        if (userListUser.id === user?.id) {
          continue;
        }
        
        await axios.post(`/api/lists/${listId}/users`, {
          userId: userListUser.id,
          permissionLevel: userListUser.permission_level
        });
      }
      
      // Reset form state
      setNewList({
        name: '',
        description: '',
        reset_period: 'daily'
      });
      setNewListUsers([]);
      setSelectedNewListUser('');
      setSelectedNewListUserPermission('user');
      setShowCreateList(false);
      
      // Small delay to ensure backend has processed the permissions
      setTimeout(() => {
        fetchLists();
      }, 300);
    } catch (error) {
      console.error('Error creating list:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.errors 
        ? error.response.data.errors.map(e => e.msg).join(', ')
        : error.response?.data?.error || error.message;
      showActionMessage(`Error creating list: ${errorMsg}`, 'error');
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
    
    // Check if user has admin permission for the current list
    if (!hasListAdminPermission(activeListId)) {
      showActionMessage('Only list admins can delete tasks', 'error');
      setTaskToDelete(null);
      return;
    }
    
    try {
      await axios.delete(`/api/tasks/${taskToDelete.id}`);
      fetchListData(activeListId);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      showActionMessage(error.response?.data?.error || 'Error deleting task', 'error');
      setTaskToDelete(null);
    }
  };

  const cancelDeleteTask = () => {
    setTaskToDelete(null);
  };
  const handleEditTask = (task) => {
    // If clicking edit on the task that's already being edited, close the form
    if (showEditTask && editingTask?.id === task.id) {
      setShowEditTask(false);
      setEditingTask(null);
      setCompletionsToDelete([]);
    } else {
      // Open edit form for this task
      setEditingTask({
        id: task.id,
        title: task.title,
        description: task.description || '',
        duration_minutes: task.duration_minutes || 0,
        allow_multiple_completions: task.allow_multiple_completions === 1,
        completions: task.completions
      });
      setCompletionsToDelete([]);
      setShowEditTask(true);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    
    // Check if user has admin permission for the current list
    if (!hasListAdminPermission(activeListId)) {
      showActionMessage('Only list admins can edit tasks', 'error');
      return;
    }
    
    try {
      // Delete marked completions first
      if (completionsToDelete.length > 0) {
        await Promise.all(
          completionsToDelete.map(completionId =>
            axios.delete(`/api/tasks/${editingTask.id}/completions/${completionId}`)
          )
        );
      }
      
      const response = await axios.patch(`/api/tasks/${editingTask.id}`, {
        title: editingTask.title,
        description: editingTask.description,
        duration_minutes: editingTask.duration_minutes,
        allow_multiple_completions: editingTask.allow_multiple_completions
      });
            fetchListData(activeListId);
      setShowEditTask(false);
      setEditingTask(null);
      setCompletionsToDelete([]);
    } catch (error) {
      console.error('Error updating task:', error);
      const errorMsg = error.response?.data?.error || error.message;
      showActionMessage(`Error updating task: ${errorMsg}`, 'error');
    }
  };

  const handleAddCompletion = async (e) => {
    e.preventDefault();
    
    // Check if user has admin permission for the current list
    if (!hasListAdminPermission(activeListId)) {
      showActionMessage('Only list admins can add completions', 'error');
      return;
    }
    
    try {
      // Construct the completed_at timestamp
      const selectedDate = getSelectedDate(activeListId);
      const completed_at = `${selectedDate} ${newCompletion.time}:00`;
      
      await axios.post(`/api/tasks/${addingCompletionForTask.id}/completions`, {
        user_id: parseInt(newCompletion.user_id),
        completed_at
      });
      
      fetchListData(activeListId);
      setAddingCompletionForTask(null);
      setNewCompletion({ user_id: '', time: '' });
      showActionMessage('Completion added successfully', 'success');
    } catch (error) {
      console.error('Error adding completion:', error);
      const errorMsg = error.response?.data?.error || error.message;
      showActionMessage(`Error adding completion: ${errorMsg}`, 'error');
    }
  };

  const handleEditList = (list) => {
    // If clicking edit on the list that's already being edited, close the form
    if (showEditList && editingList?.id === list.id) {
      setShowEditList(false);
      setEditingList(null);
    } else {
      // Open edit form for this list
      setEditingList({
        id: list.id,
        name: list.name,
        description: list.description,
        reset_period: list.reset_period
      });
      // Fetch list users and all users when opening edit modal
      fetchListUsers(list.id);
      fetchAllUsers();
      // Reset pending changes
      setPendingUserChanges([]);
      setSelectedNewUserPermission('user');
      setShowEditList(true);
    }
  };

  const handleUpdateList = async (e) => {
    e.preventDefault();
    try {
      // Apply all pending user changes first
      for (const change of pendingUserChanges) {
        if (change.action === 'add') {
          await axios.post(`/api/lists/${editingList.id}/users`, {
            userId: change.userId,
            permissionLevel: change.permissionLevel
          });
        } else if (change.action === 'remove') {
          await axios.delete(`/api/lists/${editingList.id}/users/${change.userId}`);
        } else if (change.action === 'update') {
          await axios.post(`/api/lists/${editingList.id}/users`, {
            userId: change.userId,
            permissionLevel: change.permissionLevel
          });
        }
      }

      // Update list details
      const response = await axios.patch(`/api/lists/${editingList.id}`, {
        name: editingList.name,
        description: editingList.description,
        reset_period: editingList.reset_period
      });
      
      // Force refresh permissions after a short delay to ensure backend changes are processed
      setTimeout(() => {
        fetchLists();
      }, 500);
      
      setShowEditList(false);
      setEditingList(null);
      setPendingUserChanges([]);
      setSelectedNewUserPermission('user');
    } catch (error) {
      console.error('Error updating list:', error);
      showActionMessage(error.response?.data?.error || 'Error updating list', 'error');
    }
  };

  const handleDeleteList = (list) => {
    setListToDelete(list);
    setShowDeleteListConfirm(true);
  };

  const handleConfirmDeleteList = async () => {
    try {
      await axios.delete(`/api/lists/${listToDelete.id}`);
      
      // If the deleted list was active, switch to another list
      if (activeListId === listToDelete.id) {
        const remainingLists = lists.filter(list => list.id !== listToDelete.id);
        if (remainingLists.length > 0) {
          setActiveListId(remainingLists[0].id);
        } else {
          setActiveListId(null);
        }
      }
      
      setShowDeleteListConfirm(false);
      setListToDelete(null);
      fetchLists(); // Refresh the lists
    } catch (error) {
      console.error('Error deleting list:', error);
      const errorMsg = error.response?.data?.error || error.message;
      showActionMessage(`Error deleting list: ${errorMsg}`, 'error');
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
      showActionMessage('Error marking task as done. Please try again.', 'error');
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
      showActionMessage('Error undoing task. Please try again.', 'error');
    }
  };

  const handleTaskIconClick = async (task) => {
    // Non-repeating task and already completed: undo
    if (task.is_completed && task.allow_multiple_completions !== 1) {
      await handleUndoCompletion(task.id);
      return;
    }

    // For repeating tasks or uncompleted tasks: add completion/mark done
    if (task.allow_multiple_completions === 1) {
      // Show checkbox animation for 100ms then switch to circle
      setAnimatingTasks(prev => new Set([...prev, task.id]));
      setTimeout(() => {
        setAnimatingTasks(prev => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      }, 100);
    }

    await handleTaskClick(task.id);
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
      showActionMessage('Error updating preference. Please try again.', 'error');
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
      showActionMessage('Error updating preference. Please try again.', 'error');
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
      // Close any open editors when navigating
      setShowEditList(false);
      setEditingList(null);
      setShowEditTask(false);
      setEditingTask(null);
      setAddingCompletionForTask(null);
      setNewCompletion({ user_id: '', time: '' });
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
                  Welcome, {getUserDisplayName(user)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={handleOpenCreateList}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add List</span>
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
              
            </div>
          </div>
        </div>
      </header>

      {/* Add List Form */}
      {showCreateList && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="glass rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-lg font-semibold mb-4 text-white">Add New List</h3>
            <form onSubmit={handleCreateList} className="stack">
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
              
              {/* List Users Section */}
              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-lg font-medium text-white flex items-center mb-4">
                  <Users className="h-5 w-5 mr-2 text-purple-400" />
                  List Permissions
                </h4>
                
                <div className="stack mb-4">
                  {newListUsers.map((listUser) => (
                    <div key={listUser.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          {listUser.permission_level === 'owner' ? (
                            <Crown className="h-4 w-4 text-yellow-400" />
                          ) : listUser.permission_level === 'admin' ? (
                            <Settings className="h-4 w-4 text-orange-400" />
                          ) : (
                            <User className="h-4 w-4 text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{listUser.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Show dropdown for all users except current user */}
                        {user?.id !== listUser.id ? (
                          <select
                            value={listUser.permission_level}
                            onChange={(e) => {
                              const newPermission = e.target.value;
                              setNewListUsers(prev => {
                                const updatedList = prev.map(user => 
                                  user.id === listUser.id 
                                    ? { ...user, permission_level: newPermission }
                                    : user
                                );
                                
                                // Sort by role hierarchy (owner > admin > user) then alphabetically
                                const roleOrder = { owner: 0, admin: 1, user: 2 };
                                return updatedList.sort((a, b) => {
                                  const aRoleOrder = roleOrder[a.permission_level] ?? 999;
                                  const bRoleOrder = roleOrder[b.permission_level] ?? 999;
                                  
                                  if (aRoleOrder !== bRoleOrder) {
                                    return aRoleOrder - bRoleOrder;
                                  }
                                  
                                  return a.username.localeCompare(b.username);
                                });
                              });
                            }}
                            className="bg-gray-700 text-white px-2 py-1 rounded text-xs border border-gray-600 focus:border-purple-500 focus:outline-none"
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                          </select>
                        ) : (
                          // Show empty space for current user as owner to maintain alignment
                          <div className="w-20"></div>
                        )}
                        
                        {/* Show delete button for all users except current user */}
                        {user?.id !== listUser.id && (
                          <button
                            type="button"
                            onClick={() => removeUserFromNewList(listUser.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Remove user"
                          >
                            <UserMinus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-gray-700 pt-3">
                  <p className="text-xs text-gray-400 mb-2">Add new user:</p>
                  <div className="stack">
                    <select
                      value={selectedNewListUser}
                      onChange={(e) => setSelectedNewListUser(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">Select a user...</option>
                      {allUsers
                        .filter(user => !newListUsers.some(listUser => listUser.id === user.id))
                        .map(user => (
                          <option key={user.id} value={user.id}>
                            {user.username}
                          </option>
                        ))
                      }
                    </select>
                    <select
                      value={selectedNewListUserPermission}
                      onChange={(e) => setSelectedNewListUserPermission(e.target.value)}
                      className="input w-full"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p><span className="font-medium text-gray-300">Owner:</span> Can manage settings and tasks</p>
                      <p><span className="font-medium text-gray-300">Admin:</span> Can manage tasks</p>
                      <p><span className="font-medium text-gray-300">User:</span> Can view and complete tasks</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        addUserToNewList(selectedNewListUser, selectedNewListUserPermission);
                      }}
                      className="btn-primary w-full flex items-center justify-center"
                    >
                      <UserPlus className="h-3 w-3 mr-2" />
                      Add User
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">
                  Add List
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateList(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pt-2 pb-4 sm:pb-6 lg:pb-8">
        {lists.length === 0 && actionMessage && (
          <div className={`text-sm mb-2 ${actionStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {actionMessage}
          </div>
        )}
        {lists.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">No Lists Yet</h2>
            <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">Create your first list to get started!</p>
            <button
              onClick={handleOpenCreateList}
              className="btn-primary text-sm sm:text-base px-4 sm:px-6 py-2"
            >
              Create Your First List
            </button>
          </div>
        ) : (
          <div>
            {/* List Tabs */}
            <div className="flex space-x-1 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', marginBottom: '5px' }}>
              {lists.map((list) => (
                <div
                  key={list.id}
                  draggable={hasListAdminPermission(list.id)}
                  onDragStart={(e) => handleDragStart(e, list)}
                  onDragOver={(e) => handleDragOver(e, list)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, list)}
                  data-draggable="true"
                  data-list-id={list.id}
                  className={`flex items-center space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md transition-colors cursor-move relative whitespace-nowrap ${
                    activeListId === list.id
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  } ${
                    draggedList?.id === list.id ? 'opacity-50' : ''
                  }`}
                  onClick={() => {
                    // Close any open editors when clicking on a list
                    setShowEditList(false);
                    setEditingList(null);
                    setShowEditTask(false);
                    setEditingTask(null);
                    setAddingCompletionForTask(null);
                    setNewCompletion({ user_id: '', time: '' });
                    setActiveListId(list.id);
                  }}
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
            {actionMessage && (
              <div className={`text-sm mb-2 ${actionStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {actionMessage}
              </div>
            )}

            {goals.length > 0 && (
              <div className={`glass rounded-xl px-2 sm:px-4 border border-purple-500/20 mb-1 ${
                user?.hide_goals ? 'pt-1.5 pb-2' : 'pt-1.5 pb-4 sm:pt-2 sm:pb-6'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-white">Goals</h3>
                  <ToggleSwitch
                    isOn={!user?.hide_goals}
                    onToggle={toggleHideGoals}
                    labelText={!user?.hide_goals ? 'Hide Goals' : 'Show Goals'}
                    mobileText={!user?.hide_goals ? 'Hide Goals' : 'Show Goals'}
                    size="small"
                  />
                </div>

                {!user?.hide_goals && (
                  <div className="stack">
                    {goals.map((goal) => {
                      // compute safe values and round UP to next whole number
                      const completedRaw = Number(goal.progress?.completed ?? goal.progress?.completed_value ?? 0) || 0;
                      const requiredRaw = Number(goal.progress?.required ?? goal.target_value ?? 0) || 0;
                      const completed = Math.ceil(completedRaw);
                      const required = Math.ceil(requiredRaw);
                      let percentage = Number(goal.progress?.percentage ?? NaN);
                      if (isNaN(percentage)) {
                        percentage = requiredRaw > 0 ? Math.ceil((completedRaw / requiredRaw) * 100) : 0;
                      } else {
                        percentage = Math.ceil(percentage);
                      }

                      // status string based on type
                      let statusStr = `${completed} / ${required}`;

                      if (goal.calculation_type && goal.calculation_type.includes('percentage')) {
                        // For percentage goals, the server returns `progress.completed` as percent-of-possible-time
                        // Use that as the left-side metric (completed percent), and show the target as a percent.
                        const completedPercent = Math.ceil(Number(goal.progress?.completed ?? completedRaw) || 0);
                        statusStr = `${completedPercent} / ${required}%`;

                        // Ensure `percentage` reflects percent-of-target (progress toward goal)
                        percentage = Math.ceil(Number(goal.progress?.percentage ?? (required > 0 ? (completedPercent / required) * 100 : 0)) || 0);

                        // Debug logging to help trace mismatches (only in non-production)
                        if (process.env.NODE_ENV !== 'production' && goal.calculation_type === 'percentage_time') {
                          // eslint-disable-next-line no-console
                          console.debug('Goal percentage_time debug', { goalId: goal.id, completedRaw, completedPercent, requiredRaw, required, percentage, progress: goal.progress });
                        }
                      } else if (goal.calculation_type === 'fixed_time') {
                        statusStr = `${completed} / ${required || 0}min`;
                      }

                      return (
                        <div key={goal.id} className="bg-gray-800/50 rounded-lg transition-all overflow-hidden border-0">
                          <div className="py-2 sm:py-3 px-3 sm:px-4 border-b-0">
                            <div className="flex items-baseline space-x-2 min-w-0">
                              <Target className="h-4 w-4 text-purple-400 flex-shrink-0" />
                              <span className="text-sm font-medium text-white truncate">{goal.name}</span>
                              <span className="sm:hidden text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                                {goal.calculation_type === 'percentage_time' ? '% Time' :
                                 goal.calculation_type === 'percentage_task_count' ? '% Tasks' :
                                 goal.calculation_type === 'fixed_time' ? 'Fixed Time' :
                                 'Fixed Count'}
                              </span>
                            </div>
                            <div className="hidden sm:flex justify-between items-center mt-1">
                              <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                                {goal.calculation_type === 'percentage_time' ? '% Time' :
                                 goal.calculation_type === 'percentage_task_count' ? '% Tasks' :
                                 goal.calculation_type === 'fixed_time' ? 'Fixed Time' :
                                 'Fixed Count'}
                              </span>
                              <div className="flex items-center gap-1">
                                {/* Goal Period Navigation */}
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => navigateGoalDate(goal, 'prev')}
                                    className="p-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                                    title="Previous period"
                                  >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => goToCurrentGoalPeriod(goal)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors min-w-[100px] text-center ${
                                      isCurrentGoalPeriod(goal)
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                    }`}
                                  >
                                    {getGoalPeriodLabel(goal)}
                                  </button>
                                  <button
                                    onClick={() => navigateGoalDate(goal, 'next')}
                                    disabled={isCurrentGoalPeriod(goal)}
                                    className={`p-1 rounded-lg transition-colors ${
                                      isCurrentGoalPeriod(goal)
                                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                    }`}
                                    title="Next period"
                                  >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-baseline justify-end gap-0 flex-nowrap">
                                  <div className="text-xs text-gray-400 text-right w-[60px] whitespace-nowrap" title="Goal status">
                                    {statusStr}
                                  </div>
                                  <div className="text-sm font-bold text-white w-[48px] text-right whitespace-nowrap" title="Goal percentage">
                                    {`${percentage || 0}%`}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="sm:hidden flex justify-between items-center mt-1">
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => navigateGoalDate(goal, 'prev')}
                                  className="p-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                                  title="Previous period"
                                >
                                  <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => goToCurrentGoalPeriod(goal)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors min-w-[100px] text-center ${
                                    isCurrentGoalPeriod(goal)
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                  }`}
                                >
                                  {getGoalPeriodLabel(goal)}
                                </button>
                                <button
                                  onClick={() => navigateGoalDate(goal, 'next')}
                                  disabled={isCurrentGoalPeriod(goal)}
                                  className={`p-1 rounded-lg transition-colors ${
                                    isCurrentGoalPeriod(goal)
                                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                  }`}
                                  title="Next period"
                                >
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex items-baseline justify-end gap-0 flex-nowrap">
                                <div className="text-xs text-gray-400 text-right w-[60px] whitespace-nowrap" title="Goal status">
                                  {statusStr}
                                </div>
                                <div className="text-sm font-bold text-white w-[48px] text-right whitespace-nowrap" title="Goal percentage">
                                  {`${percentage || 0}%`}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="px-3 sm:px-4 pb-2 sm:pb-3">
                            <div className="w-full bg-gray-700 rounded-full h-2 relative overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  (percentage || 0) >= 150 ? 'bg-purple-500' :
                                  (percentage || 0) >= 125 ? 'bg-pink-500' :
                                  (percentage || 0) >= 100 ? 'bg-green-500' :
                                  (percentage || 0) >= 75 ? 'bg-blue-500' :
                                  (percentage || 0) >= 50 ? 'bg-yellow-500' :
                                  (percentage || 0) >= 25 ? 'bg-orange-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(percentage || 0, 150)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Active List Content */}
            {activeList && (
              <div className="stack">
                {/* Add Task Form */}
                {showCreateTask && (
                  <div className="glass rounded-xl pt-3 px-6 pb-6 sm:pt-4 sm:px-6 sm:pb-6 border border-purple-500/20">
                    <h3 className="text-xl font-semibold mb-4 text-white">Add New Task</h3>
                    <form onSubmit={handleCreateTask} className="stack">
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
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary flex-1">
                          Add Task
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateTask(false)}
                          className="btn-secondary flex-1"
                        >
                          Cancel
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
                <div className="glass rounded-xl px-2 sm:px-4 pt-1.5 pb-4 sm:pt-2 sm:pb-6 border border-purple-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Tasks</h3>
                    <div className="flex items-center gap-2">
                      {tasks.length > 0 && (
                        <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-[10px] sm:text-sm font-medium bg-gray-700 text-gray-300">
                          {tasks.filter(t => t.is_completed).length}/{tasks.length} Done
                        </span>
                      )}
                      <ToggleSwitch
                        isOn={!user?.hide_completed_tasks}
                        onToggle={toggleHideCompletedTasks}
                        labelText={!user?.hide_completed_tasks ? 'Hide Complete' : 'Show Complete'}
                        mobileText={!user?.hide_completed_tasks ? 'Hide Complete' : 'Show Complete'}
                        size="small"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center sm:justify-end gap-2 mb-1">
                    {activeList.reset_period !== 'static' && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => navigateDate(activeListId, 'prev')}
                          className="p-2 sm:p-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
                          title="Previous period"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                        </button>
                        <button
                          onClick={() => goToToday(activeListId)}
                          className={`px-1.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-sm font-medium transition-colors w-[100px] sm:w-[140px] text-center ${
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
                          className={`p-2 sm:p-1.5 rounded-lg transition-colors ${
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
                    {hasListAdminPermission(activeListId) && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        {hasListOwnerPermission(activeListId) && (
                          <button
                            onClick={() => handleEditList(activeList)}
                            className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center space-x-1 px-2 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm"
                          >
                            <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          onClick={() => setShowCreateTask(!showCreateTask)}
                          className="btn bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 flex items-center space-x-1 px-2 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm"
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>Add Task</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {actionMessage && (
                    <div className={`text-sm mb-1 ${actionStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {actionMessage}
                    </div>
                  )}

                  {/* Edit List Form - shown below the edit button */}
                  {showEditList && (
                    <div className="glass rounded-xl pt-3 px-2 pb-6 sm:pt-4 sm:px-4 sm:pb-6 border border-purple-500/20 mb-4">
                      <h3 className="text-xl font-semibold mb-4 text-white">Edit List</h3>
                      <form onSubmit={handleUpdateList} className="stack">
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

                        {/* List Permissions Section */}
                        <div className="border-t border-gray-700 pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-medium text-white flex items-center">
                              <Users className="h-5 w-5 mr-2 text-purple-400" />
                              List Permissions
                            </h4>
                          </div>
                          
                          <div className="stack mb-4">
                            {(listUsers || []).map((listUser) => (
                              <div key={listUser.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="relative">
                                    {listUser.permission_level === 'owner' ? (
                                      <Crown className="h-4 w-4 text-yellow-400" />
                                    ) : listUser.permission_level === 'admin' ? (
                                      <Settings className="h-4 w-4 text-orange-400" />
                                    ) : (
                                      <User className="h-4 w-4 text-blue-400" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-white font-medium text-sm">{listUser.username}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {/* Show dropdown for all users except current user */}
                                  {user?.userId !== listUser.id ? (
                                    <select
                                      value={getEffectivePermission(listUser.id, listUser.permission_level)}
                                      onChange={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const newPermission = e.target.value;
                                        
                                        // Remove any existing changes for this user
                                        const filteredChanges = pendingUserChanges.filter(
                                          change => change.userId !== listUser.id
                                        );
                                        
                                        // Add update change
                                        setPendingUserChanges([...filteredChanges, {
                                          action: 'update',
                                          userId: listUser.id,
                                          permissionLevel: newPermission
                                        }]);
                                        
                                      }}
                                      className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 focus:border-blue-500 focus:outline-none"
                                      disabled={user?.userId === listUser.id}
                                    >
                                      <option value="owner">Owner</option>
                                      <option value="admin">Admin</option>
                                      <option value="user">User</option>
                                    </select>
                                  ) : (
                                    // Show empty space for current user as owner to maintain alignment
                                    <div className="w-20"></div>
                                  )}
                                  
                                  {/* Show delete button for all users except current user */}
                                  {user?.userId !== listUser.id && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removeUserFromList(selectedListForUsers, listUser.id);
                                      }}
                                      className="text-red-400 hover:text-red-300 transition-colors"
                                      title="Remove user"
                                    >
                                      <UserMinus className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="border-t border-gray-700 pt-3">
                            <p className="text-xs text-gray-400 mb-2">Add new user:</p>
                            <div className="stack">
                              <select
                                value={selectedNewUser}
                                onChange={(e) => setSelectedNewUser(e.target.value)}
                                className="input w-full"
                              >
                                <option value="">Select a user...</option>
                                {allUsers
                                  .filter(user => !(listUsers || []).some(listUser => listUser.id === user.id))
                                  .map(user => (
                                    <option key={user.id} value={user.id}>
                                      {user.username}
                                    </option>
                                  ))
                                }
                              </select>
                              <select
                                value={selectedNewUserPermission}
                                onChange={(e) => setSelectedNewUserPermission(e.target.value)}
                                className="input w-full"
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="owner">Owner</option>
                              </select>
                              <div className="text-xs text-gray-400 space-y-1">
                                <p><span className="font-medium text-gray-300">Owner:</span> Can manage settings and tasks</p>
                                <p><span className="font-medium text-gray-300">Admin:</span> Can manage tasks</p>
                                <p><span className="font-medium text-gray-300">User:</span> Can view and complete tasks</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  addUserToListBySelection(selectedListForUsers, selectedNewUser, selectedNewUserPermission);
                                  setSelectedNewUser('');
                                  setSelectedNewUserPermission('user');
                                }}
                                className="btn-primary w-full flex items-center justify-center"
                              >
                                <UserPlus className="h-3 w-3 mr-2" />
                                Add User
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <button type="submit" className="btn-primary flex-1 min-w-[100px]">
                            Update List
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditList(false);
                              setEditingList(null);
                            }}
                            className="btn-secondary flex-1 min-w-[80px]"
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
                            className="btn bg-red-600 text-white hover:bg-red-700 flex items-center justify-center space-x-2 flex-1 min-w-[120px]"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete List</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="border-t border-gray-700 pt-2 mt-1"></div>
                  {tasks.length === 0 ? (
                    <p className="text-gray-400 text-center py-6 text-sm">No tasks yet. Create your first task above!</p>
                  ) : user?.hide_completed_tasks && tasks.every(task => task.is_completed) ? (
                    <p className="text-gray-400 text-center py-6 text-sm">All tasks are completed. Toggle to show completed tasks.</p>
                  ) : (
                    <div className="stack">
                      {tasks
                        .filter(task => !user?.hide_completed_tasks || !task.is_completed)
                        .map((task) => (
                        <React.Fragment key={task.id}>
                        <div
                          draggable={hasListAdminPermission(activeListId)}
                          onDragStart={(e) => handleTaskDragStart(e, task)}
                          onDragOver={(e) => handleTaskDragOver(e, task)}
                          onDragLeave={handleTaskDragLeave}
                          onDrop={(e) => handleTaskDrop(e, task)}
                          data-draggable="true"
                          data-task-id={task.id}
                          className={`py-2 sm:py-3 px-3 sm:px-4 rounded-lg border transition-all cursor-move relative ${
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
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="min-w-0">
                                <div className="flex items-end space-x-3 mb-1">
                                  <h4 className={`font-medium ${
                                    (task.is_completed === true || task.is_completed === 1) ? 'text-gray-400 line-through' : 'text-white'
                                  }`}>
                                    {task.title}
                                  </h4>
                                  {task.duration_minutes !== null && task.duration_minutes !== undefined && Number(task.duration_minutes) > 0 && (
                                    <div className="flex items-end gap-0.5">
                                      <Clock className="h-3 w-3 text-gray-500 self-center flex-shrink-0" />
                                      <p className="text-gray-500 text-sm whitespace-nowrap flex-shrink-0">
                                        {task.duration_minutes}m
                                      </p>
                                    </div>
                                  )}
                                  {(task.allow_multiple_completions === true || task.allow_multiple_completions === 1) && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30" title="Repeating task">
                                      <Repeat className="h-3.5 w-3.5 text-purple-400" />
                                    </span>
                                  )}
                                </div>
                                {task.description && (
                                  <p className="text-gray-400 text-sm mt-1">{task.description}</p>
                                )}
                                {(task.is_completed === true || task.is_completed === 1) && <TaskCompletionInfo task={task} isDailyList={isDailyList} />}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {task.assigned_username && (
                                <span className="text-sm text-gray-400">
                                  <User className="h-3 w-3 inline mr-1" />
                                  {task.assigned_username}
                                </span>
                              )}
                              {hasListAdminPermission(activeListId) && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Open add completion dialog
                                      if (addingCompletionForTask?.id === task.id) {
                                        setAddingCompletionForTask(null);
                                        setNewCompletion({ user_id: '', time: '' });
                                      } else {
                                        setAddingCompletionForTask(task);
                                        // Fetch list users to populate dropdown
                                        fetchListUsers(activeListId);
                                        // Set default time to now
                                        const now = new Date();
                                        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                        setNewCompletion({ user_id: '', time: timeString });
                                      }
                                    }}
                                    className="text-green-400 hover:text-green-300 transition-colors"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTask(task);
                                    }}
                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {(() => {
                                const buttons = [];
                                let canUndo = false;
                                let completions = [];
                                const isAnimating = animatingTasks.has(task.id);
                                
                                if (task.is_completed) {
                                  if (task.completions) {
                                    try {
                                      if (task.completions.includes('},{')) {
                                        const completionStrings = task.completions.split('},{').map((str, index, arr) => {
                                          if (index === 0) return str + '}';
                                          if (index === arr.length - 1) return '{' + str;
                                          return '{' + str + '}';
                                        });
                                        completions = completionStrings.map(str => JSON.parse(str));
                                      } else {
                                        completions = [JSON.parse(task.completions)];
                                      }
                                    } catch (e) {
                                      console.error('Error parsing completions:', e);
                                    }
                                  }
                                  
                                  if (completions.length > 0) {
                                    const lastCompletion = completions[completions.length - 1];
                                    const userCompletions = completions.filter(c => c.completed_by === user.userId);
                                    
                                    if (userCompletions.length > 0) {
                                      canUndo = true;
                                    } else if (lastCompletion.completed_by === null && user.is_admin === 1) {
                                      canUndo = true;
                                    }
                                  }
                                }
                                
                                // Undo button (only for repeating tasks or if can undo) - add first so it appears on the left
                                if (task.allow_multiple_completions === 1 && task.is_completed && canUndo) {
                                  buttons.push(
                                    <button
                                      key="undo"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUndoCompletion(task.id);
                                      }}
                                      className="flex items-center justify-center rounded-full h-6 w-6 bg-orange-500 hover:bg-orange-600 transition-colors"
                                      title="Undo last completion"
                                    >
                                      <RotateCcw className="h-4 w-4 text-white" />
                                    </button>
                                  );
                                }
                                
                                // Icon button
                                buttons.push(
                                  <button
                                    key="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTaskIconClick(task);
                                    }}
                                    className="flex-shrink-0 transition-all"
                                    title={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
                                  >
                                    {!task.is_completed ? (
                                      // Uncompleted: Grey circle
                                      <Circle className="h-6 w-6 text-gray-400 hover:text-gray-300" />
                                    ) : task.allow_multiple_completions === 1 && isAnimating ? (
                                      // Repeating task animating: Green filled circle with white checkmark
                                      <div className="relative flex items-center justify-center">
                                        <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                                          <Check className="h-4 w-4 text-white" />
                                        </div>
                                      </div>
                                    ) : task.allow_multiple_completions === 1 ? (
                                      // Repeating task completed: Green unfilled circle with green checkmark
                                      <div className="relative flex items-center justify-center">
                                        <Circle className="h-6 w-6 text-green-500" />
                                        <Check className="h-3 w-3 text-green-500 absolute" />
                                      </div>
                                    ) : (
                                      // Non-repeating task completed: Green filled circle with white checkmark
                                      <div className="relative flex items-center justify-center">
                                        <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                                          <Check className="h-4 w-4 text-white" />
                                        </div>
                                      </div>
                                    )}
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
                        {/* Edit Task Form - shown below the task being edited */}
                        {showEditTask && editingTask?.id === task.id && (
                          <div className="glass rounded-xl pt-3 px-2 pb-6 sm:pt-4 sm:px-4 sm:pb-6 border border-purple-500/20 mt-2">
                            <h3 className="text-xl font-semibold mb-4 text-white">Edit Task</h3>
                            <form onSubmit={handleUpdateTask} className="stack">
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

                              {/* Completions Section */}
                              {(() => {
                                // Parse completions for this task
                                let completions = [];
                                if (editingTask.completions) {
                                  try {
                                    if (editingTask.completions.includes('},{')) {
                                      const completionStrings = editingTask.completions.split('},{').map((str, index, arr) => {
                                        if (index === 0) return str + '}';
                                        if (index === arr.length - 1) return '{' + str;
                                        return '{' + str + '}';
                                      });
                                      completions = completionStrings.map(str => JSON.parse(str));
                                    } else {
                                      completions = [JSON.parse(editingTask.completions)];
                                    }
                                  } catch (e) {
                                    console.error('Error parsing completions:', e);
                                  }
                                }

                                // Filter out completions with no id (these shouldn't exist but just in case)
                                const validCompletions = completions.filter(c => c.id);

                                if (validCompletions.length === 0) return null;

                                return (
                                  <div className="border-t border-gray-700 pt-4">
                                    <h4 className="text-sm font-medium text-gray-300 mb-2">Completions for this period</h4>
                                    <div className="space-y-2">
                                      {validCompletions.map((completion, index) => {
                                        const completedDate = new Date(completion.completed_at);
                                        const displayName = completion.first_name || completion.username || 'Unknown';
                                        const isMarkedForDeletion = completionsToDelete.includes(completion.id);
                                        
                                        return (
                                          <div
                                            key={`completion-${completion.id || index}`}
                                            className={`flex items-center justify-between p-2 rounded-lg ${
                                              isMarkedForDeletion ? 'bg-red-900/20 border border-red-500/30' : 'bg-gray-800/50'
                                            }`}
                                          >
                                            <div className="flex items-center space-x-2 flex-1">
                                              <div className="text-sm text-gray-300">
                                                <span className="font-medium">{displayName}</span>
                                                <span className="text-gray-400 ml-2">
                                                  {completedDate.toLocaleString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                  })}
                                                </span>
                                              </div>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (isMarkedForDeletion) {
                                                  setCompletionsToDelete(completionsToDelete.filter(id => id !== completion.id));
                                                } else {
                                                  setCompletionsToDelete([...completionsToDelete, completion.id]);
                                                }
                                              }}
                                              className={`p-1.5 rounded transition-colors ${
                                                isMarkedForDeletion
                                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                                  : 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                                              }`}
                                              title={isMarkedForDeletion ? 'Unmark for deletion' : 'Mark for deletion'}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                              
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
                        {/* Add Completion Form - shown below the task */}
                        {addingCompletionForTask?.id === task.id && (
                          <div className="glass rounded-xl pt-3 px-2 pb-6 sm:pt-4 sm:px-4 sm:pb-6 border border-green-500/20 mt-2">
                            <h3 className="text-xl font-semibold mb-4 text-white">Add Completion</h3>
                            <form onSubmit={handleAddCompletion} className="stack">
                              <div>
                                <label className="label text-gray-200">User *</label>
                                <select
                                  value={newCompletion.user_id}
                                  onChange={(e) => setNewCompletion({...newCompletion, user_id: e.target.value})}
                                  className="input w-full"
                                  required
                                >
                                  <option value="">Select user</option>
                                  {listUsers.map(u => (
                                    <option key={u.id} value={u.id}>
                                      {u.first_name || u.username}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              <div>
                                <label className="label text-gray-200">Time *</label>
                                <input
                                  type="time"
                                  value={newCompletion.time}
                                  onChange={(e) => setNewCompletion({...newCompletion, time: e.target.value})}
                                  className="input w-full"
                                  required
                                />
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                <button type="submit" className="btn-primary flex-1 min-w-[100px]">
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingCompletionForTask(null);
                                    setNewCompletion({ user_id: '', time: '' });
                                  }}
                                  className="btn-secondary flex-1 min-w-[80px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </React.Fragment>
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
