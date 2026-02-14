import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Clock, CheckCircle, Plus, Edit2, Trash2, Users, Calendar, BarChart3, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Goals = () => {
  const { user } = useAuth();
  const isAdmin = user?.username === 'admin';
  
  const [goals, setGoals] = useState([]);
  const [users, setUsers] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoalProgress, setSelectedGoalProgress] = useState(null);
  
  const [newGoal, setNewGoal] = useState({
    userId: '',
    name: '',
    description: '',
    calculationType: 'percentage_task_count',
    targetValue: 50,
    periodType: 'weekly',
    listIds: []
  });

  useEffect(() => {
    fetchGoals();
    if (isAdmin) {
      fetchUsers();
    }
    fetchLists();
  }, []);

  const fetchGoals = async () => {
    try {
      const endpoint = isAdmin ? '/api/goals/all-goals' : '/api/goals/my-goals';
      const response = await axios.get(endpoint);
      setGoals(response.data.goals);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLists = async () => {
    try {
      const response = await axios.get('/api/lists');
      setLists(response.data.lists);
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post('/api/goals/', newGoal);
      setShowCreateGoal(false);
      setNewGoal({
        userId: '',
        name: '',
        description: '',
        calculationType: 'percentage_task_count',
        targetValue: 50,
        periodType: 'weekly',
        listIds: []
      });
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Error creating goal: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    
    try {
      await axios.patch(`/api/goals/${editingGoal.id}`, newGoal);
      setEditingGoal(null);
      setNewGoal({
        userId: '',
        name: '',
        description: '',
        calculationType: 'percentage_task_count',
        targetValue: 50,
        periodType: 'weekly',
        listIds: []
      });
      fetchGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Error updating goal: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/goals/${goalId}`);
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Error deleting goal: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setNewGoal({
      userId: goal.user_id,
      name: goal.name,
      description: goal.description || '',
      calculationType: goal.calculation_type,
      targetValue: goal.target_value,
      periodType: goal.period_type,
      listIds: goal.list_ids || []
    });
  };

  const fetchGoalProgress = async (goalId) => {
    try {
      const response = await axios.get(`/api/goals/${goalId}/progress`);
      setSelectedGoalProgress(response.data.progress);
    } catch (error) {
      console.error('Error fetching goal progress:', error);
    }
  };

  const getCalculationTypeLabel = (type) => {
    const types = {
      'percentage_task_count': 'Percentage of Tasks',
      'percentage_time': 'Percentage of Time',
      'fixed_task_count': 'Fixed Task Count',
      'fixed_time': 'Fixed Time'
    };
    return types[type] || type;
  };

  const getPeriodTypeLabel = (type) => {
    const types = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'annually': 'Annually'
    };
    return types[type] || type;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Target className="h-8 w-8 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Goals</h2>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateGoal(true)}
            className="btn bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Goal</span>
          </button>
        )}
      </div>

      {/* Goals Grid */}
      {!goals || goals.length === 0 ? (
        <div className="glass rounded-xl p-8 border border-purple-500/20 text-center">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">
            {isAdmin ? 'No goals created yet. Create your first goal!' : 'No goals assigned to you yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals && goals.map((goal) => (
            <div key={goal.id} className="glass rounded-xl p-6 border border-purple-500/20">
              {/* Goal Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{goal.name}</h3>
                  {goal.description && (
                    <p className="text-sm text-gray-400 mb-2">{goal.description}</p>
                  )}
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Users className="h-3 w-3" />
                    <span>{goal.user_username}</span>
                    <Calendar className="h-3 w-3 ml-2" />
                    <span>{getPeriodTypeLabel(goal.period_type)}</span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditGoal(goal)}
                      className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">
                    {getCalculationTypeLabel(goal.calculation_type)}
                  </span>
                  <span className={`font-medium ${
                    goal.progress?.isAchieved ? 'text-green-400' : 'text-gray-300'
                  }`}>
                    {Math.round(goal.progress?.percentage || 0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(goal.progress?.percentage || 0)}`}
                    style={{ width: `${Math.min(goal.progress?.percentage || 0, 100)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-500">
                    {goal.progress?.completed || 0} / {goal.progress?.required || goal.target_value}
                  </span>
                  {goal.progress?.isAchieved && (
                    <CheckCircle className="h-3 w-3 text-green-400" />
                  )}
                </div>
              </div>

              {/* Lists */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Lists:</p>
                <div className="flex flex-wrap gap-1">
                  {goal.list_ids && goal.list_ids.map((listId) => {
                    const list = lists && lists.find(l => l.id === listId);
                    return list ? (
                      <span key={listId} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                        {list.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              {/* View Progress Button */}
              <button
                onClick={() => fetchGoalProgress(goal.id)}
                className="w-full btn bg-gray-700 text-gray-300 hover:bg-gray-600 flex items-center justify-center space-x-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span>View Progress History</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Goal Modal */}
      {(showCreateGoal || editingGoal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-purple-500/20 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editingGoal ? 'Edit Goal' : 'Create New Goal'}
            </h3>
            
            <form onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal} className="space-y-4">
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">User</label>
                  <select
                    value={newGoal.userId}
                    onChange={(e) => setNewGoal({ ...newGoal, userId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select User</option>
                    {users && users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Goal Name</label>
                <input
                  type="text"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Calculation Type</label>
                <select
                  value={newGoal.calculationType}
                  onChange={(e) => setNewGoal({ ...newGoal, calculationType: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="percentage_task_count">Percentage of Tasks</option>
                  <option value="percentage_time">Percentage of Time</option>
                  <option value="fixed_task_count">Fixed Task Count</option>
                  <option value="fixed_time">Fixed Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Value {newGoal.calculationType.includes('percentage') ? '(%)' : newGoal.calculationType.includes('time') ? '(minutes)' : '(tasks)'}
                </label>
                <input
                  type="number"
                  value={newGoal.targetValue}
                  onChange={(e) => setNewGoal({ ...newGoal, targetValue: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="0"
                  step="0.1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Period</label>
                <select
                  value={newGoal.periodType}
                  onChange={(e) => setNewGoal({ ...newGoal, periodType: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Lists</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {lists && lists.map((list) => (
                    <label key={list.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newGoal.listIds.includes(list.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewGoal({ ...newGoal, listIds: [...newGoal.listIds, list.id] });
                          } else {
                            setNewGoal({ ...newGoal, listIds: newGoal.listIds.filter(id => id !== list.id) });
                          }
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-gray-300">{list.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 btn bg-purple-600 text-white hover:bg-purple-700"
                >
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGoal(false);
                    setEditingGoal(null);
                    setNewGoal({
                      userId: '',
                      name: '',
                      description: '',
                      calculationType: 'percentage_task_count',
                      targetValue: 50,
                      periodType: 'weekly',
                      listIds: []
                    });
                  }}
                  className="flex-1 btn bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress History Modal */}
      {selectedGoalProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 border border-purple-500/20 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Progress History</h3>
              <button
                onClick={() => setSelectedGoalProgress(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {selectedGoalProgress.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No progress data available yet.</p>
            ) : (
              <div className="space-y-3">
                {selectedGoalProgress.map((progress, index) => (
                  <div key={progress.id} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        {new Date(progress.period_start).toLocaleDateString()} - {new Date(progress.period_end).toLocaleDateString()}
                      </span>
                      <span className={`text-sm font-medium ${
                        progress.is_achieved ? 'text-green-400' : 'text-gray-300'
                      }`}>
                        {Math.round(progress.completion_percentage)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getProgressColor(progress.completion_percentage)}`}
                        style={{ width: `${Math.min(progress.completion_percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-gray-500">
                        {progress.completed_value} / {progress.required_value}
                      </span>
                      {progress.is_achieved && (
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
