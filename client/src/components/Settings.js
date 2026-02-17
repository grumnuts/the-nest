import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Users, Target, Plus, Trash2, Edit } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Goals from './Goals';
import ConfirmDialog from './ConfirmDialog';

const Settings = () => {
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Password reset state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  
  // Username change state
  const [usernameData, setUsernameData] = useState({
    newUsername: '',
    password: ''
  });
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState('');
  
  // Email change state
  const [emailData, setEmailData] = useState({
    newEmail: '',
    password: ''
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  
  // UI state for collapsible sections
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showUsernameChange, setShowUsernameChange] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  
  // User management state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user' });
  const [userToDelete, setUserToDelete] = useState(null);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'users', label: 'Users', icon: Users }
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

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, currentUser]);

  const handlePasswordReset = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordMessage('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage('');

    try {
      const response = await axios.post('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordMessage('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setTimeout(() => setPasswordMessage(''), 3000);
      
    } catch (error) {
      setPasswordMessage(error.response?.data?.error || 'Error updating password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUsernameChange = async () => {
    if (!usernameData.newUsername || !usernameData.password) {
      setUsernameMessage('New username and current password are required');
      return;
    }

    if (usernameData.newUsername.length < 3) {
      setUsernameMessage('Username must be at least 3 characters long');
      return;
    }

    setUsernameLoading(true);
    setUsernameMessage('');

    try {
      const response = await axios.post('/api/auth/change-username', {
        newUsername: usernameData.newUsername,
        password: usernameData.password
      });
      
      setUsernameMessage('Username updated successfully');
      setUsernameData({ newUsername: '', password: '' });
      
      // Update user context with new username
      if (response.data.user && updateUser) {
        updateUser(response.data.user);
      }
      
      setTimeout(() => setUsernameMessage(''), 3000);
      
    } catch (error) {
      setUsernameMessage(error.response?.data?.error || 'Error updating username');
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleEmailChange = async () => {
    if (!emailData.newEmail || !emailData.password) {
      setEmailMessage('New email and current password are required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.newEmail)) {
      setEmailMessage('Please enter a valid email address');
      return;
    }

    setEmailLoading(true);
    setEmailMessage('');

    try {
      const response = await axios.post('/api/auth/change-email', {
        newEmail: emailData.newEmail,
        password: emailData.password
      });
      
      setEmailMessage('Email updated successfully');
      setEmailData({ newEmail: '', password: '' });
      
      // Update user context with new email
      if (response.data.user && updateUser) {
        updateUser(response.data.user);
      }
      
      setTimeout(() => setEmailMessage(''), 3000);
      
    } catch (error) {
      setEmailMessage(error.response?.data?.error || 'Error updating email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDeleteUser = (userId) => {
    const user = users.find(u => u.id === userId);
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    // Don't allow deleting yourself
    if (userToDelete.id === currentUser.userId) {
      alert('You cannot delete your own account');
      setUserToDelete(null);
      return;
    }
    
    try {
      await axios.delete(`/api/users/${userToDelete.id}`);
      fetchUsers();
      setUserToDelete(null);
      setShowAddUser(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + (error.response?.data?.error || 'Unknown error'));
      setUserToDelete(null);
    }
  };

  const cancelDeleteUser = () => {
    setUserToDelete(null);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setNewUser({ username: '', email: '', password: '', role: 'user' });
  };

  return (
    <>
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
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 border border-purple-500/20">
                <h2 className="text-xl font-semibold text-white mb-4">Profile Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                    <input
                      type="text"
                      value={currentUser?.username || ''}
                      disabled
                      className="input bg-gray-700 text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      disabled
                      className="input bg-gray-700 text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={currentUser?.is_admin ? 'Administrator' : 'User'}
                        disabled
                        className="input bg-gray-700 text-gray-300"
                      />
                      <span className={`text-xs px-2 py-1 rounded ${
                        currentUser?.is_admin 
                          ? 'bg-red-500/20 text-red-300' 
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {currentUser?.is_admin ? 'Admin' : 'User'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-6 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Reset Password</h2>
                  <button
                    onClick={() => setShowPasswordReset(!showPasswordReset)}
                    className="btn-primary w-[140px]"
                  >
                    {showPasswordReset ? 'Cancel' : 'Change Password'}
                  </button>
                </div>
                {showPasswordReset && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="input"
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="input"
                        placeholder="Enter new password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="input"
                        placeholder="Confirm new password"
                      />
                    </div>
                    {passwordMessage && (
                      <div className={`p-3 rounded-md text-sm ${
                        passwordMessage.includes('successfully') 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {passwordMessage}
                      </div>
                    )}
                    <div className="flex space-x-3">
                      <button
                        onClick={handlePasswordReset}
                        disabled={passwordLoading}
                        className="btn-primary"
                      >
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </button>
                      <button
                        onClick={() => {
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          setShowPasswordReset(false);
                        }}
                        className="btn-secondary"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="glass rounded-xl p-6 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Change Username</h2>
                  <button
                    onClick={() => setShowUsernameChange(!showUsernameChange)}
                    className="btn-primary w-[140px]"
                  >
                    {showUsernameChange ? 'Cancel' : 'Change Username'}
                  </button>
                </div>
                {showUsernameChange && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">New Username</label>
                      <input
                        type="text"
                        value={usernameData.newUsername}
                        onChange={(e) => setUsernameData({ ...usernameData, newUsername: e.target.value })}
                        className="input"
                        placeholder="Enter new username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                      <input
                        type="password"
                        value={usernameData.password}
                        onChange={(e) => setUsernameData({ ...usernameData, password: e.target.value })}
                        className="input"
                        placeholder="Enter current password"
                      />
                    </div>
                    {usernameMessage && (
                      <div className={`p-3 rounded-md text-sm ${
                        usernameMessage.includes('successfully') 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {usernameMessage}
                      </div>
                    )}
                    <div className="flex space-x-3">
                      <button
                        onClick={handleUsernameChange}
                        disabled={usernameLoading}
                        className="btn-primary"
                      >
                        {usernameLoading ? 'Updating...' : 'Update Username'}
                      </button>
                      <button
                        onClick={() => {
                          setUsernameData({ newUsername: '', password: '' });
                          setShowUsernameChange(false);
                        }}
                        className="btn-secondary"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="glass rounded-xl p-6 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Change Email</h2>
                  <button
                    onClick={() => setShowEmailChange(!showEmailChange)}
                    className="btn-primary w-[140px]"
                  >
                    {showEmailChange ? 'Cancel' : 'Change Email'}
                  </button>
                </div>
                {showEmailChange && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">New Email</label>
                      <input
                        type="email"
                        value={emailData.newEmail}
                        onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                        className="input"
                        placeholder="Enter new email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                      <input
                        type="password"
                        value={emailData.password}
                        onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                        className="input"
                        placeholder="Enter current password"
                      />
                    </div>
                    {emailMessage && (
                      <div className={`p-3 rounded-md text-sm ${
                        emailMessage.includes('successfully') 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {emailMessage}
                      </div>
                    )}
                    <div className="flex space-x-3">
                      <button
                        onClick={handleEmailChange}
                        disabled={emailLoading}
                        className="btn-primary"
                      >
                        {emailLoading ? 'Updating...' : 'Update Email'}
                      </button>
                      <button
                        onClick={() => {
                          setEmailData({ newEmail: '', password: '' });
                          setShowEmailChange(false);
                        }}
                        className="btn-secondary"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'goals' && <Goals />}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6 border border-purple-500/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">User Management</h2>
                  {(currentUser?.is_admin === 1 || currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
                    <button
                      onClick={() => setShowAddUser(true)}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add User</span>
                    </button>
                  )}
                </div>

                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h3 className="font-medium text-white">{user.username}</h3>
                              <p className="text-sm text-gray-400">{user.email}</p>
                            </div>
                            <div className="mt-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                user.role === 'owner'
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : user.role === 'admin'
                                  ? 'bg-red-500/20 text-red-300' 
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}>
                                {user.role || (user.is_admin ? 'admin' : 'user')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Only show edit button for admins/owners, but hide for owners when current user is not owner */}
                          {(currentUser?.is_admin === 1 || currentUser?.role === 'admin' || currentUser?.role === 'owner') && user.id !== currentUser.userId && !(user.role === 'owner' && currentUser?.role !== 'owner') && (
                            <button
                              onClick={() => {
                                console.log('Edit button clicked for user:', user);
                                setEditingUser(user);
                                setNewUser({ username: user.username, email: user.email, password: '', role: user.role || (user.is_admin ? 'admin' : 'user') });
                                setShowAddUser(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
                      <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                      <input
                        type="email"
                        className="input w-full"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                      <input
                        type="password"
                        className="input w-full"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                      <select
                        className="input w-full"
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={async () => {
                          if (editingUser) {
                            // Handle update logic
                            try {
                              const response = await axios.put(`/api/users/${editingUser.id}`, {
                                username: newUser.username,
                                email: newUser.email,
                                password: newUser.password || undefined,
                                role: newUser.role
                              });
                              fetchUsers();
                              setShowAddUser(false);
                              cancelEdit();
                              alert('User updated successfully');
                            } catch (error) {
                              console.error('Error updating user:', error);
                              alert('Error updating user: ' + (error.response?.data?.error || 'Unknown error'));
                            }
                          } else {
                            // Handle add logic
                            try {
                              const response = await axios.post('/api/users', {
                                username: newUser.username,
                                email: newUser.email,
                                password: newUser.password,
                                role: newUser.role
                              });
                              fetchUsers();
                              setShowAddUser(false);
                              cancelEdit();
                              alert('User created successfully');
                            } catch (error) {
                              console.error('Error creating user:', error);
                              alert('Error creating user: ' + (error.response?.data?.error || 'Unknown error'));
                            }
                          }
                        }}
                        className="btn-primary flex-1 min-w-[100px]"
                      >
                        {editingUser ? 'Update User' : 'Add User'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddUser(false);
                          cancelEdit();
                        }}
                        className="btn-secondary flex-1 min-w-[80px]"
                      >
                        Cancel
                      </button>
                      {editingUser && (
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteUser(editingUser.id);
                            setShowAddUser(false);
                            setEditingUser(null);
                          }}
                          className="btn bg-red-600 text-white hover:bg-red-700 flex items-center justify-center space-x-2 flex-1 min-w-[120px]"
                          disabled={editingUser.id === currentUser.userId}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete User</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={!!userToDelete}
        title="Delete User"
        message={`Are you sure you want to delete the user "${userToDelete?.username}"? This action cannot be undone.`}
        confirmText="Delete User"
        cancelText="Cancel"
        onConfirm={confirmDeleteUser}
        onCancel={cancelDeleteUser}
        type="delete"
      />
    </>
  );
};

export default Settings;
