// export default ReportsPage;
'use client';

import { useState, useEffect } from 'react';
import { FiDownload, FiBarChart2, FiUsers, FiDollarSign, FiCalendar, FiEye, FiFilter, FiGrid, FiLayers, FiBell, FiTrendingUp } from 'react-icons/fi';
import { RiQrCodeLine } from 'react-icons/ri';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';
import * as XLSX from 'xlsx';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService } from '@/services/userService';

// Mock data for reports

interface ReportSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  data: any[];
}

interface AlbumReportData {
  albumId: string;
  name: string;
  imageUrl?: string;
  cardCount: number;
  createdAt: string;
  updatedAt?: string;
}

interface CardReportData {
  cardId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  albumName?: string;
  points: number;
  createdAt: string;
}

interface UserReportData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  points: number;
  cardsOwned: number;
  registrationDate: string;
}

interface QRCodeReportData {
  codeId: string;
  qrCode: string;
  cardId: string;
}

interface PackReportData {
  packId: string;
  name: string;
  price: number;
  imageUrl?: string;
  isFeatured: boolean;
  stockNo: string;
  description: string;
  linkedAlbum?: string;
}

interface BannerReportData {
  bannerId: string;
  createdAt: string;
  image?: string;
  url?: string;
}

interface SalesReportData {
  id: string;
  saleId?: string;
  price: number;
  userId?: string;
  refererId?: string;
  createdAt?: string;
  pinned?: boolean;
  pinnedAt?: string | null;
}

interface DashboardStats {
  totalUsers: number;
  totalCards: number;
  totalAlbums: number;
  totalCodes: number;
  totalPacks: number;
  totalBanners: number;
  totalSales: number;
}

