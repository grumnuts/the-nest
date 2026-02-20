import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, List as ListIcon, Clock, Target, Calendar } from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newList, setNewList] = useState({
    name: '',
    description: '',
    reset_period: 'weekly'
  });
  const [actionMessage, setActionMessage] = useState('');
  const [actionStatus, setActionStatus] = useState('success');

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const response = await axios.get('/api/lists');
      setLists(response.data.lists);
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/lists', newList);
      setNewList({ name: '', description: '', reset_period: 'weekly' });
      setShowCreateForm(false);
      fetchLists();
      setActionMessage('');
    } catch (error) {
      console.error('Error creating list:', error);
      setActionStatus('error');
      setActionMessage('Error creating list');
      setTimeout(() => setActionMessage(''), 2500);
    }
  };

  const getResetPeriodIcon = (period) => {
    switch (period) {
      case 'daily':
        return <Clock className="h-4 w-4" />;
      case 'weekly':
        return <Calendar className="h-4 w-4" />;
      case 'monthly':
        return <Calendar className="h-4 w-4" />;
      case 'quarterly':
        return <Calendar className="h-4 w-4" />;
      case 'annually':
        return <Calendar className="h-4 w-4" />;
      case 'static':
        return <ListIcon className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getResetPeriodColor = (period) => {
    switch (period) {
      case 'daily':
        return 'bg-blue-100 text-blue-800';
      case 'weekly':
        return 'bg-green-100 text-green-800';
      case 'monthly':
        return 'bg-yellow-100 text-yellow-800';
      case 'quarterly':
        return 'bg-orange-100 text-orange-800';
      case 'annually':
        return 'bg-purple-100 text-purple-800';
      case 'static':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {actionMessage && (
          <div className={`text-sm mb-2 ${actionStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {actionMessage}
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to The Nest</h1>
          <p className="mt-2 text-gray-600">Manage your tasks and track progress</p>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create New List</span>
          </button>
        </div>

        {showCreateForm && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Create New List</h2>
            <form onSubmit={handleCreateList} className="stack">
              <div>
                <label className="label">List Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={newList.name}
                  onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                  placeholder="Enter list name"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  value={newList.description}
                  onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                  placeholder="Enter list description (optional)"
                  rows={3}
                />
              </div>
              <div>
                <label className="label">Reset Period</label>
                <select
                  className="input"
                  value={newList.reset_period}
                  onChange={(e) => setNewList({ ...newList, reset_period: e.target.value })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="static">Static (doesn't reset)</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn-primary">
                  Create List
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {lists.length === 0 ? (
          <div className="text-center py-12">
            <ListIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No lists yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first list.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <Link
                key={list.id}
                to={`/list/${list.id}`}
                className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{list.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResetPeriodColor(list.reset_period)}`}>
                      {getResetPeriodIcon(list.reset_period)}
                      <span className="ml-1">{list.reset_period}</span>
                    </span>
                  </div>
                  {list.description && (
                    <p className="text-gray-600 text-sm mb-4">{list.description}</p>
                  )}
                  <div className="flex items-center text-sm text-gray-500">
                    <Target className="h-4 w-4 mr-1" />
                    <span>View tasks and progress</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
