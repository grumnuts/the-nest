import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Users, Target, Plus, Trash2, Edit2, ScrollText } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Goals from './Goals';
import ConfirmDialog from './ConfirmDialog';

const Settings = () => {
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  const goalsRef = useRef(null);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileStatus, setProfileStatus] = useState('success');
  
  // User management state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user', firstName: '', lastName: '' });
  const [userToDelete, setUserToDelete] = useState(null);
  const [userSaveMessage, setUserSaveMessage] = useState('');
  const [userSaveStatus, setUserSaveStatus] = useState('success');

  // Audit log state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const AUDIT_PAGE_SIZE = 50;

  // Helper function to get user's full name
  const getUserFullName = (user) => {
    if (!user) return '';
    
    const firstName = user.first_name;
    const lastName = user.last_name;
    
    // If user has first name or last name, use them
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim();
    }
    
    // Fallback to username if no names are set
    return user.username;
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner' || currentUser?.is_admin === 1;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'users', label: 'Users', icon: Users },
    ...(isAdmin ? [{ id: 'audit', label: 'Audit Log', icon: ScrollText }] : [])
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

  const fetchAuditLogs = async (offset = 0) => {
    setAuditLoading(true);
    try {
      const response = await axios.get(`/api/audit?limit=${AUDIT_PAGE_SIZE}&offset=${offset}`);
      setAuditLogs(response.data.logs);
      setAuditTotal(response.data.total);
      setAuditOffset(offset);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs(0);
    }
  }, [activeTab]);

  // Populate form when editing user changes
  useEffect(() => {
    if (editingUser) {
      setNewUser({ 
        username: editingUser.username, 
        email: editingUser.email, 
        password: '', 
        role: editingUser.role || (editingUser.is_admin ? 'admin' : 'user'), 
        firstName: editingUser.first_name || '', 
        lastName: editingUser.last_name || '' 
      });
    }
  }, [editingUser]);

  const handleEditProfile = () => {
    setProfileData({
      firstName: currentUser?.first_name || '',
      lastName: currentUser?.last_name || '',
      username: currentUser?.username || '',
      email: currentUser?.email || ''
    });
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
    setProfileData({
      firstName: '',
      lastName: '',
      username: '',
      email: ''
    });
    setProfileMessage('');
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileMessage('');

    try {
      // Basic email validation if email is provided
      if (profileData.email && profileData.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(profileData.email.trim())) {
          setProfileStatus('error');
          setProfileMessage('Please enter a valid email address');
          setTimeout(() => setProfileMessage(''), 2500);
          setProfileLoading(false);
          return;
        }
      }

      // Validate username length if changed
      if (profileData.username && profileData.username.trim() && profileData.username.trim().length < 3) {
        setProfileStatus('error');
        setProfileMessage('Username must be at least 3 characters long');
        setTimeout(() => setProfileMessage(''), 2500);
        setProfileLoading(false);
        return;
      }

      const response = await axios.post('/api/auth/update-profile', {
        firstName: profileData.firstName?.trim() || '',
        lastName: profileData.lastName?.trim() || '',
        username: profileData.username?.trim() || '',
        email: profileData.email?.trim() || ''
      });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      
      if (response.data.user && updateUser) {
        updateUser(response.data.user);
      }
      
      setProfileStatus('success');
      setProfileMessage('Profile updated successfully');
      setTimeout(() => {
        setProfileMessage('');
        setIsEditingProfile(false);
      }, 1500);
      
    } catch (error) {
      setProfileStatus('error');
      setProfileMessage(error.response?.data?.error || 'Error updating profile');
      setTimeout(() => setProfileMessage(''), 2500);
    } finally {
      setProfileLoading(false);
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
      showUserSaveMessage('You cannot delete your own account', 'error');
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
      showUserSaveMessage(error.response?.data?.error || 'Error deleting user', 'error');
      setUserToDelete(null);
    }
  };

  const cancelDeleteUser = () => {
    setUserToDelete(null);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setNewUser({ username: '', email: '', password: '', role: 'user', firstName: '', lastName: '' });
  };

  const showUserSaveMessage = (message, status = 'error') => {
    if (!message) {
      setUserSaveMessage('');
      return;
    }
    setUserSaveStatus(status);
    setUserSaveMessage(message);
    setTimeout(() => setUserSaveMessage(''), 2500);
  };

  const getEventBadgeStyle = (eventType) => {
    if (eventType === 'user.login' || eventType === 'task.completed') return 'bg-green-500/20 text-green-300';
    if (eventType === 'user.logout') return 'bg-slate-500/20 text-slate-300';
    if (eventType === 'user.login_failed') return 'bg-red-500/20 text-red-300';
    if (eventType.endsWith('.created')) return 'bg-blue-500/20 text-blue-300';
    if (eventType.endsWith('.deleted')) return 'bg-red-500/20 text-red-300';
    if (eventType === 'task.uncompleted') return 'bg-orange-500/20 text-orange-300';
    if (eventType === 'user.password_changed') return 'bg-purple-500/20 text-purple-300';
    return 'bg-yellow-500/20 text-yellow-300';
  };

  const formatAuditDetails = (eventType, detailsStr) => {
    try {
      const d = detailsStr ? JSON.parse(detailsStr) : {};
      switch (eventType) {
        case 'user.login': return 'Logged in';
        case 'user.logout': return 'Logged out';
        case 'user.login_failed': return `Failed login attempt${d.reason ? ` — ${d.reason.toLowerCase()}` : ''}`;
        case 'user.created': return `Created user "${d.username}"${d.role ? ` (${d.role})` : ''}`;
        case 'user.updated': return `Updated user "${d.targetUsername}"${d.role ? ` — role: ${d.role}` : ''}${d.passwordChanged ? ', password reset' : ''}`;
        case 'user.deleted': return `Deleted user "${d.targetUsername}"`;
        case 'user.profile_updated': return `Updated own profile${d.username ? ` — username: ${d.username}` : ''}`;
        case 'user.username_changed': return `Changed username from "${d.oldUsername}" to "${d.newUsername}"`;
        case 'user.password_changed': return 'Changed own password';
        case 'user.email_changed': return `Changed email from "${d.oldEmail}" to "${d.newEmail}"`;
        case 'list.created': return `Created list "${d.name}"`;
        case 'list.updated': return `Updated list "${d.name}"`;
        case 'list.deleted': return `Deleted list "${d.name}"`;
        case 'task.created': return `Created task "${d.title}"`;
        case 'task.updated': return `Updated task "${d.title}"`;
        case 'task.deleted': return `Deleted task "${d.title}"`;
        case 'task.completed': return `Completed task "${d.title}"`;
        case 'task.uncompleted': return `Uncompleted task "${d.title}"`;
        default: return detailsStr || '';
      }
    } catch {
      return detailsStr || '';
    }
  };

  const formatAuditTimestamp = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString([], {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-8">
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
          <div className="flex space-x-1 mb-1 bg-slate-800/50 p-1 rounded-lg">
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
            <div className="stack">
              <div className="glass rounded-xl px-2 sm:px-4 pt-1.5 pb-4 sm:pt-2 sm:pb-6 border border-purple-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <User className="h-5 w-5 mr-2 text-purple-400" />
                    Profile Information
                  </h2>
                  {!isEditingProfile && (
                    <button
                      onClick={handleEditProfile}
                      className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {profileMessage && (
                  <div className={`mb-4 text-sm ${profileStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {profileMessage}
                  </div>
                )}

                <div className="stack">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                      <input
                        type="text"
                        value={isEditingProfile ? profileData.firstName : (currentUser?.first_name || '')}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        disabled={!isEditingProfile}
                        className={`input ${isEditingProfile ? 'bg-slate-700 text-white' : 'bg-gray-700 text-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={isEditingProfile ? profileData.lastName : (currentUser?.last_name || '')}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        disabled={!isEditingProfile}
                        className={`input ${isEditingProfile ? 'bg-slate-700 text-white' : 'bg-gray-700 text-gray-300'}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                      <input
                        type="text"
                        value={isEditingProfile ? profileData.username : (currentUser?.username || '')}
                        onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                        disabled={!isEditingProfile}
                        className={`input ${isEditingProfile ? 'bg-slate-700 text-white' : 'bg-gray-700 text-gray-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={isEditingProfile ? profileData.email : (currentUser?.email || '')}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        disabled={!isEditingProfile}
                        className={`input ${isEditingProfile ? 'bg-slate-700 text-white' : 'bg-gray-700 text-gray-300'}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                    <input
                      type="text"
                      value={currentUser?.is_admin ? 'Administrator' : 'User'}
                      disabled
                      className="input bg-gray-700 text-gray-300"
                    />
                  </div>

                  {isEditingProfile && (
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={profileLoading}
                        className="btn-primary flex-1"
                      >
                        {profileLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancelEditProfile}
                        disabled={profileLoading}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="glass rounded-xl px-2 sm:px-4 pt-1.5 pb-4 sm:pt-2 sm:pb-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Target className="h-5 w-5 mr-2 text-purple-400" />
                  Goals
                </h2>
                {(currentUser?.is_admin === 1 || currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
                  <button
                    onClick={() => goalsRef.current?.openCreate()}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Goal</span>
                  </button>
                )}
              </div>
              <Goals ref={goalsRef} hideHeader={true} />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="stack">
              <div className="glass rounded-xl px-2 sm:px-4 pt-1.5 pb-4 sm:pt-2 sm:pb-6 border border-purple-500/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <Users className="h-5 w-5 mr-2 text-purple-400" />
                    User Management
                  </h2>
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
                  {userSaveMessage && (
                    <div className="text-sm mb-2 text-red-400">
                      {userSaveMessage}
                    </div>
                  )}

                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  </div>
                ) : (
                  <div className="stack">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h3 className="font-medium text-white">{getUserFullName(user)}</h3>
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
                          {/* Show edit button based on user role and current user permissions */}
                          {user.id !== currentUser.userId && (
                            // Owner accounts: only owners can edit owners
                            (user.role === 'owner' ? currentUser?.role === 'owner' :
                            // Admin accounts: owners and admins can edit admins
                            (user.role === 'admin' ? (currentUser?.role === 'owner' || currentUser?.role === 'admin') :
                            // User accounts: owners and admins can edit users
                            (currentUser?.role === 'owner' || currentUser?.role === 'admin'))
                          ) && (
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setShowAddUser(true);
                              }}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          ))}
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
                  <div className="stack">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={newUser.firstName || ''}
                        onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={newUser.lastName || ''}
                        onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                        placeholder="Enter last name"
                      />
                    </div>
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
                        {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
                          <option value="admin">Admin</option>
                        )}
                        {currentUser?.role === 'owner' && (
                          <option value="owner">Owner</option>
                        )}
                      </select>
                      <div className="mt-2 text-xs text-gray-400 space-y-1">
                        <p><span className="font-medium text-gray-300">Owner:</span> Full system access</p>
                        <p><span className="font-medium text-gray-300">Admin:</span> Can manage goals and users except owners</p>
                        <p><span className="font-medium text-gray-300">User:</span> No administrator access</p>
                      </div>
                    </div>
                    {userSaveMessage && (
                      <div className="p-2 rounded-md text-sm text-red-400">
                        {userSaveMessage}
                      </div>
                    )}
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
                                role: newUser.role,
                                firstName: newUser.firstName || undefined,
                                lastName: newUser.lastName || undefined
                              });
                              fetchUsers();
                              setShowAddUser(false);
                              cancelEdit();
                              showUserSaveMessage('');
                            } catch (error) {
                              console.error('Error updating user:', error);
                              showUserSaveMessage(error.response?.data?.error || 'Error updating user', 'error');
                            }
                          } else {
                            // Handle add logic
                            try {
                              const response = await axios.post('/api/users', {
                                username: newUser.username,
                                email: newUser.email,
                                password: newUser.password,
                                role: newUser.role,
                                firstName: newUser.firstName || undefined,
                                lastName: newUser.lastName || undefined
                              });
                              fetchUsers();
                              setShowAddUser(false);
                              cancelEdit();
                              showUserSaveMessage('');
                            } catch (error) {
                              console.error('Error creating user:', error);
                              showUserSaveMessage(error.response?.data?.error || 'Error creating user', 'error');
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

          {activeTab === 'audit' && (
            <div className="glass rounded-xl px-2 sm:px-4 pt-1.5 pb-4 sm:pt-2 sm:pb-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <ScrollText className="h-5 w-5 mr-2 text-purple-400" />
                  Audit Log
                </h2>
                <button
                  onClick={() => fetchAuditLogs(auditOffset)}
                  className="btn-secondary flex items-center space-x-2 text-sm"
                >
                  <span>Refresh</span>
                </button>
              </div>

              {auditLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-slate-700">
                          <th className="pb-2 pr-4 font-medium whitespace-nowrap">Timestamp</th>
                          <th className="pb-2 pr-4 font-medium whitespace-nowrap">Event</th>
                          <th className="pb-2 pr-4 font-medium whitespace-nowrap">User</th>
                          <th className="pb-2 pr-4 font-medium whitespace-nowrap">IP Address</th>
                          <th className="pb-2 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {auditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-500">No audit log entries</td>
                          </tr>
                        ) : (
                          auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/30">
                              <td className="py-2 pr-4 text-gray-400 whitespace-nowrap font-mono text-xs">
                                {formatAuditTimestamp(log.created_at)}
                              </td>
                              <td className="py-2 pr-4 whitespace-nowrap">
                                <span className={`text-xs px-2 py-0.5 rounded font-mono ${getEventBadgeStyle(log.event_type)}`}>
                                  {log.event_type}
                                </span>
                              </td>
                              <td className="py-2 pr-4 text-gray-300 whitespace-nowrap">
                                {log.username || <span className="text-gray-500 italic">unknown</span>}
                              </td>
                              <td className="py-2 pr-4 text-gray-400 whitespace-nowrap font-mono text-xs">
                                {log.ip_address || '—'}
                              </td>
                              <td className="py-2 text-gray-300">
                                {formatAuditDetails(log.event_type, log.details)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {auditTotal > AUDIT_PAGE_SIZE && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                      <span className="text-sm text-gray-400">
                        Showing {auditOffset + 1}–{Math.min(auditOffset + AUDIT_PAGE_SIZE, auditTotal)} of {auditTotal}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => fetchAuditLogs(Math.max(0, auditOffset - AUDIT_PAGE_SIZE))}
                          disabled={auditOffset === 0}
                          className="btn-secondary text-sm disabled:opacity-40"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => fetchAuditLogs(auditOffset + AUDIT_PAGE_SIZE)}
                          disabled={auditOffset + AUDIT_PAGE_SIZE >= auditTotal}
                          className="btn-secondary text-sm disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
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
