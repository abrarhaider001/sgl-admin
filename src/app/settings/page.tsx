'use client';

import { useState, useEffect } from 'react';
import { FiSave, FiGlobe, FiLock, FiUser, FiAlertCircle, FiCheck } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';

const SettingsPage = () => {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('general');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Password form errors
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    general: ''
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: t('settings.defaultName'),
    email: t('settings.defaultEmail'),
    phone: t('settings.defaultPhone')
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when typing
    if (passwordErrors[name as keyof typeof passwordErrors]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePasswordForm = () => {
    const errors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      general: ''
    };
    let isValid = true;

    if (!passwordForm.currentPassword) {
      errors.currentPassword = t('settings.currentPasswordRequired');
      isValid = false;
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = t('settings.newPasswordRequired');
      isValid = false;
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = t('settings.passwordMinLength');
      isValid = false;
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = t('settings.confirmPasswordRequired');
      isValid = false;
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = t('settings.passwordsDoNotMatch');
      isValid = false;
    }

    setPasswordErrors(errors);
    return isValid;
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePasswordForm()) {
      // In a real app, this would call an API to update the password
      console.log(t('settings.passwordUpdateSuccess'));
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      showSaveSuccess();
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call an API to update the profile
    console.log(t('settings.profileUpdateSuccess'));
    showSaveSuccess();
  };

  const handleLanguageChange = (newLanguage: 'en' | 'es') => {
    setLanguage(newLanguage);
    setSettingsChanged(true);
    showSaveSuccess();
  };





  const handleSavePreferences = () => {
    // All preferences are already saved automatically
    showSaveSuccess();
    setSettingsChanged(false);
  };

  const showSaveSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  return (
    <MainLayout title={t('settings.title')}>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-white rounded-lg shadow p-4">
            <nav>
              <ul>
                <li>
                  <button
                    onClick={() => setActiveTab('general')}
                    className={`w-full text-left px-4 py-2 rounded-md flex items-center ${activeTab === 'general' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  >
                    <FiGlobe className="mr-2" />
                    {t('settings.general')}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full text-left px-4 py-2 rounded-md flex items-center ${activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  >
                    <FiUser className="mr-2" />
                    {t('settings.profile')}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`w-full text-left px-4 py-2 rounded-md flex items-center ${activeTab === 'security' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                  >
                    <FiLock className="mr-2" />
                    {t('settings.security')}
                  </button>
                </li>

              </ul>
            </nav>
          </div>
          
          {/* Content */}
          <div className="flex-1 bg-white rounded-lg shadow p-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">{t('settings.generalSettings')}</h2>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.language')}</label>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className={`px-4 py-2 rounded-md flex items-center transition-all duration-200 ${
                        language === 'en' 
                          ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm' 
                          : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                      }`}
                    >
                      <span className="mr-2">🇺🇸</span>
                      English
                      {language === 'en' && <FiCheck className="ml-2" size={16} />}
                    </button>
                    <button
                      onClick={() => handleLanguageChange('es')}
                      className={`px-4 py-2 rounded-md flex items-center transition-all duration-200 ${
                        language === 'es' 
                          ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm' 
                          : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                      }`}
                    >
                      <span className="mr-2">🇪🇸</span>
                      Español
                      {language === 'es' && <FiCheck className="ml-2" size={16} />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{t('settings.languageDescription')}</p>
                </div>
                

                
                {settingsChanged && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">{t('settings.changesDetected')}</p>
                  </div>
                )}
                
                <button
                  onClick={handleSavePreferences}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
                >
                  <FiSave size={18} />
                  <span>{t('settings.savePreferences')}</span>
                </button>
              </div>
            )}
            
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">{t('settings.profileSettings')}</h2>
                
                <form onSubmit={handleSaveProfile}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.name')}</label>
                    <input
                      type="text"
                      name="name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.email')}</label>
                    <input
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.phone')}</label>
                    <input
                      type="text"
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
                  >
                    <FiSave size={18} />
                    <span>{t('settings.saveProfile')}</span>
                  </button>
                </form>
              </div>
            )}
            
            {/* Security Settings */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">{t('settings.securitySettings')}</h2>
                
                <form onSubmit={handleSavePassword}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.currentPassword')}</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className={`w-full p-2 border rounded-md ${passwordErrors.currentPassword ? 'border-red-500' : ''}`}
                    />
                    {passwordErrors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword}</p>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.newPassword')}</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className={`w-full p-2 border rounded-md ${passwordErrors.newPassword ? 'border-red-500' : ''}`}
                    />
                    {passwordErrors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.confirmPassword')}</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className={`w-full p-2 border rounded-md ${passwordErrors.confirmPassword ? 'border-red-500' : ''}`}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                  
                  {passwordErrors.general && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
                      <FiAlertCircle className="mr-2" />
                      {passwordErrors.general}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
                  >
                    <FiSave size={18} />
                    <span>{t('settings.updatePassword')}</span>
                  </button>
                </form>
              </div>
            )}
            

          </div>
        </div>
        
        {/* Success Message */}
        {saveSuccess && (
          <div className="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50 animate-slide-in">
            <div className="flex items-center">
              <FiCheck className="mr-2" size={16} />
              {t('settings.saveSuccess')}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SettingsPage;