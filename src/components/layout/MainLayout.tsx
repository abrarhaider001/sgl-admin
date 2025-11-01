'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLanguage } from '@/context/LanguageContext';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, title }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className={`flex-1 flex flex-col ${isMobile ? '' : 'ml-20'} transition-all duration-300`}>
        <Header title={title} />
        
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
        
        <footer className="bg-white p-4 text-center text-gray-500 text-sm border-t">
          &copy; {new Date().getFullYear()} {t('app.title')} - {t('app.rights')}
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;