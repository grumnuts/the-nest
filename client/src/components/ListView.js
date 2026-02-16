import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, X, Target, History, User } from 'lucide-react';
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
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: ''
  });
  
  const [newGoal, setNewGoal] = useState({
    tasks_per_period: 0
  });

  useEffect(() => {
    fetchListData();
  }, [id]);

  const fetchListData = async () => {
    try {
      const [listResponse, tasksResponse, goalsResponse, progressResponse] = await Promise.all([
        axios.get(`/api/lists/${id}`),
        axios.get(`/api/tasks/list/${id}`),
        axios.get('/api/goals'),
        axios.get(`/api/goals/progress/${id}`)
      ]);
      
      setList(listResponse.data.list);
      setTasks(tasksResponse.data.tasks);
      setGoals(goalsResponse.data.goals);
      setProgress(progressResponse.data);
    } catch (error) {
      console.error('Error fetching list data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/tasks', {
        ...newTask,
        list_id: parseInt(id)
      });
      setNewTask({ title: '', description: '', assigned_to: '' });
      setShowCreateTask(false);
      fetchListData();
    } catch (error) {
      console.error('Error creating task:', error);
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
    } catch (error) {
      console.error('Error setting goal:', error);
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-ghost flex items-center space-x-2 text-gray-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>

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
              <form onSubmit={handleCreateTask} className="space-y-4">
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
                  <label className="label">Assign to (user ID)</label>
                  <input
                    type="number"
                    className="input"
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                    placeholder="Leave empty for unassigned"
                  />
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
              <form onSubmit={handleSetGoal} className="space-y-4">
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
                <div className="space-y-4">
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
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      task.is_completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleToggleTask(task.id, task.is_completed)}
                        className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                          task.is_completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {task.is_completed && <Check className="h-4 w-4" />}
                      </button>
                      <div>
                        <h3 className={`font-medium ${task.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className={`text-sm ${task.is_completed ? 'text-gray-400' : 'text-gray-600'}`}>
                            {task.description}
                          </p>
                        )}
                        {task.assigned_username && (
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <User className="h-3 w-3 mr-1" />
                            {task.assigned_username}
                          </div>
                        )}
                      </div>
                    </div>
                    {task.is_completed && task.completed_at && (
                      <div className="text-xs text-gray-500">
                        {new Date(task.completed_at).toLocaleDateString('en-AU')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListView;
