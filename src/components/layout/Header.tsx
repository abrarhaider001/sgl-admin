'use client';

import React, { useState } from 'react';
import { FiBell, FiSearch, FiLogOut, FiSettings } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userSession');
    
    // Redirect to login page
    router.replace('/auth/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  return (
    <header className="bg-white shadow-sm px-4 sm:px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">{title}</h1>
      
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="relative hidden lg:block">
          <input
            type="text"
            placeholder={t('app.search')}
            className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        
        <button className="lg:hidden p-2 text-gray-600 hover:text-gray-800 transition-colors">
          <FiSearch size={20} />
        </button>
        
        {/* <button 
          onClick={toggleLanguage}
          className="px-2 sm:px-3 py-1 rounded-md bg-indigo-100 text-indigo-700 font-medium hover:bg-indigo-200 transition-colors text-sm"
        >
          {language === 'en' ? 'ES' : 'EN'}
        </button> */}
        
        <div className="relative">
          <button className="p-2 rounded-full hover:bg-gray-100 relative">
            <FiBell size={20} className="text-gray-600" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
              A
            </div>
            <span className="hidden md:inline text-gray-700 font-medium">Admin</span>
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <button 
                onClick={() => {
                  setShowDropdown(false);
                  router.push('/settings');
                }}
                className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <FiSettings className="mr-3" size={16} />
                {t('nav.settings')}
              </button>
              <button 
                onClick={() => {
                  setShowDropdown(false);
                  handleLogout();
                }}
                className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <FiLogOut className="mr-3" size={16} />
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;