'use client';

import { useState, useEffect } from 'react';
import { sendNotificationApi } from '@/services/notificationService';
import { FiSend, FiBell, FiCalendar, FiUsers, FiSearch, FiFilter, FiEye, FiTrash2, FiCheck, FiX, FiChevronDown } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';
import { locationService, CountryOption, StateOption, CityOption } from '@/services/locationService';
import { userService, UserWithCards } from '@/services/userService';

interface Notification {
  id: string;
  title: string;
  body: string;
  target: 'global' | 'specific';
  status: 'sent' | 'scheduled';
  date: string;
  time?: string;
  recipients?: string[];
}

const NotificationsPage = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<UserWithCards[]>([]);

  // Location filters
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [statesByCountry, setStatesByCountry] = useState<Record<string, StateOption[]>>({});
  const [citiesByState, setCitiesByState] = useState<Record<string, CityOption[]>>({});
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]); // by name
  const [selectedStates, setSelectedStates] = useState<string[]>([]); // by name
  const [selectedCities, setSelectedCities] = useState<string[]>([]); // by name
  const [availableStates, setAvailableStates] = useState<StateOption[]>([]);
  const [availableCities, setAvailableCities] = useState<CityOption[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [isCountryOpen, setIsCountryOpen] = useState<boolean>(false);
  const [isStateOpen, setIsStateOpen] = useState<boolean>(false);
  const [isCityOpen, setIsCityOpen] = useState<boolean>(false);
  
  // Form state
  const [notificationForm, setNotificationForm] = useState<{
    title: string;
    body: string;
    target: 'global' | 'specific';
    date: string;
    time: string;
    selectedUsers: string[];
  }>({
    title: '',
    body: '',
    target: 'global',
    date: '',
    time: '',
    selectedUsers: [],
  });

  // Mock users for selection
  const mockUsers = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: '3', name: 'Robert Johnson', email: 'robert@example.com' },
    { id: '4', name: 'Emily Davis', email: 'emily@example.com' },
    { id: '5', name: 'Michael Wilson', email: 'michael@example.com' },
  ];

  // Mock notifications data
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'New Card Collection Available',
        body: 'Check out our new limited edition cards available now!',
        target: 'global',
        status: 'sent',
        date: '2023-11-15',
        time: '10:30',
      },
      {
        id: '2',
        title: 'Weekly Newsletter',
        body: 'Your weekly update on new cards and features.',
        target: 'global',
        status: 'scheduled',
        date: '2023-11-20',
        time: '09:00',
      },
      {
        id: '3',
        title: 'Welcome New Users',
        body: 'Welcome to our collectible card platform!',
        target: 'specific',
        status: 'scheduled',
        date: '2023-11-18',
        time: '14:00',
        recipients: ['2', '4'],
      },
    ];

    setNotifications(mockNotifications);
  }, []);

  // Load location hierarchy once
  useEffect(() => {
    (async () => {
      setIsLoadingLocations(true);
      setLocationsError(null);
      try {
        const data = await locationService.getAll();
        setCountries(data.countries);
        setStatesByCountry(data.statesByCountry);
        setCitiesByState(data.citiesByState);
      } catch (e) {
        console.error('Failed to load location data', e);
        setLocationsError('Failed to load locations. Please try again.');
      } finally {
        setIsLoadingLocations(false);
      }
    })();
  }, []);

  // Compute available states and cities based on selections
  useEffect(() => {
    const countryIdByName = new Map<string, string>();
    countries.forEach(c => countryIdByName.set(c.name, c.id));

    const states: StateOption[] = [];
    selectedCountries.forEach(name => {
      const cid = countryIdByName.get(name);
      if (cid && statesByCountry[cid]) {
        states.push(...statesByCountry[cid]);
      }
    });
    // Unique by id
    const uniqueStatesMap = new Map<string, StateOption>();
    states.forEach(s => uniqueStatesMap.set(s.id, s));
    const uniqueStates = Array.from(uniqueStatesMap.values()).sort((a,b)=>a.name.localeCompare(b.name));
    setAvailableStates(uniqueStates);

    // When countries change, drop states not in scope
    const validStateNames = new Set(uniqueStates.map(s => s.name));
    setSelectedStates(prev => prev.filter(n => validStateNames.has(n)));
  }, [selectedCountries, countries, statesByCountry]);

  useEffect(() => {
    const stateIdByName = new Map<string, string>();
    availableStates.forEach(s => stateIdByName.set(s.name, s.id));

    const cities: CityOption[] = [];
    selectedStates.forEach(name => {
      const sid = stateIdByName.get(name);
      if (sid && citiesByState[sid]) {
        cities.push(...citiesByState[sid]);
      }
    });
    // Unique by id
    const uniqueCitiesMap = new Map<string, CityOption>();
    cities.forEach(c => uniqueCitiesMap.set(c.id, c));
    const uniqueCities = Array.from(uniqueCitiesMap.values()).sort((a,b)=>a.name.localeCompare(b.name));
    setAvailableCities(uniqueCities);

    // When states change, drop cities not in scope
    const validCityNames = new Set(uniqueCities.map(c => c.name));
    setSelectedCities(prev => prev.filter(n => validCityNames.has(n)));
  }, [selectedStates, availableStates, citiesByState]);

  // Fetch users dynamically when location filters change or modal opens
  useEffect(() => {
    let cancelled = false;
    const fetchUsers = async () => {
      if (!showUserSelection) return; // only fetch when modal is open
      setIsLoadingUsers(true);
      try {
        const unique = new Map<string, UserWithCards>();
        const addUsers = (arr: UserWithCards[]) => {
          arr.forEach(u => { if (!unique.has(u.id)) unique.set(u.id, u); });
        };

        if (selectedCities.length > 0) {
          for (const city of selectedCities) {
            const arr = await userService.getUsers({ city });
            addUsers(arr);
          }
        } else if (selectedStates.length > 0) {
          for (const state of selectedStates) {
            const arr = await userService.getUsers({ state });
            addUsers(arr);
          }
        } else if (selectedCountries.length > 0) {
          for (const country of selectedCountries) {
            const arr = await userService.getUsers({ country });
            addUsers(arr);
          }
        } else {
          const arr = await userService.getUsers();
          addUsers(arr);
        }

        if (!cancelled) {
          setFilteredUsers(Array.from(unique.values()));
        }
      } catch (e) {
        console.error('Failed to fetch users', e);
      } finally {
        if (!cancelled) setIsLoadingUsers(false);
      }
    };

    fetchUsers();
    return () => { cancelled = true; };
  }, [selectedCountries, selectedStates, selectedCities, showUserSelection]);

  // Filter notifications based on search term and status filter
  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          notification.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNotificationForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle user selection
  const toggleUserSelection = (userId: string) => {
    setNotificationForm(prev => {
      const isSelected = prev.selectedUsers.includes(userId);
      return {
        ...prev,
        selectedUsers: isSelected
          ? prev.selectedUsers.filter(id => id !== userId)
          : [...prev.selectedUsers, userId]
      };
    });
  };

  // Handle notification send
  const handleSendNotification = async () => {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5);
    const scheduledDate = notificationForm.date || currentDate;
    const scheduledTime = notificationForm.time || currentTime;
    
    // Determine if notification should be sent immediately or scheduled
    const isScheduled = notificationForm.date && notificationForm.time && 
                       (scheduledDate > currentDate || 
                        (scheduledDate === currentDate && scheduledTime > currentTime));
    
    const newNotification: Notification = {
      id: (notifications.length + 1).toString(),
      title: notificationForm.title,
      body: notificationForm.body,
      target: notificationForm.target,
      status: isScheduled ? 'scheduled' : 'sent',
      date: scheduledDate,
      time: scheduledTime,
      recipients: notificationForm.target === 'specific' ? notificationForm.selectedUsers : undefined,
    };
    try {

      // Send notifications to selected users or globally by resolving FCM tokens server-side
      if (notificationForm.target === 'specific') {
        if (notificationForm.selectedUsers.length === 0) {
          alert('Please select at least one user');
          return;
        }
        const res = await sendNotificationApi({ mode: 'specific', userIds: notificationForm.selectedUsers, title: notificationForm.title, body: notificationForm.body });
        if (!res.ok) {
          alert(`Failed to send notification. ${res.error ?? ''} (failures: ${res.failureCount ?? 0})`);
        }
      } else {
        // Global: send to all users' tokens
        const filtersPayload = selectedCities.length > 0
          ? { cities: selectedCities }
          : selectedStates.length > 0
          ? { states: selectedStates }
          : selectedCountries.length > 0
          ? { countries: selectedCountries }
          : undefined;
        const res = await sendNotificationApi({ mode: 'global', title: notificationForm.title, body: notificationForm.body, filters: filtersPayload });
        if (!res.ok) {
          alert(`Failed to send global notification. ${res.error ?? ''} (failures: ${res.failureCount ?? 0})`);
        }
      }

      setNotifications([newNotification, ...notifications]);
      setShowConfirmation(false);
      setShowSuccess(true);

      // Reset form after successful send
      setNotificationForm({
        title: '',
        body: '',
        target: 'global',
        date: '',
        time: '',
        selectedUsers: [],
      });

      setTimeout(() => { setShowSuccess(false); }, 3000);
    } catch (e) {
      console.error('Failed to send notifications', e);
      alert('Failed to send notifications. Please try again.');
    }
  };

  return (
    <MainLayout title={t('notifications.title')}>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">{t('notifications.title')}</h1>
        
        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'compose' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('compose')}
          >
            <FiBell className="inline mr-2" />
            {t('notifications.compose')}
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('history')}
          >
            <FiCalendar className="inline mr-2" />
            {t('notifications.history')}
          </button>
        </div>

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('notifications.title_field')}
              </label>
              <input
                type="text"
                name="title"
                value={notificationForm.title}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder={t('notifications.title_field')}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('notifications.body')}
              </label>
              <textarea
                name="body"
                value={notificationForm.body}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md h-32"
                placeholder={t('notifications.body')}
              />
            </div>

            {/* Custom data JSON has been removed as per requirements */}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('notifications.target')}
              </label>
              <select
                name="target"
                value={notificationForm.target}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              >
                <option value="global">{t('notifications.global')}</option>
                <option value="specific">{t('notifications.specific')}</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('notifications.date')}
                </label>
                <input
                  type="date"
                  name="date"
                  value={notificationForm.date}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('notifications.time')}
                </label>
                <input
                  type="time"
                  name="time"
                  value={notificationForm.time}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>

            {notificationForm.target === 'specific' && (
              <div className="mb-4">
                <button
                  onClick={() => setShowUserSelection(true)}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <FiUsers className="mr-1" />
                  {t('notifications.selectUsers')}
                  {notificationForm.selectedUsers.length > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                      {notificationForm.selectedUsers.length}
                    </span>
                  )}
                </button>
              </div>
            )}



            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  if (notificationForm.title && notificationForm.body) {
                    setShowConfirmation(true);
                  }
                }}
                disabled={!notificationForm.title || !notificationForm.body}
                className={`flex items-center px-4 py-2 rounded-md ${!notificationForm.title || !notificationForm.body ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}`}
              >
                <FiSend className="mr-2" />
                {t('notifications.send')}
              </button>

              <button
                onClick={() => {
                  // Preview logic would go here
                }}
                className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <FiEye className="mr-2" />
                {t('notifications.preview')}
              </button>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FiSearch className="text-gray-500" />
                </div>
                <input
                  type="text"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full pl-10 p-2.5"
                  placeholder={t('notifications.message')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="relative w-full md:w-48">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FiFilter className="text-gray-500" />
                </div>
                <select
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full pl-10 p-2.5"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="sent">{t('notifications.sent')}</option>
                  <option value="scheduled">{t('notifications.scheduled')}</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden"><div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('notifications.title_field')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('notifications.target')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('notifications.date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('notifications.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.action')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => (
                      <tr key={notification.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {notification.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {notification.target === 'global' 
                            ? t('notifications.global')
                            : (
                              <div className="flex items-center">
                                {t('notifications.specific')}
                                <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                  {notification.recipients?.length || 0}
                                </span>
                              </div>
                            )
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><div>
                            {notification.date}
                            {notification.time && (
                              <span className="block text-sm text-gray-500">{notification.time}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            notification.status === 'sent' ? 'bg-green-100 text-green-800' :
                            notification.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {t(`notifications.${notification.status}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex items-center justify-end space-x-3">
                            <button className="text-blue-600 hover:text-blue-900">
                              <FiEye size={18} />
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="bg-white border-b">
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500 text-sm">
                        No notifications found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>                </div>              </div>          </div>
        )}

        {/* User Selection Modal */}
        {showUserSelection && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">{t('notifications.selectUsers')}</h3>
                <button onClick={() => setShowUserSelection(false)} className="text-blue-600 hover:text-blue-900">
                  <FiX size={20} />
                </button>
              </div>
              
              {/* Location Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Country Dropdown */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('notifications.country')}</label>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isCountryOpen}
                    onClick={() => setIsCountryOpen(o => !o)}
                    className={`w-full flex justify-between items-center border rounded px-3 py-2 text-sm bg-white ${isCountryOpen ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <span className="text-gray-700">
                      {selectedCountries.length > 0 ? `${selectedCountries.length} selected` : 'Select countries'}
                    </span>
                    <FiChevronDown className="text-gray-500" />
                  </button>
                  <div className="sr-only" aria-live="polite" id="countries-status">
                    {isLoadingLocations ? 'Loading locations' : locationsError ? `Error: ${locationsError}` : `${countries.length} countries available`}
                  </div>
                  {isCountryOpen && (
                    <div
                      role="listbox"
                      aria-multiselectable="true"
                      className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto border rounded bg-white shadow"
                    >
                      {isLoadingLocations ? (
                        <div className="p-2 text-sm text-gray-500">Loading locations...</div>
                      ) : locationsError ? (
                        <div className="p-2 text-sm text-red-600">{locationsError}</div>
                      ) : countries.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">No countries found</div>
                      ) : (
                        countries.map((c) => (
                          <label key={c.id} className="flex items-center py-1 px-2 cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedCountries.includes(c.name)}
                              onChange={() => {
                                setSelectedCountries(prev => prev.includes(c.name) ? prev.filter(n => n !== c.name) : [...prev, c.name]);
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              aria-label={c.name}
                            />
                            <span className="ml-2 text-sm">{c.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                  {selectedCountries.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedCountries.map(name => (
                        <span key={name} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                          {name}
                          <button onClick={() => setSelectedCountries(prev => prev.filter(n => n !== name))} className="ml-1 text-blue-700 hover:text-blue-900" aria-label={`Remove ${name}`}><FiX size={14} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* State Dropdown */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('notifications.state')}</label>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isStateOpen}
                    onClick={() => {
                      if (selectedCountries.length === 0) return;
                      setIsStateOpen(o => !o);
                    }}
                    disabled={selectedCountries.length === 0}
                    className={`w-full flex justify-between items-center border rounded px-3 py-2 text-sm bg-white ${isStateOpen ? 'ring-2 ring-green-500' : ''} ${selectedCountries.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-gray-700">
                      {selectedStates.length > 0 ? `${selectedStates.length} selected` : selectedCountries.length === 0 ? 'Select a country first' : 'Select states'}
                    </span>
                    <FiChevronDown className="text-gray-500" />
                  </button>
                  {isStateOpen && (
                    <div
                      role="listbox"
                      aria-multiselectable="true"
                      className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto border rounded bg-white shadow"
                    >
                      {isLoadingLocations ? (
                        <div className="p-2 text-sm text-gray-500">Loading...</div>
                      ) : availableStates.length === 0 && selectedCountries.length > 0 ? (
                        <div className="p-2 text-sm text-gray-500">No states found</div>
                      ) : (
                        availableStates.map((s) => (
                          <label key={s.id} className="flex items-center py-1 px-2 cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedStates.includes(s.name)}
                              onChange={() => {
                                setSelectedStates(prev => prev.includes(s.name) ? prev.filter(n => n !== s.name) : [...prev, s.name]);
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              aria-label={s.name}
                            />
                            <span className="ml-2 text-sm">{s.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                  {selectedStates.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedStates.map(name => (
                        <span key={name} className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                          {name}
                          <button onClick={() => setSelectedStates(prev => prev.filter(n => n !== name))} className="ml-1 text-green-700 hover:text-green-900" aria-label={`Remove ${name}`}><FiX size={14} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* City Dropdown */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('notifications.city')}</label>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isCityOpen}
                    onClick={() => {
                      if (selectedStates.length === 0) return;
                      setIsCityOpen(o => !o);
                    }}
                    disabled={selectedStates.length === 0}
                    className={`w-full flex justify-between items-center border rounded px-3 py-2 text-sm bg-white ${isCityOpen ? 'ring-2 ring-purple-500' : ''} ${selectedStates.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-gray-700">
                      {selectedCities.length > 0 ? `${selectedCities.length} selected` : selectedStates.length === 0 ? 'Select a state first' : 'Select cities'}
                    </span>
                    <FiChevronDown className="text-gray-500" />
                  </button>
                  {isCityOpen && (
                    <div
                      role="listbox"
                      aria-multiselectable="true"
                      className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto border rounded bg-white shadow"
                    >
                      {isLoadingLocations ? (
                        <div className="p-2 text-sm text-gray-500">Loading...</div>
                      ) : availableCities.length === 0 && selectedStates.length > 0 ? (
                        <div className="p-2 text-sm text-gray-500">No cities found</div>
                      ) : (
                        availableCities.map((c) => (
                          <label key={c.id} className="flex items-center py-1 px-2 cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedCities.includes(c.name)}
                              onChange={() => {
                                setSelectedCities(prev => prev.includes(c.name) ? prev.filter(n => n !== c.name) : [...prev, c.name]);
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              aria-label={c.name}
                            />
                            <span className="ml-2 text-sm">{c.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                  {selectedCities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedCities.map(name => (
                        <span key={name} className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                          {name}
                          <button onClick={() => setSelectedCities(prev => prev.filter(n => n !== name))} className="ml-1 text-purple-700 hover:text-purple-900" aria-label={`Remove ${name}`}><FiX size={14} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Search Users */}
              <div className="mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FiSearch className="text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full pl-10 p-2.5"
                    placeholder={t('notifications.searchUsers')}
                  />
                </div>
              </div>
              
              <div className="max-h-60 overflow-y-auto mb-4 border rounded">
                {isLoadingUsers ? (
                  <div className="p-4 text-sm text-gray-500">{t('notifications.loadingUsers')}</div>
                ) : (
                  (() => {
                    const searchLower = userSearchTerm.toLowerCase();
                    const usersToShow = filteredUsers.filter(u => (
                      u.name?.toLowerCase().includes(searchLower) || u.email?.toLowerCase().includes(searchLower)
                    ));
                    return usersToShow.length > 0 ? usersToShow.map(user => (
                      <div key={user.id} className="flex items-center p-2 hover:bg-gray-100 rounded-md">
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          checked={notificationForm.selectedUsers.includes(user.id)}
                          onChange={() => { const isSelected = notificationForm.selectedUsers.includes(user.id); toggleUserSelection(user.id); if (!isSelected) setShowUserSelection(false); }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={`user-${user.id}`} className="ml-2 text-sm font-medium text-gray-900 cursor-pointer flex-1">
                          {user.name || `${user.firstName} ${user.lastName}`}
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </label>
                        <div className="text-xs text-gray-500">
                          {[user.country, user.state, user.city].filter(Boolean).join(' • ')}
                        </div>
                      </div>
                    )) : (
                      <div className="p-4 text-sm text-gray-500">{t('notifications.noUsersFound')}</div>
                    );
                  })()
                )}
              </div>
              
              {notificationForm.selectedUsers.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {t('notifications.selectedUsers')} ({notificationForm.selectedUsers.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {notificationForm.selectedUsers.map(userId => {
                      const user = filteredUsers.find(u => u.id === userId);
                      const displayName = user ? (user.name || `${user.firstName} ${user.lastName}`) : userId;
                      return (
                        <div key={userId} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                          {displayName}
                          <button 
                            onClick={() => toggleUserSelection(userId)}
                            className="ml-1 text-blue-700 hover:text-blue-900"
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowUserSelection(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  {t('app.cancel')}
                </button>
                <button
                  onClick={() => setShowUserSelection(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex space-x-2 transition-colors font-medium"
                >
                  {t('app.save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">{t('notifications.confirmSend')}</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <strong>{t('notifications.title_field')}:</strong> {notificationForm.title}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>{t('notifications.body')}:</strong> {notificationForm.body}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>{t('notifications.target')}:</strong> {notificationForm.target === 'global' ? 
                    t('notifications.global') : 
                    `${t('notifications.specific')} (${notificationForm.selectedUsers.length})`
                  }
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  {t('app.cancel')}
                </button>
                <button
                  onClick={handleSendNotification}
                  className="btn-primary"
                >
                  <FiSend className="mr-2" />
                  {t('notifications.send')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {showSuccess && (
          <div className="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md flex items-center z-50">
            <FiCheck className="mr-2" />
            {t('notifications.success')}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default NotificationsPage;

