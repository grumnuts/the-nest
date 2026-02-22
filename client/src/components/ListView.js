import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, X, Target, History, User, UserCheck } from 'lucide-react';
import axios from 'axios';

const ListView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [actionMessage, setActionMessage] = useState('');
  const [actionStatus, setActionStatus] = useState('success');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [listUsers, setListUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingTask, setEditingTask] = useState({
    title: '',
    description: '',
    duration_minutes: '',
    assigned_to: ''
  });
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    duration_minutes: ''
  });
  
  const [newGoal, setNewGoal] = useState({
    tasks_per_period: 0
  });

  useEffect(() => {
    fetchListData();
  }, [id]);

  const fetchListData = async () => {
    try {
      const [listResponse, tasksResponse, goalsResponse, progressResponse, usersResponse, authResponse] = await Promise.all([
        axios.get(`/api/lists/${id}`),
        axios.get(`/api/tasks/list/${id}`),
        axios.get('/api/goals'),
        axios.get(`/api/goals/progress/${id}`),
        axios.get(`/api/lists/${id}/users`).catch(() => ({ data: { users: [] } })),
        axios.get('/api/auth/verify').catch(() => ({ data: { user: null } }))
      ]);
      
      setList(listResponse.data.list);
      setTasks(tasksResponse.data.tasks);
      setGoals(goalsResponse.data.goals);
      setProgress(progressResponse.data);
      setListUsers(usersResponse.data.users || usersResponse.data || []);
      setCurrentUser(authResponse.data.user);
    } catch (error) {
      console.error('Error fetching list data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        ...newTask,
        list_id: parseInt(id),
        duration_minutes: newTask.duration_minutes ? parseInt(newTask.duration_minutes) : 0,
        assigned_to: newTask.assigned_to ? parseInt(newTask.assigned_to) : null
      };
      await axios.post('/api/tasks', taskData);
      setNewTask({ title: '', description: '', assigned_to: '', duration_minutes: '' });
      setShowCreateTask(false);
      fetchListData();
      setActionMessage('');
    } catch (error) {
      console.error('Error creating task:', error);
      setActionStatus('error');
      setActionMessage(`Error creating task: ${error.response?.data?.error || 'Unknown error'}`);
      setTimeout(() => setActionMessage(''), 2500);
    }
  };

  const handleToggleTask = async (taskId, isCompleted) => {
    try {
      await axios.patch(`/api/tasks/${taskId}/status`, {
        is_completed: !isCompleted
      });
      fetchListData();
    } catch (error) {
      console.error('Error updating task:', error);
      setActionStatus('error');
      setActionMessage(error.response?.data?.error || 'Error updating task');
      setTimeout(() => setActionMessage(''), 2500);
    }
  };

  const handleAssignTask = async (taskId, userId) => {
    try {
      await axios.patch(`/api/tasks/${taskId}/assign`, {
        assigned_to: userId || null
      });
      fetchListData();
      setEditingTaskId(null);
      setActionStatus('success');
      setActionMessage('Task assigned successfully');
      setTimeout(() => setActionMessage(''), 2500);
    } catch (error) {
      console.error('Error assigning task:', error);
      setActionStatus('error');
      setActionMessage(error.response?.data?.error || 'Error assigning task');
      setTimeout(() => setActionMessage(''), 2500);
    }
  };

  const openTaskEditor = (task) => {
    setEditingTask({
      title: task.title,
      description: task.description,
      duration_minutes: task.duration_minutes || '',
      assigned_to: task.assigned_to || ''
    });
    setEditingTaskId(task.id);
  };

  const handleSaveTask = async (e) => {
    e?.preventDefault();
    if (!editingTaskId) return;

    try {
      const updates = {};
      if (editingTask.title !== null) updates.title = editingTask.title;
      if (editingTask.description !== null) updates.description = editingTask.description;
      if (editingTask.duration_minutes !== null) updates.duration_minutes = editingTask.duration_minutes ? parseInt(editingTask.duration_minutes) : 0;
      if (editingTask.allow_multiple_completions !== null) updates.allow_multiple_completions = editingTask.allow_multiple_completions;

      if (Object.keys(updates).length > 0) {
        await axios.patch(`/api/tasks/${editingTaskId}`, updates);
      }

      // Handle assignment separately
      if (editingTask.assigned_to !== null) {
        await axios.patch(`/api/tasks/${editingTaskId}/assign`, {
          assigned_to: editingTask.assigned_to || null
        });
      }

      fetchListData();
      setEditingTaskId(null);
      setEditingTask({ title: '', description: '', duration_minutes: '', assigned_to: '' });
      setActionStatus('success');
      setActionMessage('Task updated successfully');
      setTimeout(() => setActionMessage(''), 2500);
    } catch (error) {
      console.error('Error saving task:', error);
      setActionStatus('error');
      setActionMessage(error.response?.data?.error || 'Error updating task');
      setTimeout(() => setActionMessage(''), 2500);
    }
  };

  const handleSetGoal = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/goals', {
        list_id: parseInt(id),
        tasks_per_period: newGoal.tasks_per_period
      });
      setNewGoal({ tasks_per_period: 0 });
      setShowGoalForm(false);
      fetchListData();
      setActionMessage('');
    } catch (error) {
      console.error('Error setting goal:', error);
      setActionStatus('error');
      setActionMessage('Error saving goal');
      setTimeout(() => setActionMessage(''), 2500);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`/api/lists/${id}/history`);
      setHistory(response.data.snapshots);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const toggleHistory = () => {
    if (!showHistory) {
      fetchHistory();
    }
    setShowHistory(!showHistory);
  };

  const getResetPeriodColor = (period) => {
    switch (period) {
      case 'daily': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'weekly': return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'monthly': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      case 'quarterly': return 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
      case 'annually': return 'bg-red-500/20 text-red-300 border border-red-500/30';
      case 'static': return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">List not found</h2>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-ghost flex items-center space-x-2 text-gray-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        {actionMessage && (
          <div className={`text-sm mb-2 ${actionStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {actionMessage}
          </div>
        )}

        <div className="glass rounded-xl p-6 border border-purple-500/20 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-white">{list.name}</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getResetPeriodColor(list.reset_period)}`}>
                {list.reset_period}
              </span>
            </div>
            {list.description && (
              <p className="text-gray-300 mb-4">{list.description}</p>
            )}
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowCreateTask(!showCreateTask)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Task</span>
              </button>
              <button
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="btn-secondary flex items-center space-x-2"
              >
                <Target className="h-4 w-4" />
                <span>Set Goal</span>
              </button>
              <button
                onClick={toggleHistory}
                className="btn-outline flex items-center space-x-2"
              >
                <History className="h-4 w-4" />
                <span>History</span>
              </button>
            </div>
          </div>
        </div>

        {progress && (
          <div className="glass rounded-xl p-6 border border-purple-500/20 mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Progress Tracking</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{progress.completedTasks}</div>
                  <div className="text-sm text-gray-600">Completed Tasks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{progress.tasksPerPeriod}</div>
                  <div className="text-sm text-gray-600">Goal per Period</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{Math.round(progress.progressPercentage)}%</div>
                  <div className="text-sm text-gray-600">Progress</div>
                </div>
              </div>
              {progress.tasksPerPeriod > 0 && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(progress.progressPercentage, 100)}%` }}
                    ></div>
                  </div>
                  {progress.goalMet && (
                    <p className="text-green-600 text-sm mt-2">🎉 Goal achieved!</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {showCreateTask && (
          <div className="glass rounded-xl p-6 border border-purple-500/20 mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Create New Task</h2>
              <form onSubmit={handleCreateTask} className="stack">
                <div>
                  <label className="label">Task Title</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Enter task description (optional)"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="label">Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={newTask.duration_minutes}
                    onChange={(e) => setNewTask({ ...newTask, duration_minutes: e.target.value })}
                    placeholder="Leave empty or 0 for no duration"
                  />
                </div>
                <div>
                  <label className="label">Assign to (optional)</label>
                  <select 
                    className="input"
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {listUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name || user.username} ({user.username})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-3">
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
          </div>
        )}

        {showGoalForm && (
          <div className="glass rounded-xl p-6 border border-purple-500/20 mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Set Goal</h2>
              <form onSubmit={handleSetGoal} className="stack">
                <div>
                  <label className="label">Tasks per Period</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="input"
                    value={newGoal.tasks_per_period}
                    onChange={(e) => setNewGoal({ tasks_per_period: parseInt(e.target.value) || 0 })}
                    placeholder="Number of tasks to complete per period"
                  />
                </div>
                <div className="flex space-x-3">
                  <button type="submit" className="btn-primary">
                    Set Goal
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGoalForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showHistory && (
          <div className="glass rounded-xl p-6 border border-purple-500/20 mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">List History</h2>
              {history.length === 0 ? (
                <p className="text-gray-600">No history available yet.</p>
              ) : (
                <div className="stack">
                  {history.map((snapshot) => (
                    <div key={snapshot.id} className="border-l-4 border-gray-200 pl-4">
                      <div className="text-sm text-gray-600">
                        {new Date(snapshot.period_start).toLocaleDateString('en-AU')} - {new Date(snapshot.period_end).toLocaleDateString('en-AU')}
                      </div>
                      <div className="text-sm text-gray-800">
                        {snapshot.snapshot_data.tasks?.length || 0} tasks
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Tasks</h2>
            {tasks.length === 0 ? (
              <p className="text-gray-600">No tasks yet. Create your first task!</p>
            ) : (
              <div className="stack">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      task.is_completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <button
                        onClick={() => handleToggleTask(task.id, task.is_completed)}
                        className={`flex items-center justify-center w-6 h-6 rounded-full border-2 flex-shrink-0 ${
                          task.is_completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {task.is_completed && <Check className="h-4 w-4" />}
                      </button>
                      <div className="flex-1">
                        <h3 className={`font-medium ${task.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className={`text-sm ${task.is_completed ? 'text-gray-400' : 'text-gray-600'}`}>
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {task.duration_minutes > 0 && (
                            <span>{task.duration_minutes} min</span>
                          )}
                          {task.assigned_firstname && (
                            <div className="flex items-center gap-1 text-blue-600 font-medium">
                              <UserCheck className="h-3 w-3" />
                              {task.assigned_firstname}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {task.is_completed && task.completed_at && (
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(task.completed_at).toLocaleDateString('en-AU')}
                        </div>
                      )}
                      {list && (list.created_by === currentUser?.id || currentUser?.is_admin) && (
                        <button
                          onClick={() => openTaskEditor(task)}
                          className="btn-ghost text-sm px-2 py-1"
                          title="Edit task"
                        >
                          ⚙️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {editingTaskId && (
          <div className="glass rounded-xl p-6 border border-purple-500/20 mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Edit Task</h2>
              {listUsers.length === 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  ℹ️ No users with list access found. Add users to this list first.
                </div>
              )}
              <form onSubmit={handleSaveTask} className="stack">
                <div>
                  <label className="label">Title</label>
                  <input
                    type="text"
                    className="input"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    placeholder="Task title"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    value={editingTask.description}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    placeholder="Task description"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="label">Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={editingTask.duration_minutes}
                    onChange={(e) => setEditingTask({ ...editingTask, duration_minutes: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">Assign to:</label>
                  <select 
                    className="input"
                    value={editingTask.assigned_to}
                    onChange={(e) => setEditingTask({ ...editingTask, assigned_to: e.target.value ? parseInt(e.target.value) : '' })}
                  >
                    <option value="">Unassigned</option>
                    {listUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name || user.username} ({user.username})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button type="submit" className="btn-primary">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTaskId(null);
                      setEditingTask({ title: '', description: '', duration_minutes: '', assigned_to: '' });
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListView;