const ReportsPage = () => {
  const { t } = useLanguage();
  const [period, setPeriod] = useState('monthly');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [albumFilter, setAlbumFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCards: 0,
    totalAlbums: 0,
    totalCodes: 0,
    totalPacks: 0,
    totalBanners: 0,
    totalSales: 0,
  });
  
  // Report data states
  const [albumsData, setAlbumsData] = useState<AlbumReportData[]>([]);
  const [cardsData, setCardsData] = useState<CardReportData[]>([]);
  const [usersData, setUsersData] = useState<UserReportData[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [codesBatchData, setCodesBatchData] = useState<Array<{ docId: string; cardId: string; codes: string; createdAt: string }>>([]);
  const [codesCampaignData, setCodesCampaignData] = useState<Array<{ docId: string; cardId: string; code: string; createdAt: string; maxUsers: number; usedCount: number }>>([]);
  const [packsData, setPacksData] = useState<PackReportData[]>([]);
  const [bannersData, setBannersData] = useState<BannerReportData[]>([]);
  const [salesData, setSalesData] = useState<SalesReportData[]>([]);
  const [userNameById, setUserNameById] = useState<Record<string, string>>({});
  // Sales filter states
  const [salesSearch, setSalesSearch] = useState('');
  const NO_REFERRER = '__NO_REFERRER__';
  const [referrerFilter, setReferrerFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortKey, setSortKey] = useState<'createdAt' | 'price' | 'saleId'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [serverFilteredSales, setServerFilteredSales] = useState<SalesReportData[] | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadReportData();
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
    const redeemCollectionName = process.env.NEXT_PUBLIC_REDEEM_CODES_COLLECTION || 'redeemcodes';

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
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats for reports:', error);
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

  const loadReportData = async () => {
    setLoading(true);
    try {
      const redeemCollectionName = process.env.NEXT_PUBLIC_REDEEM_CODES_COLLECTION || 'redeemcodes';

      // Load Firestore collections for cross-linking
      const [albumsSnap, cardsSnap, codesSnap, packsSnap, bannersSnap, salesSnap] = await Promise.all([
        getDocs(collection(db, 'albums')),
        getDocs(collection(db, 'cards')),
        getDocs(collection(db, redeemCollectionName)),
        getDocs(collection(db, 'packs')),
        getDocs(collection(db, 'banners')),
        getDocs(collection(db, 'sales')),
      ]);

      // Build album maps for name resolution and card counts
      const albumBasicList = albumsSnap.docs.map((doc) => {
        const data = doc.data() as any;
        const name = data.name || data.albumName || data.title || data.albumId || 'Unknown';
        return { id: doc.id, name };
      });
      const albumNameById: Record<string, string> = albumBasicList.reduce((acc: Record<string, string>, a) => {
        acc[a.id] = a.name || 'Unknown';
        return acc;
      }, {});

      // Helper to normalize Firestore Timestamp/Date/string to ISO string
      const toISO = (value: any): string => {
        if (!value) return '';
        if (value instanceof Date) return value.toISOString();
        if (typeof value?.toDate === 'function') {
          try { return value.toDate().toISOString(); } catch { /* noop */ }
        }
        if (typeof value?.seconds === 'number') {
          return new Date(value.seconds * 1000).toISOString();
        }
        return String(value);
      };

      const albumCardCount: Record<string, number> = {};
      const cardsRaw = cardsSnap.docs.map((doc) => {
        const data = doc.data() as any;
        const albumId = data.albumId || data.albumID || (data.album && (data.album.id || data.album)) || '';
        if (albumId) {
          albumCardCount[albumId] = (albumCardCount[albumId] || 0) + 1;
        }
        const createdAt = toISO(data.createdAt);
        return {
          cardId: data.cardId || data.cardID || doc.id || '',
          name: data.name || '',
          description: data.description || '',
          imageUrl: data.imageUrl || data.imageURL || '',
          albumId,
          points: typeof data.points === 'number' ? data.points : (Number(data.points) || 0),
          createdAt,
        };
      });

      // Map cards with album names
      const cardsWithAlbums: CardReportData[] = cardsRaw.map((c) => ({
        cardId: c.cardId,
        name: c.name,
        description: c.description,
        imageUrl: c.imageUrl,
        albumName: albumNameById[c.albumId || ''] || (c.albumId || undefined),
        points: c.points,
        createdAt: c.createdAt,
      }));
      setCardsData(cardsWithAlbums);

      // Map albums according to Firestore fields shown (albumId, name, image, cardIds, dates)
      const albumsWithStats: AlbumReportData[] = albumsSnap.docs.map((doc) => {
        const data = doc.data() as any;
        const id = doc.id;
        const albumId = data.albumId || id || '';
        const name = data.name || data.albumName || data.title || albumId || 'Unknown';
        const imageUrl = data.image || data.imageUrl || data.imageURL || '';
        const directCardCount = Array.isArray(data.cardIds) ? data.cardIds.length : 0;
        const cardCount = Math.max(albumCardCount[id] || 0, directCardCount);
        const createdAt = toISO(data.createdAt);
        const updatedAt = toISO(data.updatedAt);
        return {
          albumId,
          name,
          imageUrl,
          cardCount,
          createdAt,
          updatedAt,
        };
      });
      setAlbumsData(albumsWithStats);
      setAlbums(albumBasicList);

      // Load real users from Firestore
      const usersWithCards = await userService.getUsers();
      const realUsers: UserReportData[] = usersWithCards.map((u: any) => ({
        id: u.id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        country: u.country || '',
        points: typeof u.points === 'number' ? u.points : 0,
        cardsOwned: Array.isArray(u.cardsOwned)
          ? u.cardsOwned.reduce((sum: number, c: any) => sum + (typeof c.quantity === 'number' ? c.quantity : 1), 0)
          : 0,
        registrationDate: u.dateOfBirth || ''
      }));
      setUsersData(realUsers);
      // Build user name cache for search and referrer labels
      const nameMap: Record<string, string> = {};
      usersWithCards.forEach((u: any) => {
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || u.id;
        nameMap[u.id] = name;
      });
      setUserNameById(nameMap);

      // Load Redeem Codes from Firestore (two types)
      const batchRows: Array<{ docId: string; cardId: string; codes: string; createdAt: string }> = [];
      const campaignRows: Array<{ docId: string; cardId: string; code: string; createdAt: string; maxUsers: number; usedCount: number }> = [];
      codesSnap.docs.forEach((doc) => {
        const data = doc.data() as any;
        const docId = doc.id;
        const cardId = data.cardId || data.cardID || '';
        const createdAt = toISO(data.createdAt);
        const codesArray: string[] = Array.isArray(data.codes) ? data.codes.map((c: any) => String(c)) : [];
        const isCampaign = typeof data.maxUsers === 'number' || Array.isArray(data.usedBy);
        if (isCampaign) {
          const maxUsers: number = typeof data.maxUsers === 'number' ? data.maxUsers : Number(data.maxUsers) || 0;
          const usedCount: number = Array.isArray(data.usedBy) ? data.usedBy.length : (typeof data.usedCount === 'number' ? data.usedCount : 0);
          const code = codesArray.length > 0 ? codesArray[0] : (data.qrCode || data.code || docId || '');
          campaignRows.push({ docId, cardId, code, createdAt, maxUsers, usedCount });
        } else {
          // Batch-type: show all codes as a single comma-separated string
          const codesText = codesArray.length > 0
            ? codesArray.join(', ')
            : (typeof data.codes === 'string' ? data.codes : String(data.qrCode || data.code || ''));
          batchRows.push({ docId, cardId, codes: codesText, createdAt });
        }
      });
      setCodesBatchData(batchRows);
      setCodesCampaignData(campaignRows);

      // Load Packs from Firestore (remove rarity, add imageUrl)
      const packsMapped: PackReportData[] = packsSnap.docs.map((doc) => {
        const data = doc.data() as any;
        return {
          packId: data.packId || doc.id || '',
          name: data.name || '',
          price: typeof data.price === 'number' ? data.price : (Number(data.price) || 0),
          imageUrl: data.image || data.imageUrl || data.imageURL || '',
          isFeatured: !!data.isFeatured,
          stockNo: data.stockNo || '',
          description: data.description || '',
          linkedAlbum: data.linkedAlbum || '',
        };
      });
      setPacksData(packsMapped);

      // Load Banners from Firestore (bannerId, image, url, createdAt)
      const bannersMapped: BannerReportData[] = bannersSnap.docs.map((doc) => {
        const data = doc.data() as any;
        const createdAt = toISO(data.createdAt);
        return {
          bannerId: data.bannerId || doc.id || '',
          createdAt,
          image: data.image || data.imageUrl || data.imageURL || '',
          url: data.url || data.link || '',
        };
      });
      setBannersData(bannersMapped);

      // Load Sales from Firestore
      const salesMapped: SalesReportData[] = salesSnap.docs.map((doc) => {
        const data = doc.data() as any;
        const price = typeof data.price === 'number' ? data.price : Number(data.price) || 0;
        const createdAt = toISO(data.createdAt);
        return {
          id: doc.id,
          saleId: data.saleId || doc.id || '',
          price,
          userId: data.userId || '',
          refererId: data.refererId || '',
          createdAt,
          pinned: !!data.pinned,
          pinnedAt: toISO(data.pinnedAt) || null,
        };
      });
      setSalesData(salesMapped);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Server-side filter for sales on large datasets (date range and referrer)
  const useServerFilters = salesData.length > 1000;
  useEffect(() => {
    const fetchServerFiltered = async () => {
      if (!useServerFilters) { setServerFilteredSales(null); return; }
      if (referrerFilter === NO_REFERRER) { setServerFilteredSales(null); return; }
      try {
        let qRef: any = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));
        if (dateFrom) {
          const from = new Date(dateFrom);
          qRef = query(qRef, where('createdAt', '>=', from));
        }
        if (dateTo) {
          const to = new Date(dateTo);
          qRef = query(qRef, where('createdAt', '<=', to));
        }
        if (referrerFilter) {
          qRef = query(qRef, where('refererId', '==', referrerFilter));
        }
        qRef = query(qRef, limit(1000));
        const snapshot = await getDocs(qRef);
        const rows: SalesReportData[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          const price = typeof data.price === 'number' ? data.price : Number(data.price) || 0;
          const createdAtIso = data.createdAt ? new Date(data.createdAt).toISOString() : '';
          return {
            id: docSnap.id,
            saleId: data.saleId || docSnap.id || '',
            price,
            userId: data.userId || '',
            refererId: data.refererId || '',
            createdAt: createdAtIso,
            pinned: !!data.pinned,
            pinnedAt: (() => {
              const v = data.pinnedAt;
              if (!v) return null;
              if (v instanceof Date) return v.toISOString();
              if (typeof v?.toDate === 'function') {
                try { return v.toDate().toISOString(); } catch { return null; }
              }
              if (typeof v?.seconds === 'number') {
                return new Date(v.seconds * 1000).toISOString();
              }
              return String(v);
            })() || null,
          };
        });
        setServerFilteredSales(rows);
      } catch (err) {
        console.error('Sales server-side filter error:', err);
      }
    };
    fetchServerFiltered();
  }, [useServerFilters, dateFrom, dateTo, referrerFilter]);

  // Filter commented out: show all cards regardless of album
  // const filteredCardsData = albumFilter === 'all' 
  //   ? cardsData 
  //   : cardsData.filter(card => {
  //       const album = albums.find(a => a.name === albumFilter);
  //       return album && card.albumName === album.name;
  //     });
  const filteredCardsData = cardsData;
  const combinedCodesData = [
    ...codesBatchData.map(r => ({ docId: r.docId, cardId: r.cardId, codes: r.codes, type: 'batch', createdAt: r.createdAt })),
    ...codesCampaignData.map(r => ({ docId: r.docId, cardId: r.cardId, code: r.code, type: 'campaign', createdAt: r.createdAt, maxUsers: r.maxUsers, usedCount: r.usedCount })),
  ];

  // Report sections configuration
  const reportSections: ReportSection[] = [
    {
      id: 'albums',
      title: 'Albums Report',
      description: 'Comprehensive album statistics and utilization rates',
      icon: <FiLayers className="w-6 h-6" />,
      count: albumsData.length,
      data: albumsData
    },
    {
      id: 'cards',
      title: 'Cards Report',
      description: 'Detailed card information with album filtering',
      icon: <FiGrid className="w-6 h-6" />,
      count: filteredCardsData.length,
      data: filteredCardsData
    },
    {
      id: 'users',
      title: 'Users Report',
      description: 'User statistics and engagement metrics',
      icon: <FiUsers className="w-6 h-6" />,
      count: usersData.length,
      data: usersData
    },
    {
      id: 'codes',
      title: 'QR Codes Report',
      description: 'Redeem code documents and associated cards',
      icon: <RiQrCodeLine className="w-6 h-6" />,
      count: combinedCodesData.length,
      data: combinedCodesData
    },
    {
      id: 'packs',
      title: 'Packs Report',
      description: 'Pack inventory, pricing, and image details',
      icon: <FiGrid className="w-6 h-6" />,
      count: packsData.length,
      data: packsData
    },
    {
      id: 'banners',
      title: 'Banners Report',
      description: 'Promotional banners and positions',
      icon: <FiBell className="w-6 h-6" />,
      count: bannersData.length,
      data: bannersData
    },
    {
      id: 'sales',
      title: 'Sales Report',
      description: 'Transactions and sales amounts',
      icon: <FiTrendingUp className="w-6 h-6" />,
      count: salesData.length,
      data: salesData
    }
  ];

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    
    // Auto-size columns
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length))
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const handleExport = (format: 'csv' | 'excel', reportId: string) => {
    const section = reportSections.find(s => s.id === reportId);
    if (!section) return;

    const filename = `${section.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    const rowsForExport = reportId === 'sales' ? filteredSalesRows : section.data;
    if (format === 'csv') {
      exportToCSV(rowsForExport, filename);
    } else {
      exportToExcel(rowsForExport, filename);
    }
  };

  // Render detailed report view
  // Build referrer options from current sales
  const referrerOptions = (() => {
    const uniq = new Set<string>();
    const rows = useServerFilters && serverFilteredSales ? serverFilteredSales : salesData;
    rows.forEach((s) => { if (s.refererId) uniq.add(s.refererId); });
    const opts = [
      { id: '', name: 'All Referrers' },
      { id: NO_REFERRER, name: 'No Referrer' },
      ...Array.from(uniq).map((id) => ({ id, name: userNameById[id] || 'Unknown user' }))
    ];
    return opts;
  })();

  // Compute filtered sales rows, sorting pinned first
  const baseSalesRows = useServerFilters && serverFilteredSales ? serverFilteredSales : salesData;
  const filteredSalesRows = (() => {
    let rows = [...baseSalesRows];
    const matchesSearch = (row: SalesReportData): boolean => {
      if (!salesSearch) return true;
      const q = salesSearch.toLowerCase();
      const saleId = String(row.saleId || row.id || '').toLowerCase();
      const userName = userNameById[row.userId || '']?.toLowerCase() || '';
      const refName = userNameById[row.refererId || '']?.toLowerCase() || '';
      return saleId.includes(q) || userName.includes(q) || refName.includes(q);
    };
    rows = rows.filter(matchesSearch);
    // Referrer filter
    if (referrerFilter === NO_REFERRER) {
      rows = rows.filter((r) => !r.refererId);
    } else if (referrerFilter) {
      rows = rows.filter((r) => r.refererId === referrerFilter);
    }
    // Date range
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      rows = rows.filter((r) => {
        const t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        return t >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      rows = rows.filter((r) => {
        const t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        return t <= to;
      });
    }
    // Price range
    if (minAmount) {
      const min = parseFloat(minAmount);
      rows = rows.filter((r) => (r.price ?? 0) >= min);
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      rows = rows.filter((r) => (r.price ?? 0) <= max);
    }
    // Sorting with pinned first
    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1; // pinned first
      if (a.pinned && b.pinned) {
        const aPA = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bPA = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        if (aPA !== bPA) return (bPA - aPA); // newer pinned first
      }
      if (sortKey === 'createdAt') {
        const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return (aT - bT) * dir;
      }
      if (sortKey === 'price') {
        return ((a.price ?? 0) - (b.price ?? 0)) * dir;
      }
      const aId = String(a.saleId || a.id || '');
      const bId = String(b.saleId || b.id || '');
      return aId.localeCompare(bId) * dir;
    });
    return rows;
  })();

  const renderDetailedReport = (reportId: string) => {
    const section = reportSections.find(s => s.id === reportId);
    if (!section) return null;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {section.icon}
            <div>
              <h3 className="text-xl font-semibold">{section.title}</h3>
              <p className="text-gray-600">{section.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv', reportId)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <FiDownload />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('excel', reportId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FiDownload />
              Export Excel
            </button>
            <button
              onClick={() => setSelectedReport(null)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>

        {/* Album filter commented out per request */}
        {/**
        {reportId === 'cards' && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-500" />
              <select
                value={albumFilter}
                onChange={(e) => setAlbumFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Albums</option>
                {albums.map(album => (
                  <option key={album.id} value={album.name}>{album.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        */}

        {/* Filters for Sales report */}
        {reportId === 'sales' && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text"
              value={salesSearch}
              onChange={(e) => setSalesSearch(e.target.value)}
              placeholder="Search by Sale ID, Username, or Referrer"
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={referrerFilter}
              onChange={(e) => setReferrerFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {referrerOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="From Date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="To Date"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min Amount"
              />
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Max Amount"
              />
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="createdAt">Sort by Created Date</option>
                <option value="price">Sort by Price</option>
                <option value="saleId">Sort by Sale ID</option>
              </select>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
              <button
                onClick={() => { setSalesSearch(''); setReferrerFilter(''); setDateFrom(''); setDateTo(''); setMinAmount(''); setMaxAmount(''); setSortKey('createdAt'); setSortDir('desc'); }}
                className="px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                title="Clear Filters"
              >
                Clear Filters
              </button>
            </div>
            <p className="text-xs text-gray-500 col-span-full">Large datasets automatically use server-side filters for date range and referrer.</p>
          </div>
        )}

        {/* Data table(s) */}
        {reportId === 'codes' ? (
          <>
            <h4 className="text-md font-semibold mb-2">Batch Redeem Codes</h4>
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {(() => {
                      const headers = codesBatchData.length > 0 ? Object.keys(codesBatchData[0]) : [];
                      return headers.map(key => (
                        <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </th>
                      ));
                    })()}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {codesBatchData.map((row, index) => {
                    const headers = Object.keys(row);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        {headers.map((key, cellIndex) => {
                          const value = (row as any)[key];
                          const isNumber = typeof value === 'number' && value % 1 !== 0;
                          const printable = isNumber ? value.toFixed(2) : String(value ?? '');
                          const keyLower = key.toLowerCase();
                          const isImageUrlField = keyLower === 'imageurl' || keyLower === 'image' || keyLower === 'imgurl';
                          const isCodesField = keyLower === 'codes';
                          return (
                            <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {isImageUrlField ? (
                                <span className="truncate max-w-[10ch] block" title={String(value ?? '')}>{printable}</span>
                              ) : isCodesField ? (
                                <span className="truncate max-w-[30ch] block" title={String(value ?? '')}>{printable}</span>
                              ) : (
                                printable
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h4 className="text-md font-semibold mb-2">Campaign Redeem Codes</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {(() => {
                      const headers = codesCampaignData.length > 0 ? Object.keys(codesCampaignData[0]) : [];
                      return headers.map(key => (
                        <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </th>
                      ));
                    })()}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {codesCampaignData.map((row, index) => {
                    const headers = Object.keys(row);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        {headers.map((key, cellIndex) => {
                          const value = (row as any)[key];
                          const isNumber = typeof value === 'number' && value % 1 !== 0;
                          const printable = isNumber ? value.toFixed(2) : String(value ?? '');
                          const keyLower = key.toLowerCase();
                          const isImageUrlField = keyLower === 'imageurl' || keyLower === 'image' || keyLower === 'imgurl';
                          return (
                            <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {isImageUrlField ? (
                                <span className="truncate max-w-[10ch] block" title={String(value ?? '')}>{printable}</span>
                              ) : (
                                printable
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {(() => {
                    const rows = reportId === 'sales' ? filteredSalesRows : section.data;
                    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
                    let displayedKeys = section.id === 'cards'
                      ? headers.filter(k => k.toLowerCase() !== 'albumname')
                      : headers;
                    if (reportId === 'sales') {
                      const hideReferrer = rows.length > 0 && rows.every((r: any) => {
                        const refId = String(r?.refererId || '').trim();
                        const refName = refId ? (userNameById[refId] || '') : '';
                        return !refId && !refName;
                      });
                      if (hideReferrer) {
                        displayedKeys = displayedKeys.filter(k => {
                          const kl = k.toLowerCase();
                          return kl !== 'refererid' && kl !== 'referrername' && kl !== 'referrerusername';
                        });
                      }
                    }
                    return displayedKeys.map(key => (
                      <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </th>
                    ));
                  })()}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(reportId === 'sales' ? filteredSalesRows : section.data).map((row, index) => {
                  const headers = Object.keys(row);
                  let displayedKeys = section.id === 'cards'
                    ? headers.filter(k => k.toLowerCase() !== 'albumname')
                    : headers;
                  if (reportId === 'sales') {
                    const hideReferrer = (() => {
                      const refId = String((row as any)?.refererId || '').trim();
                      const refName = refId ? (userNameById[refId] || '') : '';
                      return !refId && !refName;
                    })();
                    if (hideReferrer) {
                      displayedKeys = displayedKeys.filter(k => {
                        const kl = k.toLowerCase();
                        return kl !== 'refererid' && kl !== 'referrername' && kl !== 'referrerusername';
                      });
                    }
                  }
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      {displayedKeys.map((key, cellIndex) => {
                        const value = (row as any)[key];
                        const isNumber = typeof value === 'number' && value % 1 !== 0;
                        const printable = isNumber ? value.toFixed(2) : String(value ?? '');
                        const keyLower = key.toLowerCase();
                        const isImageUrlField = keyLower === 'imageurl' || keyLower === 'image' || keyLower === 'imgurl';
                        return (
                          <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isImageUrlField ? (
                              <span className="truncate max-w-[10ch] block" title={String(value ?? '')}>{printable}</span>
                            ) : (
                              printable
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Removed mock charts and mock datasets; page relies on Firestore data only.
  
  if (selectedReport) {
    return (
      <MainLayout title={`${t('reports.title')} - Detailed View`}>
        <div className="p-6">
          {renderDetailedReport(selectedReport)}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t('reports.title')}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">{t('reports.daily')}</option>
                <option value="weekly">{t('reports.weekly')}</option>
                <option value="monthly">{t('reports.monthly')}</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">{t('reports.yearly')}</option>
              </select>
              <FiCalendar className="absolute right-3 top-2.5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Dashboard-style Tiles with Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[
            { id: 'users', title: t('dashboard.totalUsers'), value: formatNumber(stats.totalUsers), icon: <FiUsers size={24} />, color: 'bg-blue-500', description: t('dashboard.totalUsersDesc'), reportId: 'users' },
            { id: 'cards', title: t('dashboard.totalCards'), value: formatNumber(stats.totalCards), icon: <FiGrid size={24} />, color: 'bg-purple-500', description: t('dashboard.totalCardsDesc'), reportId: 'cards' },
            { id: 'albums', title: t('dashboard.totalAlbums'), value: formatNumber(stats.totalAlbums), icon: <FiBarChart2 size={24} />, color: 'bg-indigo-500', description: t('dashboard.totalAlbumsDesc'), reportId: 'albums' },
            { id: 'codes', title: t('dashboard.totalQrCodes'), value: formatNumber(stats.totalCodes), icon: <RiQrCodeLine size={24} />, color: 'bg-yellow-500', description: t('dashboard.totalQrCodesDesc'), reportId: 'codes' },
            { id: 'packs', title: t('dashboard.totalPacks'), value: formatNumber(stats.totalPacks), icon: <FiGrid size={24} />, color: 'bg-teal-500', description: t('dashboard.totalPacksDesc'), reportId: 'packs' },
            { id: 'banners', title: t('dashboard.totalBanners'), value: formatNumber(stats.totalBanners), icon: <FiBell size={24} />, color: 'bg-pink-500', description: t('dashboard.totalBannersDesc'), reportId: 'banners' },
            { id: 'sales', title: t('dashboard.totalSales'), value: '$' + stats.totalSales.toLocaleString(), icon: <FiTrendingUp size={24} />, color: 'bg-green-600', description: t('dashboard.totalSalesDesc'), reportId: 'sales' },
          ].map((card) => (
            <div key={card.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
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
                {/* Actions mirroring report tiles when applicable */}
                {card.reportId && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setSelectedReport(card.reportId!)}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                    >
                      <FiEye />
                      View Details
                    </button>
                    <button
                      onClick={() => handleExport('csv', card.reportId!)}
                      className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700 text-sm"
                      title="Export as CSV"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => handleExport('excel', card.reportId!)}
                      className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-700 text-sm"
                      title="Export as Excel"
                    >
                      XLS
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Removed secondary Report Sections grid per request */}
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
