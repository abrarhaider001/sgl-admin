'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiHome, FiUsers, FiGrid, FiBarChart2, FiBell, FiLogOut, FiMenu, FiX, FiBook, FiExternalLink, FiShield, FiDollarSign, FiPackage } from 'react-icons/fi';
import { RiQrCodeLine, RiImageLine } from 'react-icons/ri';
import { useLanguage } from '@/context/LanguageContext';

interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile, isOpen, toggleSidebar }) => {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userSession');

    // Redirect to login page
    router.replace('/auth/login');
  };

  const mainNavItems = [
    { name: t('nav.dashboard'), icon: <FiHome size={20} />, href: '/dashboard' },
    { name: t('nav.users'), icon: <FiUsers size={20} />, href: '/users' },
    { name: t('nav.admins'), icon: <FiShield size={20} />, href: '/admins' },
  ];

  const contentNavItems = [
    { name: t('nav.albums'), icon: <FiBook size={20} />, href: '/albums', hasExternal: true },
    { name: t('nav.banners'), icon: <RiImageLine size={20} />, href: '/banners' },
    { name: t('nav.store'), icon: <FiPackage size={20} />, href: '/store' },
  ];

  const systemNavItems = [
    { name: t('nav.sales'), icon: <FiDollarSign size={20} />, href: '/sales' },
    { name: t('nav.reports'), icon: <FiBarChart2 size={20} />, href: '/reports' },
    { name: t('nav.notifications'), icon: <FiBell size={20} />, href: '/notifications' },
  ];

  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  };

  const overlayVariants = {
    open: { opacity: 0.5, display: 'block' },
    closed: { opacity: 0, display: 'none', transition: { delay: 0.2 } },
  };

  return (
    <>
      {isMobile && (
        <motion.div
          className="fixed inset-0 bg-black z-20"
          initial="closed"
          animate={isOpen ? 'open' : 'closed'}
          variants={overlayVariants}
          onClick={toggleSidebar}
        />
      )}

      <motion.div
        className={`fixed top-0 left-0 h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white z-30 shadow-2xl ${isMobile ? 'w-72' : 'w-20 hover:w-72'} transition-all duration-300 ease-in-out overflow-hidden group flex flex-col`}
        initial={isMobile ? 'closed' : 'open'}
        animate={isMobile ? (isOpen ? 'open' : 'closed') : 'open'}
        variants={isMobile ? sidebarVariants : {}}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FiGrid size={18} className="text-white" />
            </div>
            <h1 className={`text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent ${!isMobile && 'hidden group-hover:block'}`}>
              {t('app.title')}
            </h1>
          </div>
          {isMobile && (
            <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
              <FiX size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 mt-8 px-4 overflow-y-auto pb-24 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 hover:scrollbar-thumb-slate-500 transition-colors duration-200">
          {/* Main Navigation */}
          <div className="mb-8">
            <h3 className={`text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2 ${!isMobile && 'hidden group-hover:block'}`}>
              Main
            </h3>
            <ul className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <div
                        className={`flex items-center p-3 rounded-xl transition-colors duration-200 relative group/item ${isActive
                            ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-blue-300'
                            : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                          }`}
                      >
                        <div className="flex items-center justify-center min-w-[20px]">
                          {item.icon}
                        </div>
                        <span className={`ml-4 text-sm font-medium ${!isMobile && 'hidden group-hover:block'}`}>
                          {item.name}
                        </span>
                        {isActive && (
                          <motion.div
                            className="absolute left-0 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full"
                            layoutId="activeIndicator"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Content Management */}
          <div className="mb-8">
            <h3 className={`text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2 ${!isMobile && 'hidden group-hover:block'}`}>
              Content
            </h3>
            <ul className="space-y-1">
              {contentNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <div
                        className={`flex items-center p-3 rounded-xl transition-colors duration-200 relative group/item ${isActive
                            ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-blue-300'
                            : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                          }`}
                      >
                        <div className="flex items-center justify-center min-w-[20px]">
                          {item.icon}
                        </div>
                        <span className={`ml-4 text-sm font-medium ${!isMobile && 'hidden group-hover:block'}`}>
                          {item.name}
                        </span>
                        {item.hasExternal && (
                          <FiExternalLink
                            size={14}
                            className={`ml-auto text-slate-400 ${!isMobile && 'hidden group-hover:block'}`}
                          />
                        )}
                        {isActive && (
                          <motion.div
                            className="absolute left-0 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full"
                            layoutId="activeIndicator"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* System */}
          <div className="mb-8">
            <h3 className={`text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2 ${!isMobile && 'hidden group-hover:block'}`}>
              System
            </h3>
            <ul className="space-y-1">
              {systemNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <div
                        className={`flex items-center p-3 rounded-xl transition-colors duration-200 relative group/item ${isActive
                            ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-blue-300'
                            : 'hover:bg-slate-700/50 text-slate-300 hover:text-white'
                          }`}
                      >
                        <div className="flex items-center justify-center min-w-[20px]">
                          {item.icon}
                        </div>
                        <span className={`ml-4 text-sm font-medium ${!isMobile && 'hidden group-hover:block'}`}>
                          {item.name}
                        </span>
                        {isActive && (
                          <motion.div
                            className="absolute left-0 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full"
                            layoutId="activeIndicator"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-700/50 bg-slate-900/50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-3 rounded-xl hover:bg-red-600/20 hover:border hover:border-red-500/30 text-slate-300 hover:text-red-300 transition-colors duration-200 group/logout"
          >
            <div className="flex items-center justify-center min-w-[20px]">
              <FiLogOut size={20} />
            </div>
            <span className={`ml-4 text-sm font-medium ${!isMobile && 'hidden group-hover:block'}`}>
              {t('nav.logout')}
            </span>
          </button>
        </div>
      </motion.div>

      {isMobile && !isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed bottom-4 left-4 z-20 p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
        >
          <FiMenu size={20} />
        </button>
      )}
    </>
  );
};

export default Sidebar;