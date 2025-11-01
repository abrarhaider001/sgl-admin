'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiSearch, FiFilter, FiEye, FiMail, FiLoader } from 'react-icons/fi';
import { adminService } from '@/services/adminService';
import { authService } from '@/services/authService';

interface Admin {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
  firebaseUid: string;
}

const AdminsPage = () => {
  const { t } = useLanguage();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [adminsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [adminForPasswordReset, setAdminForPasswordReset] = useState<Admin | null>(null);

  // Add new admin state
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [filters, setFilters] = useState({});

  // Add form validation state
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Current logged-in user for contextual loading
  const currentUser = authService.getCurrentUser();

  // Load admins from Firebase
  useEffect(() => {
    const loadAdmins = async () => {
      try {
        setLoading(true);
        const response = await adminService.getAdmins();
        if (response.success && response.admins) {
          setAdmins(response.admins);
          setFilteredAdmins(response.admins);
        } else {
          console.error('Failed to load admins:', response.error);
          setNotification({
            type: 'error',
            message: response.error || 'Failed to load admins'
          });
        }

      } catch (error) {
        console.error('Error loading admins:', error);
        setNotification({
          type: 'error',
          message: 'Failed to load admins'
        });
      } finally {
        setLoading(false);
      }
    };

    loadAdmins();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = [...admins]; // Use admins state instead of MOCK_ADMINS

    // Apply search
    if (searchTerm) {
      result = result.filter(admin =>
        admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAdmins(result);
  }, [searchTerm, filters, admins]); // Add admins to dependency array

  // Get current admins for pagination
  const indexOfLastAdmin = currentPage * adminsPerPage;
  const indexOfFirstAdmin = indexOfLastAdmin - adminsPerPage;
  const currentAdmins = filteredAdmins.slice(indexOfFirstAdmin, indexOfLastAdmin);
  const totalPages = Math.ceil(filteredAdmins.length / adminsPerPage);

  // View admin details
  const viewAdminDetails = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowAdminModal(true);
  };

  // Handle password reset
  const handlePasswordReset = (admin: Admin) => {
    setAdminForPasswordReset(admin);
    setShowPasswordResetModal(true);
  };

  // Confirm password reset
  const confirmPasswordReset = async () => {
    if (!adminForPasswordReset) return;

    try {
      const response = await adminService.sendPasswordResetEmail(adminForPasswordReset.email);
      
      if (response.success) {
        setShowPasswordResetModal(false);
        setAdminForPasswordReset(null);
        
        setNotification({
          type: 'success',
          message: `Password reset email sent successfully to ${adminForPasswordReset.email}`
        });
      } else {
        setNotification({
          type: 'error',
          message: response.error || 'Failed to send password reset email'
        });
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setNotification({
        type: 'error',
        message: 'Failed to send password reset email. Please try again.'
      });
    }
  };

  // Handle form changes with validation
  const handleNewAdminFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAdminForm(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Real-time validation
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        setFormErrors(prev => ({
          ...prev,
          email: 'Please enter a valid email address'
        }));
      }
    }

    if (name === 'password') {
      if (value && value.length < 6) {
        setFormErrors(prev => ({
          ...prev,
          password: 'Password must be at least 6 characters long'
        }));
      }
    }

    if (name === 'confirmPassword') {
      if (value && value !== newAdminForm.password) {
        setFormErrors(prev => ({
          ...prev,
          confirmPassword: 'Passwords do not match'
        }));
      }
    }
  };

  // Create new admin with validation
  const createNewAdmin = async () => {
    // Validate all fields
    const errors = {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    };

    // Username validation
    if (!newAdminForm.username.trim()) {
      errors.username = 'Username is required';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newAdminForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(newAdminForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!newAdminForm.password) {
      errors.password = 'Password is required';
    } else if (newAdminForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    // Confirm password validation
    if (!newAdminForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (newAdminForm.password !== newAdminForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Check if there are any errors
    const hasErrors = Object.values(errors).some(error => error !== '');
    if (hasErrors) {
      setFormErrors(errors);
      return;
    }

    try {
      // Create admin using Firebase Authentication and Firestore
      const response = await adminService.createAdmin({
        username: newAdminForm.username,
        email: newAdminForm.email,
        password: newAdminForm.password
      });

      if (response.success) {
        // Reload admins list to get the updated data
        const adminsResponse = await adminService.getAdmins();
        if (adminsResponse.success && adminsResponse.admins) {
          setAdmins(adminsResponse.admins);
          setFilteredAdmins(adminsResponse.admins);
        } else {
          console.error('Failed to reload admins after creation:', adminsResponse.error);
          setNotification({
            type: 'error',
            message: adminsResponse.error || 'Failed to reload admins after creation'
          });
        }

        // Reset form and close modal
        setNewAdminForm({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        setFormErrors({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        setShowAddAdminModal(false);

        // Show success notification
        setNotification({
          type: 'success',
          message: 'Admin created successfully!'
        });
      } else {
        // Show error notification
        setNotification({
          type: 'error',
          message: response.error || 'Failed to create admin'
        });
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      setNotification({
        type: 'error',
        message: 'An error occurred while creating the admin account'
      });
    }
  };

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);





  return (
    <MainLayout title={t('admins.title')}>
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-primary">{t('admins.title')}</h1>
            <div className="flex items-center space-x-4 text-sm text-muted">
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="font-medium text-primary">{filteredAdmins.length}</span>
                <span>{t('admins.results')}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddAdminModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
            >
              <FiPlus size={18} />
              <span>{t('admins.addNew')}</span>
            </button>
          </div>
        </div>

        {/* Admins Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admins.username')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admins.email')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admins.createdDate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admins.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center py-12">
                        <FiLoader className="animate-spin text-blue-600 mr-2" size={24} />
                        <span className="text-gray-600">
                          {currentUser
                            ? `${t('admins.loadingFor')}`
                            : t('admins.loading')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : currentAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <p className="text-gray-500">No admins found</p>
                    </td>
                  </tr>
                ) : (
                  currentAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-800 font-semibold">
                              {admin.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{admin.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{admin.email}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewAdminDetails(admin)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('admins.view')}
                        >
                          <FiEye />
                        </button>

                        <button
                          onClick={() => handlePasswordReset(admin)}
                          className="text-green-600 hover:text-green-900"
                          title={t('admins.resetPassword.title')}
                        >
                          <FiMail />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Admin Details Modal */}
        {showAdminModal && selectedAdmin && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{t('admins.adminDetails')}</h3>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">{t('admins.username')}</label>
                    <p className="text-gray-900 font-medium">{selectedAdmin.username}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">{t('admins.email')}</label>
                    <p className="text-gray-900 font-medium">{selectedAdmin.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">{t('admins.emailStatus')}</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedAdmin.emailVerified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedAdmin.emailVerified ? t('admins.verified') : t('admins.pendingVerification')}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">{t('admins.createdDate')}</label>
                    <p className="text-gray-900 font-medium">{new Date(selectedAdmin.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  {t('albums.close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add New Admin Modal */}
        {showAddAdminModal && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{t('admins.addNew')}</h3>
                <button
                  onClick={() => setShowAddAdminModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); createNewAdmin(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admins.username')} *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={newAdminForm.username}
                    onChange={handleNewAdminFormChange}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 ${
                      formErrors.username 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    required
                    placeholder={t('admins.enterUsername')}
                  />
                  {formErrors.username && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admins.email')} *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newAdminForm.email}
                    onChange={handleNewAdminFormChange}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 ${
                      formErrors.email 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    required
                    placeholder={t('admins.enterEmail')}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={newAdminForm.password}
                    onChange={handleNewAdminFormChange}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 ${
                      formErrors.password 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    required
                    placeholder="Enter password"
                    minLength={6}
                  />
                  {formErrors.password && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={newAdminForm.confirmPassword}
                    onChange={handleNewAdminFormChange}
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 ${
                      formErrors.confirmPassword 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    required
                    placeholder="Confirm password"
                    minLength={6}
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.confirmPassword}</p>
                  )}
                </div>





                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddAdminModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    {t('admins.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                  >
                    {t('admins.addNew')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
            <div className="flex items-center justify-between">
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-4 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${notification.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
            }`}>
            {notification.message}
          </div>
        )}

        {/* Password Reset Confirmation Modal */}
        {showPasswordResetModal && adminForPasswordReset && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('admins.resetPassword.title')}
              </h3>
              <p className="text-gray-600 mb-3">
                {t('admins.resetPassword.message')}
              </p>
              <p className="text-black-900 mb-6">{adminForPasswordReset.email}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordResetModal(false);
                    setAdminForPasswordReset(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  {t('admins.cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmPasswordReset}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                >
                  {t('admins.sendEmail')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminsPage;