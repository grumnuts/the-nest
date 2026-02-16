import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Clock, CheckCircle, Plus, Edit2, Trash2, Users, Calendar, BarChart3, X, Star } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from './ConfirmDialog';

const Goals = () => {
  const { user } = useAuth();
  const isAdmin = user?.is_admin === 1;
  
  const [goals, setGoals] = useState([]);
  const [users, setUsers] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoalProgress, setSelectedGoalProgress] = useState(null);
  
  // New state for period tabs
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  
  // State for delete confirmation
  const [goalToDelete, setGoalToDelete] = useState(null);
  
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
  }, [isAdmin]);

  const fetchGoals = async () => {
    try {
      const endpoint = isAdmin ? '/api/goals/all-goals' : '/api/goals/my-goals';
      const response = await axios.get(endpoint);
      const goalsData = response.data.goals;
      setGoals(goalsData);
      
      // Auto-fetch periods for the first non-static goal
      if (goalsData && goalsData.length > 0) {
        const firstNonStaticGoal = goalsData.find(g => g.period_type !== 'static');
        if (firstNonStaticGoal) {
          fetchPeriods(firstNonStaticGoal.period_type);
        }
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      // The API returns users array directly, not wrapped in { users: ... }
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error.response?.data || error.message);
    }
  };

  const fetchLists = async () => {
    try {
      const response = await axios.get('/api/lists');
      // Handle the response structure: { lists: [...] }
      const listsData = response.data.lists || response.data;
      // Ensure we set lists to an array
      setLists(Array.isArray(listsData) ? listsData : []);
    } catch (error) {
      console.error('Error fetching lists:', error);
      setLists([]); // Ensure lists is always an array
    }
  };

  const fetchPeriods = async (periodType) => {
    if (!periodType || periodType === 'static') return;
    
    setPeriodLoading(true);
    try {
      const response = await axios.get(`/api/goals/periods/${periodType}?limit=10`);
      setAvailablePeriods(response.data.periods);
      
      // Set selected period to current period if not already selected
      if (!selectedPeriod) {
        const currentPeriod = response.data.periods.find(p => p.isCurrent);
        if (currentPeriod) {
          setSelectedPeriod(currentPeriod.date);
        }
      }
    } catch (error) {
      console.error('Error fetching periods:', error);
    } finally {
      setPeriodLoading(false);
    }
  };

  const handlePeriodChange = (periodDate) => {
    setSelectedPeriod(periodDate);
    // Refetch goals with new period
    fetchGoals();
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
    const goal = goals.find(g => g.id === goalId);
    setGoalToDelete(goal);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    
    try {
      await axios.delete(`/api/goals/${goalToDelete.id}`);
      fetchGoals();
      setGoalToDelete(null);
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Error deleting goal: ' + (error.response?.data?.error || error.message));
      setGoalToDelete(null);
    }
  };

  const cancelDeleteGoal = () => {
    setGoalToDelete(null);
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
    <>
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
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Goal</span>
          </button>
        )}
      </div>

      {/* Period Tabs */}
      {availablePeriods.length > 0 && (
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30 shadow-xl">
          <div className="flex items-center space-x-4 mb-3">
            <Calendar className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Period</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {availablePeriods.map((period) => (
              <button
                key={period.date}
                onClick={() => handlePeriodChange(period.date)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === period.date
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } ${period.isCurrent ? 'ring-2 ring-purple-400 ring-opacity-50' : ''}`}
              >
                <div className="flex items-center space-x-2">
                  <span>{period.label}</span>
                  {period.isCurrent && (
                    <span className="text-xs bg-purple-500 px-2 py-0.5 rounded-full">Current</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Goals List */}
      {!goals || goals.length === 0 ? (
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl p-8 border border-purple-500/30 shadow-xl text-center">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">
            {isAdmin ? 'No goals created yet. Create your first goal!' : 'No goals assigned to you yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {goals && goals.map((goal) => (
            <div key={goal.id} className="bg-gray-800/90 backdrop-blur-sm rounded-xl p-3 border border-purple-500/30 shadow-xl">
              {/* Goal Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{goal.name}</h3>
                    {goal.progress?.isAchieved && (
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    )}
                  </div>
                  {goal.description && (
                    <p className="text-gray-400 text-xs mb-1 line-clamp-1">{goal.description}</p>
                  )}
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{goal.user_username}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{getPeriodTypeLabel(goal.period_type)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="h-3 w-3" />
                      <span>{getCalculationTypeLabel(goal.calculation_type)}</span>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleEditGoal(goal)}
                    className="p-1 text-gray-400 hover:text-blue-400 transition-colors rounded hover:bg-blue-500/10"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Progress Section */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-lg font-bold text-white">
                      {Math.round(goal.progress?.percentage || 0)}%
                    </span>
                    <span className="text-gray-400 ml-1 text-xs">
                      {goal.calculation_type.includes('percentage') 
                        ? `${Math.round(goal.progress?.percentage || 0)}%`
                        : `${goal.progress?.completed || 0} / ${goal.progress?.required || goal.target_value}${goal.calculation_type.includes('time') ? ' min' : ' tasks'}`
                      }
                    </span>
                  </div>
                  {goal.progress?.isAchieved && (
                    <div className="flex items-center space-x-1 text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      <span className="font-medium text-xs">Achieved!</span>
                    </div>
                  )}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(goal.progress?.percentage || 0)}`}
                    style={{ width: `${Math.min(goal.progress?.percentage || 0, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Lists */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Lists:</p>
                <div className="flex flex-wrap gap-1">
                  {goal.list_ids && goal.list_ids.map((listId) => {
                    const list = lists && lists.find(l => l.id === listId);
                    return list ? (
                      <span key={listId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {list.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-500">
                  Period: {new Date(goal.progress?.periodStart || Date.now()).toLocaleDateString('en-AU')} - {new Date(goal.progress?.periodEnd || Date.now()).toLocaleDateString('en-AU')}
                </div>
                <button
                  onClick={() => fetchGoalProgress(goal.id)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>View History</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Goal Modal */}
      {(showCreateGoal || editingGoal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/95 backdrop-blur-md rounded-xl p-6 border border-purple-500/30 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingGoal ? 'Edit Goal' : 'Create New Goal'}
              </h3>
              <button
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
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">User</label>
                    <select
                      value={newGoal.userId}
                      onChange={(e) => setNewGoal({ ...newGoal, userId: e.target.value })}
                      className="input w-full"
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">Goal Name</label>
                  <input
                    type="text"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    className="input w-full"
                    placeholder="Enter goal name..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="input w-full"
                  rows="3"
                  placeholder="Enter goal description (optional)..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Calculation Type</label>
                  <select
                    value={newGoal.calculationType}
                    onChange={(e) => setNewGoal({ ...newGoal, calculationType: e.target.value })}
                    className="input w-full"
                  >
                    <option value="percentage_task_count">Percentage of Tasks</option>
                    <option value="percentage_time">Percentage of Time</option>
                    <option value="fixed_task_count">Fixed Task Count</option>
                    <option value="fixed_time">Fixed Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target Value {newGoal.calculationType.includes('percentage') ? '(%)' : newGoal.calculationType.includes('time') ? '(minutes)' : '(tasks)'}
                  </label>
                  <input
                    type="number"
                    value={newGoal.targetValue}
                    onChange={(e) => setNewGoal({ ...newGoal, targetValue: parseFloat(e.target.value) })}
                    className="input w-full"
                    min="0"
                    step="0.1"
                    placeholder="Enter target value..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Period</label>
                <select
                  value={newGoal.periodType}
                  onChange={(e) => setNewGoal({ ...newGoal, periodType: e.target.value })}
                  className="input w-full"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Lists</label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  {Array.isArray(lists) && lists.map((list) => (
                    <label key={list.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-700/50 p-3 rounded-lg transition-colors">
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
                        className="rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500 w-4 h-4"
                      />
                      <span className="text-gray-300">{list.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-700">
                <button
                  type="submit"
                  className="btn-primary flex-1 min-w-[100px]"
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
                  className="btn-secondary flex-1 min-w-[80px]"
                >
                  Cancel
                </button>
                {editingGoal && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteGoal(editingGoal.id);
                      setShowCreateGoal(false);
                      setEditingGoal(null);
                    }}
                    className="btn bg-red-600 text-white hover:bg-red-700 flex items-center justify-center space-x-2 flex-1 min-w-[120px]"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Goal</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress History Modal */}
      {selectedGoalProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/95 backdrop-blur-md rounded-xl p-6 border border-purple-500/30 shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Progress History</h3>
              <button
                onClick={() => setSelectedGoalProgress(null)}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {selectedGoalProgress.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No progress data available yet.</p>
                <p className="text-gray-500 text-sm mt-2">Progress will appear here as goals are tracked over time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedGoalProgress.map((progress, index) => (
                  <div key={progress.id} className="bg-gray-700/80 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {new Date(progress.period_start).toLocaleDateString('en-AU', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(progress.period_end).toLocaleDateString('en-AU', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-white">
                          {Math.round(progress.completion_percentage)}%
                        </span>
                        {progress.is_achieved && (
                          <div className="flex items-center space-x-1 text-green-400">
                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">Achieved</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(progress.completion_percentage)}`}
                          style={{ width: `${Math.min(progress.completion_percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        Completed: {progress.completed_value} / {progress.required_value}
                      </span>
                      {!progress.is_achieved && (
                        <span className="text-gray-500">
                          {Math.round(progress.required_value - progress.completed_value)} remaining
                        </span>
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
    
    <ConfirmDialog
      isOpen={!!goalToDelete}
      title="Delete Goal"
      message={`Are you sure you want to delete the goal "${goalToDelete?.name}"? This action cannot be undone.`}
      confirmText="Delete Goal"
      cancelText="Cancel"
      onConfirm={confirmDeleteGoal}
      onCancel={cancelDeleteGoal}
      type="delete"
    />
    </>
  );
};

export default Goals;
