import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Users, Target, Plus, Trash2, Edit } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Goals from './Goals';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Password reset state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  
  // User management state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user' });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'goals', label: 'Goals', icon: Target },
    ...(user?.username === 'admin' ? [{ id: 'users', label: 'Users', icon: Users }] : [])
  ];

  // Fetch users from API
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  // Load users when component mounts or users tab is activated
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // Password reset function
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters long');
      return;
    }
    
    setPasswordLoading(true);
    setPasswordMessage('');
    
    try {
      const response = await axios.post('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordMessage('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setPasswordMessage(''), 3000);
      
    } catch (error) {
      setPasswordMessage(error.response?.data?.error || 'Error updating password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // User management functions
  const handleAddUser = async () => {
    if (newUser.username && newUser.email && newUser.password) {
      try {
        await axios.post('/api/users', newUser);
        setNewUser({ username: '', email: '', password: '', role: 'user' });
        setShowAddUser(false);
        fetchUsers(); // Refresh users list
      } catch (error) {
        console.error('Error adding user:', error);
        alert('Error adding user: ' + (error.response?.data?.error || 'Unknown error'));
      }
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setNewUser({ username: user.username, email: user.email, password: '', role: 'user' });
  };

  const handleUpdateUser = async () => {
    if (editingUser && newUser.username && newUser.email) {
      try {
        await axios.put(`/api/users/${editingUser.id}`, newUser);
        setEditingUser(null);
        setNewUser({ username: '', email: '', password: '', role: 'user' });
        fetchUsers(); // Refresh users list
      } catch (error) {
        console.error('Error updating user:', error);
        alert('Error updating user: ' + (error.response?.data?.error || 'Unknown error'));
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId !== 1) { // Don't allow deleting admin
      try {
        await axios.delete(`/api/users/${userId}`);
        fetchUsers(); // Refresh users list
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + (error.response?.data?.error || 'Unknown error'));
      }
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setNewUser({ username: '', email: '', password: '', role: 'user' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-300 hover:bg-purple-500/10 hover:text-purple-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-slate-800/50 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="glass rounded-xl p-6 border border-purple-500/20">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white mb-4">Profile Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    defaultValue="admin"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    className="input w-full"
                    placeholder="admin@example.com"
                  />
                </div>
                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-md font-medium text-white mb-4">Change Password</h3>
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        className="input w-full"
                        placeholder="Enter current password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        className="input w-full"
                        placeholder="Enter new password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        className="input w-full"
                        placeholder="Confirm new password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        required
                      />
                    </div>
                    {passwordMessage && (
                      <div className={`p-3 rounded-lg text-sm ${
                        passwordMessage.includes('successfully') 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {passwordMessage}
                      </div>
                    )}
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <Goals />
          )}

          
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">User Management</h2>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add User</span>
                </button>
              </div>

              {/* Users List */}
              <div className="space-y-3">
                {usersLoading ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400">Loading users...</div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400">No users found</div>
                  </div>
                ) : (
                  users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-purple-300" />
                          </div>
                          <div>
                            <h3 className="text-white font-medium">{user.username}</h3>
                            <p className="text-gray-400 text-sm">{user.email}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            user.username === 'admin' 
                              ? 'bg-red-500/20 text-red-300' 
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {user.username === 'admin' ? 'admin' : 'user'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          disabled={user.username === 'admin'}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          disabled={user.username === 'admin'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add/Edit User Form */}
              {(showAddUser || editingUser) && (
                <div className="p-6 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {editingUser ? 'Edit User' : 'Add New User'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        className="input w-full"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        className="input w-full"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        className="input w-full"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Role
                      </label>
                      <select
                        className="input w-full"
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={editingUser ? handleUpdateUser : handleAddUser}
                        className="btn btn-primary"
                      >
                        {editingUser ? 'Update User' : 'Add User'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddUser(false);
                          cancelEdit();
                        }}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          </div>
      </div>
    </div>
  );
};

export default Settings;
