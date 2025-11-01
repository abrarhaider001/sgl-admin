'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import { authService } from '@/services/authService';

const LoginPage = () => {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };
  
  const validateForm = () => {
    let valid = true;
    const newErrors = { email: '', password: '' };
    
    // Email validation
    if (!formData.email) {
      newErrors.email = t('auth.emailRequired');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.emailInvalid');
      valid = false;
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = t('auth.passwordRequired');
      valid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = t('auth.passwordTooShort');
      valid = false;
    }
    
    setErrors(newErrors);
    return valid;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear login error when user makes changes
    if (loginError) {
      setLoginError('');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setLoginError('');
    
    try {
      const response = await authService.login({
        email: formData.email,
        password: formData.password
      });
      
      if (response.success) {
        // Use replace to avoid navigation stack issues
        router.replace('/dashboard');
      } else {
        setLoginError(response.message || t('auth.invalidCredentials'));
      }
    } catch {
      setLoginError(t('app.error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-800 p-4">
      <div className="absolute top-4 right-4">
        <button 
          onClick={toggleLanguage}
          className="px-4 py-2 rounded-md bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
        >
          {language === 'en' ? 'Español' : 'English'}
        </button>
      </div>
      
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white">{t('app.title')}</h1>
          <p className="text-indigo-100 mt-2">{t('auth.login')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('auth.email')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="admin@example.com"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('auth.password')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff className="text-gray-400" /> : <FiEye className="text-gray-400" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                {t('auth.rememberMe')}
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                {t('auth.forgotPassword')}
              </a>
            </div>
          </div>
          
          {loginError && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
              {loginError}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('app.loading')}
              </>
            ) : t('auth.login')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;