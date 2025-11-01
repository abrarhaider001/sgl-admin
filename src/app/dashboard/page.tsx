'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';
import { 
  FiUsers, 
  FiGrid, 
  FiBarChart2, 
  FiBell, 
  FiTrendingUp, 
  FiTrendingDown,
  FiCalendar,
  FiActivity
} from 'react-icons/fi';
import { RiQrCodeLine } from 'react-icons/ri';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface DashboardStats {
  totalUsers: number;
  totalCards: number;
  totalAlbums: number;
  totalCodes: number; // redeemCodes documents
  totalPacks: number;
  totalBanners: number;
  totalSales: number; // accumulated price
  userGrowth: number;
  cardCollections: number;
  notifications: number;
}

interface TimeSpan {
  label: string;
  value: string;
  days: number;
}

const DashboardPage = () => {
  const { t, language } = useLanguage();
  const [selectedTimeSpan, setSelectedTimeSpan] = useState('7d');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCards: 0,
    totalAlbums: 0,
    totalCodes: 0,
    totalPacks: 0,
    totalBanners: 0,
    totalSales: 0,
    userGrowth: 0,
    cardCollections: 0,
    notifications: 0
  });
  const [loading, setLoading] = useState(true);

  const timeSpans: TimeSpan[] = [
    { label: t('dashboard.last7Days'), value: '7d', days: 7 },
    { label: t('dashboard.last30Days'), value: '30d', days: 30 },
    { label: t('dashboard.last90Days'), value: '90d', days: 90 },
    { label: t('dashboard.lastYear'), value: '1y', days: 365 }
  ];

  useEffect(() => {
    fetchDashboardData();
    // Filter disabled: ignore selectedTimeSpan changes
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const redeemCollectionName = process.env.NEXT_PUBLIC_REDEEM_CODES_COLLECTION || 'redeemCodes';

      const [usersSnap, cardsSnap, albumsSnap, redeemSnap, packsSnap, bannersSnap, salesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'cards')),
        getDocs(collection(db, 'albums')),
        getDocs(collection(db, redeemCollectionName)),
        getDocs(collection(db, 'packs')),
        getDocs(collection(db, 'banners')),
        getDocs(collection(db, 'sales')),
      ]);

      const normalizePrice = (value: any): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const n = Number(value);
          return isNaN(n) ? 0 : n;
        }
        return 0;
      };

      const totalSales = salesSnap.docs.reduce((sum, doc) => {
        const data = doc.data() as any;
        return sum + normalizePrice(data.price);
      }, 0);

      setStats({
        totalUsers: usersSnap.size,
        totalCards: cardsSnap.size,
        totalAlbums: albumsSnap.size,
        totalCodes: redeemSnap.size,
        totalPacks: packsSnap.size,
        totalBanners: bannersSnap.size,
        totalSales,
        userGrowth: 0,
        cardCollections: 0,
        notifications: 0,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getGrowthColor = (growth: number): string => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <FiTrendingUp className="w-4 h-4" />;
    if (growth < 0) return <FiTrendingDown className="w-4 h-4" />;
    return <FiActivity className="w-4 h-4" />;
  };

  const dashboardCards = [
    {
      title: t('dashboard.totalUsers'),
      value: formatNumber(stats.totalUsers),
      icon: <FiUsers size={24} />,
      color: 'bg-blue-500',
      growth: 0,
      description: t('dashboard.totalUsersDesc')
    },
    {
      title: t('dashboard.totalCards'),
      value: formatNumber(stats.totalCards),
      icon: <FiGrid size={24} />,
      color: 'bg-purple-500',
      growth: 0,
      description: t('dashboard.totalCardsDesc')
    },
    {
      title: t('dashboard.totalAlbums'),
      value: formatNumber(stats.totalAlbums),
      icon: <FiBarChart2 size={24} />,
      color: 'bg-indigo-500',
      growth: 0,
      description: t('dashboard.totalAlbumsDesc')
    },
    {
      title: t('dashboard.totalQrCodes'),
      value: formatNumber(stats.totalCodes),
      icon: <RiQrCodeLine size={24} />,
      color: 'bg-yellow-500',
      growth: 0,
      description: t('dashboard.totalQrCodesDesc')
    },
    {
      title: t('dashboard.totalPacks'),
      value: formatNumber(stats.totalPacks),
      icon: <FiGrid size={24} />,
      color: 'bg-teal-500',
      growth: 0,
      description: t('dashboard.totalPacksDesc')
    },
    {
      title: t('dashboard.totalBanners'),
      value: formatNumber(stats.totalBanners),
      icon: <FiBell size={24} />,
      color: 'bg-pink-500',
      growth: 0,
      description: t('dashboard.totalBannersDesc')
    },
    {
      title: t('dashboard.totalSales'),
      value: '$' + stats.totalSales.toLocaleString(),
      icon: <FiTrendingUp size={24} />,
      color: 'bg-green-600',
      growth: 0,
      description: t('dashboard.totalSalesDesc')
    },
  ];

  return (
    <MainLayout title={t('nav.dashboard')}>
      <div className="space-y-6">
        {/* Header with Time Span Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('dashboard.overview')}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('dashboard.subtitle')}
            </p>
          </div>
          
          {/* Filter UI disabled
          <div className="mt-4 sm:mt-0">
            <div className="flex items-center space-x-2">
              <FiCalendar className="text-gray-500" />
              <select
                value={selectedTimeSpan}
                onChange={(e) => setSelectedTimeSpan(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {timeSpans.map((span) => (
                  <option key={span.value} value={span.value}>
                    {span.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          */}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                    <div className="flex items-baseline mt-2">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : card.value}
                      </h3>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">{card.description}</p>
                  </div>
                  <div className={`${card.color} p-3 rounded-lg text-white flex-shrink-0 ml-4`}>
                    {card.icon}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </MainLayout>
  );
};

export default DashboardPage;