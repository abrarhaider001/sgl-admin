'use client';
import { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiEye, FiSearch, FiChevronLeft, FiChevronRight, FiPlus, FiLoader } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';
import { User } from '@/types/user';
import { userService, UserWithCards } from '@/services/userService';
const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Spain', 'Italy', 'Japan', 'Brazil', 'Mexico', 'Argentina'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserWithCards[]>
    ([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>
    (null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithCards | null>
    (null);
  const [editingUser, setEditingUser] = useState<UserWithCards | null>
    (null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithCards | null>
    (null);
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

  useEffect(() => {
    let first = true;
    setLoading(true);
    setError(null);
    const unsubscribe = userService.subscribeToUsers(undefined, (list) => {
      setUsers(list);
      if (first) {
        setLoading(false);
        first = false;
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const [editFormData, setEditFormData] = useState({ firstName: '', lastName: '', email: '', dateOfBirth: '', country: '', state: '', city: '', gender: '', points: 0, isInfluencer: false, });
  const [newUserForm, setNewUserForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', dateOfBirth: '', country: '', state: '', city: '', gender: '', points: 0, isInfluencer: false, });
  const usersPerPage = 10;

  const filteredUsers = (users || []).filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase()) || user.country.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);
  const paginate = (pageNumber: number) =>
    setCurrentPage(pageNumber);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const viewUser = (user: UserWithCards) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const editUser = (user: UserWithCards) => {
    setEditingUser(user);
    setEditFormData({ firstName: user.firstName, lastName: user.lastName, email: user.email, dateOfBirth: user.dateOfBirth, country: user.country, state: user.state, city: user.city, gender: user.gender, points: user.points, isInfluencer: !!user.isInfluencer, });
    setShowEditModal(true);
    setShowUserModal(false);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name } = e.target as HTMLInputElement | HTMLSelectElement;
    const isCheckbox = (e.target as HTMLInputElement).type === 'checkbox';
    const rawValue = isCheckbox ? (e.target as HTMLInputElement).checked : (e.target as HTMLInputElement | HTMLSelectElement).value;
    const value = name === 'points' && !isCheckbox ? parseInt(String(rawValue)) || 0 : rawValue;
    setEditFormData(prev =>
      ({ ...prev, [name]: value as any, }));
  };

  const showSnackbar = (message: string, type: 'success' | 'error' = 'success') => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => {
      setSnackbar({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const saveUserChanges = async () => {
    if (editingUser) {
      try {
        setLoading(true);
        // Existence guard: ensure the user still exists before updating
        const existing = await userService.getUserById(editingUser.id);
        if (!existing) {
          showSnackbar('This user no longer exists. Closing editor.', 'error');
          setShowEditModal(false);
          setEditingUser(null);
          setUsers(prev => prev.filter(u => u.id !== editingUser.id));
          return;
        }

        const result = await userService.updateUser(editingUser.id, editFormData);
        if (result.success) {
          console.log('User updated successfully');
          setShowEditModal(false);
          setEditingUser(null);
          showSnackbar('User updated successfully!', 'success');
        } else {
          console.error('Failed to update user:', result.error);
          if (result.error === 'User not found') {
            showSnackbar('This user no longer exists. Closing editor.', 'error');
            setShowEditModal(false);
            setEditingUser(null);
            setUsers(prev => prev.filter(u => u.id !== editingUser.id));
          } else {
            showSnackbar('Failed to update user', 'error');
          }
        }
      } catch (error) {
        console.error('Error updating user:', error);
        showSnackbar('An error occurred while updating the user', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const deleteUser = (userId: string) => {
    // In a real implementation, this would call userService.deleteUser()
    console.log('Deleting user:', userId);
    // Refresh users list
    // fetchUsers();
  };

  const showDeleteConfirmation = (user: UserWithCards) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
    setShowUserModal(false);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setLoading(true);
      const result = await userService.deleteUser(userToDelete.id);
      if (result.success) {
        // Remove from local state after successful Firebase deletion
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        setShowDeleteModal(false);
        setUserToDelete(null);
        showSnackbar(t('users.deleteSuccess'), 'success');
      } else {
        // Show error snackbar if deletion failed
        showSnackbar(result.error || t('users.deleteFailed'), 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showSnackbar(t('users.deleteError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNewUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name } = e.target as HTMLInputElement | HTMLSelectElement;
    const isCheckbox = (e.target as HTMLInputElement).type === 'checkbox';
    const rawValue = isCheckbox ? (e.target as HTMLInputElement).checked : (e.target as HTMLInputElement | HTMLSelectElement).value;
    const value = name === 'points' && !isCheckbox ? parseInt(String(rawValue)) || 0 : rawValue;
    setNewUserForm(prev =>
      ({ ...prev, [name]: value as any, }));
  };

  const addNewUser = async () => {
    if (newUserForm.firstName && newUserForm.lastName && newUserForm.email && newUserForm.password && newUserForm.confirmPassword && newUserForm.dateOfBirth && newUserForm.country && newUserForm.state && newUserForm.city && newUserForm.gender) {
      if (newUserForm.password.length < 6) {
        showSnackbar('Password must be at least 6 characters', 'error');
        return;
      }
      if (newUserForm.password !== newUserForm.confirmPassword) {
        showSnackbar('Passwords do not match', 'error');
        return;
      }
      try {
        setLoading(true);

        const userData = { firstName: newUserForm.firstName, lastName: newUserForm.lastName, email: newUserForm.email, password: newUserForm.password, dateOfBirth: newUserForm.dateOfBirth, country: newUserForm.country, state: newUserForm.state, city: newUserForm.city, gender: newUserForm.gender, points: newUserForm.points, isInfluencer: !!newUserForm.isInfluencer, };
        const resp = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });
        const result = await resp.json();
        if (resp.ok && result.success) {
          console.log('User created successfully with ID:', result.userId);
          // Reset form
          setNewUserForm({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', dateOfBirth: '', country: '', state: '', city: '', gender: '', points: 0, isInfluencer: false, });
          setShowAddUserModal(false);

          const response = await userService.getUsers();
          setUsers(response);
          showSnackbar('User created successfully!', 'success');
        } else {
          const errMsg = String(result?.error || 'Failed to create user');
          console.error('Failed to create user:', errMsg);
          showSnackbar(errMsg, 'error');
        }
      } catch (error) {
        console.error('Error creating user:', error);
        showSnackbar('An error occurred while creating the user', 'error');
      } finally {
        setLoading(false);
      }
    } else {
      showSnackbar('Please fill all required fields', 'error');
    }
  };
  return (<MainLayout title={t('users.title')}>
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('users.title')}</h1>
        <p className="text-gray-600">
          {t('users.description')}</p>
      </div>
      {/* Search and Actions Bar */}        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder={t('users.searchPlaceholder')} value={searchTerm} onChange={handleSearch} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            setNewUserForm(prev =>
              ({ ...prev, isInfluencer: false }));
            setShowAddUserModal(true);
          }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"            >
            <FiPlus size={18} />
            <span>
              {t('users.add')}</span>
          </button>
          <button onClick={() => {
            setNewUserForm(prev =>
              ({ ...prev, isInfluencer: true }));
            setShowAddUserModal(true);
          }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"            >
            <FiPlus size={18} />
            <span>
              {t('users.addInfluencer')}</span>
          </button>
        </div>
      </div>
      {/* Users Table */}        <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (<div className="flex items-center justify-center py-12">
          <FiLoader className="animate-spin text-blue-600 mr-2" size={24} />
          <span className="text-gray-600">
            Fetching Users data...</span>
        </div>
        ) : error ? (<div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-red-600 mb-2">
              Error loading users</div>
            <div className="text-gray-600 text-sm">
              {error}</div>
          </div>
        </div>
        ) : (<div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.firstName')}                    </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.lastName')}                    </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.email')}                    </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.dateOfBirth')}                    </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.country')}                    </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.state')}                    </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.city')}                    </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.points')}                    </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.gender')}                    </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.isInfluencer')}                    </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.actions')}                    </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">{currentUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.firstName}                      </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.lastName}                      </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}                      </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(user.dateOfBirth || '').split(/[T ]/)[0]}                      </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.country}                      </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {user.state}                        </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {user.city}                        </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {user.points.toLocaleString()} pts                        </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.gender}                      </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {user.isInfluencer ? t('app.yes') : t('app.no')}                        </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button onClick={() =>
                      viewUser(user)} className="text-blue-600 hover:text-blue-900" title={t('users.view')}                          >
                      <FiEye />
                    </button>
                    <button onClick={() =>
                      editUser(user)} className="text-green-600 hover:text-green-900" title={t('users.edit')}                          >
                      <FiEdit2 />
                    </button>
                    <button onClick={() =>
                      showDeleteConfirmation(user)} className="text-red-600 hover:text-red-900" title={t('users.delete')}                          >
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        )}          {/* Pagination */}          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button onClick={() =>
              paginate(currentPage >
                1 ? currentPage - 1 : 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"              >
              {t('users.previous')}              </button>
            <button onClick={() =>
              paginate(currentPage < totalPages ? currentPage + 1 : totalPages)} disabled={currentPage === totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"              >
              {t('users.next')}              </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {t('users.showing')}
                {' '}
                <span className="font-medium">{startIndex + 1}</span>
                {' '}
                {t('users.to')}
                {' '}
                <span className="font-medium">{Math.min(endIndex, filteredUsers.length)}</span>
                {' '}
                {t('users.of')}
                {' '}
                <span className="font-medium">{filteredUsers.length}</span>
                {' '}
                {t('users.results')}
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  <span className="sr-only">{t('users.previous')}</span>
                  <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                  <button key={number} onClick={() => paginate(number)} className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg ${currentPage === number ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}>
                    {number}
                  </button>
                ))}
                <button onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  <span className="sr-only">{t('users.next')}</span>
                  <FiChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* User Details Modal */}      {showUserModal && selectedUser && (<div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {t('users.userDetails')}</h2>
            <button onClick={() =>
              setShowUserModal(false)} className="text-gray-500 hover:text-gray-700"                >
              &times;
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {t('users.profileInformation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    {t('users.firstName')}</p>
                  <p className="font-medium">
                    {selectedUser.firstName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {t('users.lastName')}</p>
                  <p className="font-medium">
                    {selectedUser.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {t('users.email')}</p>
                  <p className="font-medium">
                    {selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {t('users.dateOfBirth')}</p>
                  <p className="font-medium">
                    {(selectedUser.dateOfBirth || '').split(/[T ]/)[0]}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {t('users.country')}</p>
                  <p className="font-medium">
                    {selectedUser.country}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {t('users.state')}</p>
                  <p className="font-medium">
                    {selectedUser.state}                      </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {t('users.city')}</p>
                  <p className="font-medium">
                    {selectedUser.city}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {t('users.points')}</p>
                  <p className="font-medium">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {selectedUser.points.toLocaleString()} pts                        </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {t('users.gender')}</p>
                  <p className="font-medium">
                    {selectedUser.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {t('users.isInfluencer')}</p>
                  <p className="font-medium">
                    {selectedUser.isInfluencer ? t('app.yes') : t('app.no')}</p>
                </div>
              </div>
            </div>
            {/* Cards Owned Section */}                <div>
              <h3 className="text-lg font-semibold mb-2">
                {t('users.cardsOwned')}</h3>
              {selectedUser.cardsOwned && selectedUser.cardsOwned.length >
                0 ? (<div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Card ID                            </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity                            </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">{selectedUser.cardsOwned.map((card, index) => (
                      <tr key={`${card.cardId}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {card.cardId}                              </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {card.quantity}                                </span>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                  <div className="mt-4 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded">
                    Total Cards: {selectedUser.cardsOwned.reduce((sum, card) =>
                      sum + card.quantity, 0)}                      </div>
                </div>
              ) : (<div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                No cards owned yet                    </div>
              )}                </div>
            {/* <div>
              <h3 className="text-lg font-semibold mb-2">
                {t('users.actions')}</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() =>
                  editUser(selectedUser)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"                    >
                  <FiEdit2 />
                  {t('users.edit')}                    </button>
                <button onClick={() => {
                  deleteUser(selectedUser.id);
                  setShowUserModal(false);
                }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"                    >
                  <FiTrash2 />
                  {t('users.delete')}                    </button>
              </div>
            </div> */}
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={() =>
              setShowUserModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"                >
              {t('app.close')}                </button>
          </div>
        </div>
      </div>
    </div>
    )}     {/* Edit User Modal */}
    {showEditModal && editingUser && (
      <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {t('users.edit')} {editingUser.firstName} {editingUser.lastName}
            </h2>
            <button
              onClick={() => setShowEditModal(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveUserChanges();
            }}
            className="space-y-4"
          >
            {/* 2-Column Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.firstName')} *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={editFormData.firstName}
                  onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.lastName')} *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={editFormData.lastName}
                  onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.email')} *
                </label>
                <input
                  type="email"
                  name="email"
                  value={editFormData.email}
                  onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.dateOfBirth')} *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={editFormData.dateOfBirth}
                  onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.country')} *
                </label>
                <input
                  type="text"
                  name="country"
                  value={editFormData.country}
                  onChange={handleEditInputChange}
                  placeholder="Enter country name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.state')} *
                </label>
                <input
                  type="text"
                  name="state"
                  value={editFormData.state}
                  onChange={handleEditInputChange}
                  placeholder="Enter state name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.city')} *
                </label>
                <input
                  type="text"
                  name="city"
                  value={editFormData.city}
                  onChange={handleEditInputChange}
                  placeholder="Enter city name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.points')}
                </label>
                <input
                  type="number"
                  name="points"
                  value={editFormData.points}
                  onChange={handleEditInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('users.gender')} *
                </label>
                <select
                  name="gender"
                  value={editFormData.gender}
                  onChange={handleEditInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t('users.selectGender')}</option>
                  {GENDERS.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checkbox outside the grid */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isInfluencer-edit"
                name="isInfluencer"
                checked={editFormData.isInfluencer}
                onChange={handleEditInputChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="isInfluencer-edit" className="text-sm text-gray-700">
                {t('users.isInfluencer')}
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t('app.cancel')}
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {t('app.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}      {/* Add New User Modal */}      {showAddUserModal && (<div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify_between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {newUserForm.isInfluencer ? t('users.addNewInfluencer') : t('users.addNewUser')}</h2>
          <button onClick={() =>
            setShowAddUserModal(false)} className="text-gray-500 hover:text-gray-700"              >
          </button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          addNewUser();
        }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('users.firstName')} *                </label>
              <input type="text" name="firstName" value={newUserForm.firstName} onChange={handleNewUserFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required placeholder={t('users.enterFirstName')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('users.lastName')} *                </label>
              <input type="text" name="lastName" value={newUserForm.lastName} onChange={handleNewUserFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required placeholder={t('users.enterLastName')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('users.email')} *                </label>
              <input type="email" name="email" value={newUserForm.email} onChange={handleNewUserFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required placeholder={t('users.enterEmail')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={newUserForm.password}
                onChange={handleNewUserFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Enter password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={newUserForm.confirmPassword}
                onChange={handleNewUserFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Re-enter password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('users.dateOfBirth')} *                </label>
              <input type="date" name="dateOfBirth" value={newUserForm.dateOfBirth} onChange={handleNewUserFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('users.country')} *                </label>
              <input type="text" name="country" value={newUserForm.country} onChange={handleNewUserFormChange} placeholder="Enter country name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font_medium text-gray-700 mb-1">
                {t('users.state')} *                </label>
              <input type="text" name="state" value={newUserForm.state} onChange={handleNewUserFormChange} placeholder="Enter state name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('users.city')} *                </label>
              <input type="text" name="city" value={newUserForm.city} onChange={handleNewUserFormChange} placeholder="Enter city name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline_none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('users.points')}                </label>
              <input type="number" name="points" value={newUserForm.points} onChange={handleNewUserFormChange} min="0" placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('users.gender')} *                </label>
              <select name="gender" value={newUserForm.gender} onChange={handleNewUserFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">{t('users.selectGender')}</option>{GENDERS.map(gender => <option key={gender} value={gender}>{gender}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isInfluencer-new" name="isInfluencer" checked={newUserForm.isInfluencer} onChange={handleNewUserFormChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label htmlFor="isInfluencer-new" className="text-sm text-gray-700">
              {t('users.isInfluencer')}                </label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() =>
              setShowAddUserModal(false)} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"                >
              {t('app.cancel')}                </button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"                >
              {t('users.addUser')}                </button>
          </div>
        </form>
      </div>
    </div>
    )}      {/* Delete Confirmation Modal */}      {showDeleteModal && userToDelete && (<div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {t('users.deleteConfirmTitle')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('users.confirmDelete')} {" "}
          <span className="font-medium text-gray-900">"{userToDelete.firstName} {userToDelete.lastName}"</span>.
          {" "}{t('app.actionCannotBeUndone')}
        </p>
        <div className="flex justify-end space-x-3">
          <button onClick={() => {
            setShowDeleteModal(false);
            setUserToDelete(null);
          }} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"              >
            {t('app.cancel')}              </button>
          <button onClick={confirmDeleteUser} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"              >
            {t('app.delete')}              </button>
        </div>
      </div>
    </div>
    )}      {/* Snackbar Notification */}      {snackbar.show && (<div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow text-white ${snackbar.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      <div className="flex items-center space-x-2">
        <span>
          {snackbar.message}</span>
        <button onClick={() =>
          setSnackbar({ show: false, message: '', type: 'success' })} className="ml-2 text-white hover:text-gray-200"            >
        </button>
      </div>
    </div>
    )}    </MainLayout>
  );
};



