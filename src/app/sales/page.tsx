// 'use client';

// import React, { useState, useEffect, useMemo } from 'react';
// import MainLayout from '@/components/layout/MainLayout';
// import { useLanguage } from '@/context/LanguageContext';
// import { FiDownload, FiSearch, FiRefreshCw, FiAlertCircle, FiTrash, FiStar } from 'react-icons/fi';
// import * as XLSX from 'xlsx';
// import { db, auth } from '@/lib/firebase';
// import {
//   collection,
//   query,
//   orderBy,
//   limit,
//   onSnapshot,
//   getDocs,
//   startAfter,
//   doc,
//   getDoc,
//   Timestamp,
//   DocumentSnapshot,
//   where,
//   updateDoc,
//   deleteDoc,
//   addDoc,
//   serverTimestamp,
// } from 'firebase/firestore';
// import { onAuthStateChanged, User } from 'firebase/auth';

// // Firestore sale document shape
// interface FirestoreSale {
//   createdAt: Timestamp | string | number;
//   price: number | string;
//   refererId: string;
//   saleId: string;
//   userId: string;
//   pinned?: boolean;
//   pinnedAt?: Timestamp | string | number | null;
// }

// interface SaleRow {
//   id: string; // Firestore doc id
//   createdAt: Date;
//   price: number;
//   refererId: string;
//   saleId: string;
//   userId: string;
//   pinned: boolean;
//   pinnedAt: Date | null;
// }

// const SalesPage = () => {
//   const { t } = useLanguage();
//   const [authUser, setAuthUser] = useState<User | null>(null);
//   const [sales, setSales] = useState<SaleRow[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [currentPage, setCurrentPage] = useState(1);
//   const [salesPerPage] = useState(10);
//   const [sortKey, setSortKey] = useState<'createdAt' | 'price' | 'saleId'>('createdAt');
//   const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
//   const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
//   const [batchSize, setBatchSize] = useState<number>(100); // real-time window size
//   const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
//   const userCache = useMemo(() => new Map<string, string>(), []);
//   const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
//   const [nameCacheTick, setNameCacheTick] = useState<number>(0);
//   // Referrer filter constants
//   const NO_REFERRER = '__NO_REFERRER__';
//   // Filter UI and server-side filtering states
//   const [referrerFilter, setReferrerFilter] = useState<string>('');
//   const [filterLoading, setFilterLoading] = useState<boolean>(false);
//   const [useServerFilters, setUseServerFilters] = useState<boolean>(false);
//   const [serverFilteredSales, setServerFilteredSales] = useState<SaleRow[] | null>(null);
//   const serverFilterThreshold = 500;
//   // Selection and actions
//   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
//   const [actionLoading, setActionLoading] = useState<boolean>(false);
//   const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
//   // Filter states
//   const [filters, setFilters] = useState({
//     dateFrom: '',
//     dateTo: '',
//     amountMin: '',
//     amountMax: ''
//   });

//   // Auth awareness (friendly errors if rules require auth)
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => setAuthUser(u));
//     return () => unsub();
//   }, []);

//   // Real-time subscription to latest sales (ordered by createdAt desc)
//   useEffect(() => {
//     setLoading(true);
//     setError(null);
//     try {
//       const q = query(
//         collection(db, 'sales'),
//         orderBy('createdAt', 'desc'),
//         limit(batchSize)
//       );
//       const unsub = onSnapshot(
//         q,
//         (snapshot) => {
//           const rows: SaleRow[] = [];
//           snapshot.forEach((docSnap) => {
//             const data = docSnap.data() as FirestoreSale;
//             const created = normalizeToDate(data.createdAt) || new Date(0);
//             const priceNum = normalizeToNumber(data.price) ?? 0;
//             // Require minimal mandatory fields
//             if (!data.saleId || !data.userId) {
//               console.warn('Skipping sale missing saleId/userId:', { id: docSnap.id, data });
//               return; // skip if identifiers are missing
//             }
//             rows.push({
//               id: docSnap.id,
//               createdAt: created,
//               price: priceNum,
//               refererId: data.refererId || '',
//               saleId: data.saleId,
//               userId: data.userId,
//               pinned: Boolean(data.pinned),
//               pinnedAt: data.pinnedAt ? normalizeToDate(data.pinnedAt) : null,
//             });
//           });
//           setSales(rows);
//           setLastDoc(snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null);
//           setLoading(false);
//         },
//         async (err) => {
//           console.error('Sales subscription error:', err);
//           // Fallback: attempt a one-time snapshot so page still renders data
//           try {
//             const fallbackSnap = await getDocs(q);
//             const rows: SaleRow[] = fallbackSnap.docs.map((docSnap) => {
//               const data = docSnap.data() as FirestoreSale;
//               return {
//                 id: docSnap.id,
//                 createdAt: normalizeToDate(data.createdAt) || new Date(0),
//                 price: normalizeToNumber(data.price) ?? 0,
//                 refererId: data.refererId || '',
//                 saleId: data.saleId || '',
//                 userId: data.userId || '',
//                 pinned: Boolean(data.pinned),
//                 pinnedAt: data.pinnedAt ? normalizeToDate(data.pinnedAt) : null,
//               };
//             });
//             setSales(rows);
//             setLastDoc(fallbackSnap.docs.length ? fallbackSnap.docs[fallbackSnap.docs.length - 1] : null);
//             setError('Real-time updates unavailable. Showing latest snapshot.');
//           } catch (fallbackErr) {
//             console.error('Fallback snapshot failed:', fallbackErr);
//             setError('Unable to load sales. Check your network or authentication.');
//           } finally {
//             setLoading(false);
//           }
//         }
//       );
//       return () => unsub();
//     } catch (e) {
//       console.error('Sales subscription initialization failed:', e);
//       setError('Failed to initialize real-time sales feed.');
//       setLoading(false);
//     }
//   }, [batchSize]);

//   // Refresh action: re-fetch latest batch and reset pagination
//   const refresh = async () => {
//     setIsRefreshing(true);
//     setError(null);
//     try {
//       const q = query(
//         collection(db, 'sales'),
//         orderBy('createdAt', 'desc'),
//         limit(batchSize)
//       );
//       const snapshot = await getDocs(q);
//       const rows: SaleRow[] = snapshot.docs.map((docSnap) => {
//         const data = docSnap.data() as FirestoreSale;
//         return {
//           id: docSnap.id,
//           createdAt: normalizeToDate(data.createdAt) || new Date(0),
//           price: normalizeToNumber(data.price) ?? 0,
//           refererId: data.refererId || '',
//           saleId: data.saleId || '',
//           userId: data.userId || '',
//           pinned: Boolean(data.pinned),
//           pinnedAt: data.pinnedAt ? normalizeToDate(data.pinnedAt) : null,
//         };
//       });
//       setSales(rows);
//       setLastDoc(snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null);
//       setCurrentPage(1);
//     } catch (e) {
//       console.error('Refresh failed:', e);
//       setError('Refresh failed. Please check your connection.');
//     } finally {
//       setIsRefreshing(false);
//     }
//   };

//   // Auto-enable server-side filtering for large datasets
//   useEffect(() => {
//     setUseServerFilters(sales.length > serverFilterThreshold);
//   }, [sales.length]);

//   // Selection helpers
//   const isSelected = (id: string) => selectedIds.has(id);
//   const clearSelection = () => setSelectedIds(new Set());
//   const toggleRowSelect = (id: string) => {
//     setSelectedIds((prev) => {
//       const next = new Set(prev);
//       if (next.has(id)) next.delete(id);
//       else next.add(id);
//       return next;
//     });
//   };

//   // Client-side sorting & filtering for the current batch
//   const filteredSales = useMemo(() => {
//     // Use server results when enabled and available
//     let result = useServerFilters && serverFilteredSales ? [...serverFilteredSales] : [...sales];
//     // Search by saleId or username/referrer name (cached)
//     if (searchTerm) {
//       const term = searchTerm.toLowerCase();
//       const nameContains = (id: string, t: string) => {
//         const cached = (userCache.get(id) || '').toLowerCase();
//         return cached.includes(t) || id.toLowerCase().includes(t);
//       };
//       result = result.filter((s) =>
//         s.saleId.toLowerCase().includes(term) ||
//         nameContains(s.userId, term) ||
//         nameContains(s.refererId, term)
//       );
//     }
//     // Referrer filter
//     if (referrerFilter) {
//       if (referrerFilter === NO_REFERRER) {
//         result = result.filter((s) => !s.refererId);
//       } else {
//         result = result.filter((s) => s.refererId === referrerFilter);
//       }
//     }
//     // Date filters
//     if (filters.dateFrom) {
//       const from = new Date(filters.dateFrom);
//       result = result.filter((s) => s.createdAt >= from);
//     }
//     if (filters.dateTo) {
//       const to = new Date(filters.dateTo);
//       result = result.filter((s) => s.createdAt <= to);
//     }
//     // Amount filters
//     if (filters.amountMin) {
//       const min = parseFloat(filters.amountMin);
//       result = result.filter((s) => s.price >= min);
//     }
//     if (filters.amountMax) {
//       const max = parseFloat(filters.amountMax);
//       result = result.filter((s) => s.price <= max);
//     }

//     // Sorting (pinned items first, then chosen sort key)
//     result.sort((a, b) => {
//       const dir = sortDir === 'asc' ? 1 : -1;
//       if (a.pinned !== b.pinned) {
//         return a.pinned ? -1 : 1; // pinned first
//       }
//       if (a.pinned && b.pinned) {
//         const aPA = a.pinnedAt ? a.pinnedAt.getTime() : 0;
//         const bPA = b.pinnedAt ? b.pinnedAt.getTime() : 0;
//         if (aPA !== bPA) return (bPA - aPA); // newer pinned first
//       }
//       if (sortKey === 'createdAt') {
//         return (a.createdAt.getTime() - b.createdAt.getTime()) * dir;
//       }
//       if (sortKey === 'price') {
//         return (a.price - b.price) * dir;
//       }
//       return a.saleId.localeCompare(b.saleId) * dir;
//     });

//     return result;
//   }, [sales, serverFilteredSales, useServerFilters, searchTerm, filters, sortKey, sortDir, nameCacheTick, referrerFilter]);

//   // Pagination
//   const indexOfLastSale = currentPage * salesPerPage;
//   const indexOfFirstSale = indexOfLastSale - salesPerPage;
//   const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);
//   const totalPages = Math.ceil(filteredSales.length / salesPerPage) || 1;
//   const allCurrentSelected = useMemo(() => currentSales.every((s) => selectedIds.has(s.id)) && currentSales.length > 0, [currentSales, selectedIds]);

//   const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

//   // Batch prefetch usernames for IDs visible on current page (optimizes lookups)
//   useEffect(() => {
//     const ids = new Set<string>();
//     currentSales.forEach((s) => {
//       if (s.userId) ids.add(s.userId);
//       if (s.refererId) ids.add(s.refererId);
//     });
//     const missing = [...ids].filter((id) => !userCache.has(id) && !resolvingIds.has(id));
//     if (missing.length === 0) return;
//     // Resolve in parallel using existing resolver (which caches results)
//     Promise.all(missing.map((id) => getUserName(id))).then(() => {
//       setNameCacheTick((n) => n + 1);
//     });
//   }, [currentSales, resolvingIds]);

//   // Handle search
//   const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setSearchTerm(e.target.value);
//   };

//   // Handle filter changes
//   const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFilters(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   // Handle referrer selection
//   const handleReferrerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const val = e.target.value;
//     setReferrerFilter(val);
//   };

//   // Clear filters
//   const clearFilters = () => {
//     setFilters({
//       dateFrom: '',
//       dateTo: '',
//       amountMin: '',
//       amountMax: ''
//     });
//     setReferrerFilter('');
//     setServerFilteredSales(null);
//     setSearchTerm('');
//   };

//   // Server-side filter fetch for large datasets (date range and referrer only)
//   useEffect(() => {
//     const fetchServerFiltered = async () => {
//       if (!useServerFilters) {
//         setServerFilteredSales(null);
//         return;
//       }
//       // We cannot query for missing referrerId reliably; fallback to client for NO_REFERRER
//       if (referrerFilter === NO_REFERRER) {
//         setServerFilteredSales(null);
//         return;
//       }
//       try {
//         setFilterLoading(true);
//         let qRef = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));
//         if (filters.dateFrom) {
//           const from = new Date(filters.dateFrom);
//           qRef = query(qRef, where('createdAt', '>=', from));
//         }
//         if (filters.dateTo) {
//           const to = new Date(filters.dateTo);
//           qRef = query(qRef, where('createdAt', '<=', to));
//         }
//         if (referrerFilter) {
//           qRef = query(qRef, where('refererId', '==', referrerFilter));
//         }
//         // Limit to a reasonable page size for performance
//         qRef = query(qRef, limit(batchSize));
//         const snapshot = await getDocs(qRef);
//         const rows: SaleRow[] = snapshot.docs.map((docSnap) => {
//           const data = docSnap.data() as FirestoreSale;
//           return {
//             id: docSnap.id,
//             createdAt: normalizeToDate(data.createdAt) || new Date(0),
//             price: normalizeToNumber(data.price) ?? 0,
//             refererId: data.refererId || '',
//             saleId: data.saleId || '',
//             userId: data.userId || '',
//             pinned: Boolean(data.pinned),
//             pinnedAt: data.pinnedAt ? normalizeToDate(data.pinnedAt) : null,
//           };
//         });
//         setServerFilteredSales(rows);
//       } catch (e) {
//         console.error('Server-side filter failed:', e);
//         setServerFilteredSales(null);
//       } finally {
//         setFilterLoading(false);
//       }
//     };
//     fetchServerFiltered();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [useServerFilters, filters.dateFrom, filters.dateTo, referrerFilter, batchSize]);

//   // Referrer options (All, No Referrer, plus unique referrer IDs from current sales)
//   const referrerOptions = useMemo(() => {
//     const uniq = new Set<string>();
//     sales.forEach((s) => { if (s.refererId) uniq.add(s.refererId); });
//     const opts = [
//       { id: '', name: 'All Referrers' },
//       { id: NO_REFERRER, name: 'No Referrer' },
//       ...[...uniq].map((id) => ({ id, name: userCache.get(id) || 'Unknown user' }))
//     ];
//     // Sort by name, keep All at top
//     return [opts[0], ...opts.slice(1).sort((a, b) => a.name.localeCompare(b.name))];
//   }, [sales, userCache, nameCacheTick]);

//   // Delete selected sales with confirmation and audit log
//   const deleteSelectedSales = async () => {
//     if (selectedIds.size === 0) return;
//     const ok = window.confirm(`Delete ${selectedIds.size} selected sale(s)? This cannot be undone.`);
//     if (!ok) return;
//     setActionLoading(true);
//     try {
//       const ids = Array.from(selectedIds);
//       let success = 0;
//       let failed = 0;
//       await Promise.all(ids.map(async (id) => {
//         try {
//           const ref = doc(db, 'sales', id);
//           const snap = await getDoc(ref);
//           const saleData = snap.exists() ? snap.data() : null;
//           await deleteDoc(ref);
//           await addDoc(collection(db, 'auditLogs'), {
//             action: 'delete',
//             saleId: id,
//             byUid: authUser?.uid || null,
//             at: serverTimestamp(),
//             sale: saleData,
//           });
//           success++;
//         } catch (e) {
//           console.error('Delete failed for', id, e);
//           failed++;
//         }
//       }));
//       // Optimistically update UI
//       setSales((prev) => prev.filter((s) => !selectedIds.has(s.id)));
//       clearSelection();
//       setActionMessage({ type: failed ? 'error' : 'success', text: failed ? `Deleted ${success} sale(s), ${failed} failed.` : `Deleted ${success} sale(s).` });
//     } finally {
//       setActionLoading(false);
//       setTimeout(() => setActionMessage(null), 3000);
//     }
//   };

//   // Pin/Unpin selected items (toggle per item), persist to Firestore
//   const togglePinSelected = async () => {
//     if (selectedIds.size === 0) return;
//     setActionLoading(true);
//     try {
//       const ids = Array.from(selectedIds);
//       let pinnedCount = 0;
//       let unpinnedCount = 0;
//       await Promise.all(ids.map(async (id) => {
//         const sale = sales.find((s) => s.id === id);
//         if (!sale) return;
//         try {
//           const ref = doc(db, 'sales', id);
//           if (sale.pinned) {
//             await updateDoc(ref, { pinned: false, pinnedAt: null });
//             unpinnedCount++;
//           } else {
//             await updateDoc(ref, { pinned: true, pinnedAt: serverTimestamp() });
//             pinnedCount++;
//           }
//         } catch (e) {
//           console.error('Pin toggle failed for', id, e);
//         }
//       }));
//       setActionMessage({ type: 'success', text: `Pinned ${pinnedCount}, unpinned ${unpinnedCount}.` });
//     } finally {
//       setActionLoading(false);
//       setTimeout(() => setActionMessage(null), 3000);
//     }
//   };

//   // Export functions (based on Firestore fields)
//   const exportToExcel = () => {
//     const exportData = filteredSales.map((sale, idx) => ({
//       'Sr#': idx + 1,
//       'Sale ID': sale.saleId,
//       'Username': userCache.get(sale.userId) || 'Unknown user',
//       'Referer Name': sale.refererId ? (userCache.get(sale.refererId) || 'Unknown user') : 'No Referrer',
//       'Created At': formatDate(sale.createdAt),
//       'Price': sale.price,
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(exportData);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');
    
//     // Generate filename with current date
//     const date = new Date().toISOString().split('T')[0];
//     XLSX.writeFile(workbook, `sales-report-${date}.xlsx`);
//   };

//   const exportToCSV = () => {
//     const exportData = filteredSales.map((sale, idx) => ({
//       'Sr#': idx + 1,
//       'Sale ID': sale.saleId,
//       'Username': userCache.get(sale.userId) || 'Unknown user',
//       'Referer Name': sale.refererId ? (userCache.get(sale.refererId) || 'Unknown user') : 'No Referrer',
//       'Created At': formatDate(sale.createdAt),
//       'Price': sale.price,
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(exportData);
//     const csv = XLSX.utils.sheet_to_csv(worksheet);
    
//     // Create and download CSV file
//     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//     const link = document.createElement('a');
//     const url = URL.createObjectURL(blob);
//     link.setAttribute('href', url);
    
//     // Generate filename with current date
//     const date = new Date().toISOString().split('T')[0];
//     link.setAttribute('download', `sales-report-${date}.csv`);
//     link.style.visibility = 'hidden';
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   // Format date
//   const formatDate = (date: Date) => {
//     return date.toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   // Format currency
//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD'
//     }).format(amount);
//   };

//   // Helper: normalize Firestore timestamp/string/number to Date
//   function normalizeToDate(value: Timestamp | string | number | undefined): Date | null {
//     try {
//       if (!value) return null;
//       // Prefer using toDate() when available (robust for Firestore Timestamp)
//       if (typeof (value as any)?.toDate === 'function') {
//         return (value as any).toDate();
//       }
//       if (value instanceof Timestamp) return value.toDate();
//       if (typeof value === 'number') {
//         const d = new Date(value);
//         return isNaN(d.getTime()) ? null : d;
//       }
//       if (typeof value === 'string') {
//         // Try native parsing first
//         let parsed = new Date(value);
//         if (!isNaN(parsed.getTime())) return parsed;

//         // Handle Firestore console-like strings: "October 29, 2025 at 11:06:07 PM UTC+5"
//         const re = /^([A-Za-z]+ \d{1,2}, \d{4}) at (\d{1,2}:\d{2}:\d{2} [AP]M) UTC([+-]\d{1,2})$/;
//         const m = re.exec(value);
//         if (m) {
//           const [, datePart, timePart, offset] = m;
//           const candidate = `${datePart} ${timePart} GMT${offset}`; // GMT offset is parseable
//           parsed = new Date(candidate);
//           if (!isNaN(parsed.getTime())) return parsed;
//         }
//       }
//       return null;
//     } catch (e) {
//       console.warn('normalizeToDate failed:', e, value);
//       return null;
//     }
//   }

//   // Helper: normalize numeric-like values to number
//   function normalizeToNumber(value: number | string | undefined): number | null {
//     if (value === undefined || value === null) return null;
//     const n = typeof value === 'string' ? parseFloat(value) : value;
//     return isNaN(n as number) ? null : Number(n);
//   }

//   // Resolve user names with caching
//   const getUserName = async (id: string): Promise<string> => {
//     if (!id) return 'Unknown user';
//     const cached = userCache.get(id);
//     if (cached) return cached;
//     setResolvingIds((prev) => {
//       if (prev.has(id)) return prev;
//       const next = new Set(prev);
//       next.add(id);
//       return next;
//     });
//     try {
//       const snap = await getDoc(doc(db, 'users', id));
//       if (!snap.exists()) {
//         userCache.set(id, 'Unknown user');
//         return 'Unknown user';
//       }
//       const data = snap.data() as any;
//       const name = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || 'Unknown user';
//       userCache.set(id, name);
//       return name;
//     } catch (e) {
//       console.error('Failed to resolve user name for', id, e);
//       userCache.set(id, 'Unknown user');
//       return 'Unknown user';
//     } finally {
//       setResolvingIds((prev) => {
//         const next = new Set(prev);
//         next.delete(id);
//         return next;
//       });
//     }
//   };

//   return (
//     <MainLayout title="Sales Report">
//       <div className="space-y-6">
//         {/* Header */}
//       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//         <div>
//           <h1 className="text-2xl font-bold text-primary">Sales Report</h1>
//           <p className="text-muted mt-1">Manage and view all sales transactions</p>
//           {/* Applied filters summary */}
//           <div className="flex flex-wrap gap-2 mt-2">
//             {referrerFilter && (
//               <span className="inline-flex items-center px-2 py-1 text-xs bg-card-hover border border-border rounded">
//                 Referrer: {referrerFilter === NO_REFERRER ? 'No Referrer' : (userCache.get(referrerFilter) || 'Unknown user')}
//               </span>
//             )}
//             {filters.dateFrom && (
//               <span className="inline-flex items-center px-2 py-1 text-xs bg-card-hover border border-border rounded">
//                 From: {filters.dateFrom}
//               </span>
//             )}
//             {filters.dateTo && (
//               <span className="inline-flex items-center px-2 py-1 text-xs bg-card-hover border border-border rounded">
//                 To: {filters.dateTo}
//               </span>
//             )}
//             {filterLoading && (
//               <span className="inline-flex items-center px-2 py-1 text-xs text-muted">
//                 Filtering...
//               </span>
//             )}
//             {actionMessage && (
//               <span className={`inline-flex items-center px-2 py-1 text-xs border rounded ${actionMessage.type === 'success' ? 'border-green-500 text-green-700 bg-green-50' : 'border-red-500 text-red-700 bg-red-50'}`}>
//                 {actionMessage.text}
//               </span>
//             )}
//           </div>
//         </div>

//           {/* Actions moved next to search bar below */}
//         </div>

//         {/* Error banner */}
//         {error && (
//           <div className="flex items-center gap-2 p-3 border border-red-200 bg-red-50 text-red-700 rounded-lg">
//             <FiAlertCircle size={18} />
//             <span>{error}</span>
//             {!authUser && <span className="ml-2">Sign in may be required.</span>}
//           </div>
//         )}

//         {/* Search and Actions Bar */}
//         <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
//           <div className="relative flex-1 max-w-md">
//             <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
//             <input
//               type="text"
//               placeholder="Search by Sale ID or Username..."
//               value={searchTerm}
//               onChange={handleSearch}
//               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div className="flex items-center gap-2">
//             <button
//               onClick={exportToExcel}
//               className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
//             >
//               <FiDownload size={18} />
//               <span>Export Excel</span>
//             </button>
//             <button
//               onClick={exportToCSV}
//               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
//             >
//               <FiDownload size={18} />
//               <span>Export CSV</span>
//             </button>
//             <button
//               onClick={refresh}
//               disabled={isRefreshing}
//               className="bg-gray-100 hover:bg-card-hover text-primary px-4 py-2 rounded-lg flex items-center space-x-2 border border-border transition-colors font-medium disabled:opacity-50"
//             >
//               <FiRefreshCw className={isRefreshing ? 'animate-spin' : ''} size={18} />
//               <span>Refresh</span>
//             </button>
//             <button
//               onClick={deleteSelectedSales}
//               disabled={selectedIds.size === 0 || actionLoading}
//               aria-label="Delete selected"
//               className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium disabled:opacity-50"
//             >
//               <FiTrash size={18} />
//               <span>Delete Selected</span>
//             </button>
//             <button
//               onClick={togglePinSelected}
//               disabled={selectedIds.size === 0 || actionLoading}
//               aria-label="Pin or unpin selected"
//               className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium disabled:opacity-50"
//             >
//               <FiStar size={18} />
//               <span>Pin/Unpin</span>
//             </button>
//           </div>
//         </div>

//         {/* Sales Table */}
//         <div className="bg-white rounded-lg shadow overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-blue-50">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     <input
//                       type="checkbox"
//                       aria-label="Select all on page"
//                       checked={allCurrentSelected}
//                       onChange={(e) => {
//                         if (e.target.checked) {
//                           setSelectedIds((prev) => {
//                             const next = new Set(prev);
//                             currentSales.forEach((s) => next.add(s.id));
//                             return next;
//                           });
//                         } else {
//                           setSelectedIds((prev) => {
//                             const next = new Set(prev);
//                             currentSales.forEach((s) => next.delete(s.id));
//                             return next;
//                           });
//                         }
//                       }}
//                     />
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Sr#
//                   </th>
//                   <th
//                     className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
//                     onClick={() => {
//                       setSortKey('saleId');
//                       setSortDir(sortKey === 'saleId' && sortDir === 'asc' ? 'desc' : 'asc');
//                     }}
//                   >
//                     Sale ID {sortKey === 'saleId' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Username
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Referer Name
//                   </th>
//                   <th
//                     className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
//                     onClick={() => {
//                       setSortKey('createdAt');
//                       setSortDir(sortKey === 'createdAt' && sortDir === 'asc' ? 'desc' : 'asc');
//                     }}
//                   >
//                     Created At {sortKey === 'createdAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
//                   </th>
//                   <th
//                     className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
//                     onClick={() => {
//                       setSortKey('price');
//                       setSortDir(sortKey === 'price' && sortDir === 'asc' ? 'desc' : 'asc');
//                     }}
//                   >
//                     Price {sortKey === 'price' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {loading ? (
//                   <tr>
//                     <td colSpan={7} className="px-6 py-10 text-center text-gray-500">Loading sales...</td>
//                   </tr>
//                 ) : currentSales.length === 0 ? (
//                   <tr>
//                     <td colSpan={7} className="px-6 py-10 text-center text-gray-500">No sales found for current filters.</td>
//                   </tr>
//                 ) : (
//                   currentSales.map((sale, idx) => (
//                     <tr key={sale.id} className={`hover:bg-gray-50 transition-colors ${isSelected(sale.id) ? 'bg-blue-50' : ''}`} aria-selected={isSelected(sale.id)}>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <input
//                           type="checkbox"
//                           aria-label={`Select sale ${sale.saleId}`}
//                           checked={isSelected(sale.id)}
//                           onChange={() => toggleRowSelect(sale.id)}
//                         />
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                         {indexOfFirstSale + idx + 1}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
//                           {sale.saleId}
//                           {sale.pinned && <FiStar aria-label="Pinned" className="text-yellow-500" />}
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm text-gray-500">
//                           {resolvingIds.has(sale.userId) ? 'Resolving…' : ''}
//                           {!resolvingIds.has(sale.userId) && (
//                             <AsyncName id={sale.userId} getUserName={getUserName} />
//                           )}
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm text-gray-500">
//                           {sale.refererId ? (
//                             resolvingIds.has(sale.refererId) ? 'Resolving…' : (
//                               <AsyncName id={sale.refererId} getUserName={getUserName} />
//                             )
//                           ) : (
//                             'No Referrer'
//                           )}
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm text-gray-900">{formatDate(sale.createdAt)}</div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm font-semibold text-green-600">{formatCurrency(sale.price)}</div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* Pagination */}
//         {totalPages > 1 && (
//           <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
//             <div className="flex items-center text-sm text-gray-700">
//               <span>
//                 Showing {indexOfFirstSale + 1} to {Math.min(indexOfLastSale, filteredSales.length)} of {filteredSales.length} results
//               </span>
//             </div>
//             <div className="flex items-center space-x-2">
//               <button
//                 onClick={() => paginate(currentPage - 1)}
//                 disabled={currentPage === 1}
//                 className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 Previous
//               </button>
//               <button
//                 onClick={() => paginate(currentPage + 1)}
//                 disabled={currentPage === totalPages}
//                 className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//               >
//                 Next
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </MainLayout>
//   );
// };

// export default SalesPage;

// // Lightweight component to display names with async resolution
// function AsyncName({ id, getUserName }: { id: string; getUserName: (id: string) => Promise<string> }) {
//   const [name, setName] = React.useState<string>('Resolving…');
//   useEffect(() => {
//     let mounted = true;
//     getUserName(id).then((n) => {
//       if (mounted) setName(n);
//     });
//     return () => {
//       mounted = false;
//     };
//   }, [id]);
//   return <span>{name}</span>;
// }

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';
import { FiDownload, FiSearch, FiFilter, FiCalendar, FiDollarSign, FiRefreshCw, FiAlertCircle, FiTrash, FiStar } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  startAfter,
  doc,
  getDoc,
  Timestamp,
  DocumentSnapshot,
  where,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  Query,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

// Firestore sale document shape
interface FirestoreSale {
  createdAt: Timestamp | string | number;
  price: number | string;
  refererId: string;
  saleId: string;
  userId: string;
  pinned?: boolean;
  pinnedAt?: Timestamp | string | number | null;
}

interface SaleRow {
  id: string; // Firestore doc id
  createdAt: Date;
  price: number;
  refererId: string;
  saleId: string;
  userId: string;
  pinned: boolean;
  pinnedAt: Date | null;
}

const SalesPage = () => {
  const { t } = useLanguage();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [salesPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<'createdAt' | 'price' | 'saleId'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [batchSize, setBatchSize] = useState<number>(100); // real-time window size
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const userCache = useMemo(() => new Map<string, string>(), []);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [nameCacheTick, setNameCacheTick] = useState<number>(0);
  // Referrer filter constants
  const NO_REFERRER = '__NO_REFERRER__';
  // Filter UI and server-side filtering states
  const [referrerFilter, setReferrerFilter] = useState<string>('');
  const [filterLoading, setFilterLoading] = useState<boolean>(false);
  const [useServerFilters, setUseServerFilters] = useState<boolean>(false);
  const [serverFilteredSales, setServerFilteredSales] = useState<SaleRow[] | null>(null);
  const serverFilterThreshold = 500;
  // Selection and actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: ''
  });

  // Auth awareness (friendly errors if rules require auth)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setAuthUser(u));
    return () => unsub();
  }, []);

  // Real-time subscription to latest sales (ordered by createdAt desc)
  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'sales'),
        orderBy('createdAt', 'desc'),
        limit(batchSize)
      );
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const rows: SaleRow[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as FirestoreSale;
            const created = normalizeToDate(data.createdAt) || new Date(0);
            const priceNum = normalizeToNumber(data.price) ?? 0;
            // Require minimal mandatory fields
            if (!data.saleId || !data.userId) {
              console.warn('Skipping sale missing saleId/userId:', { id: docSnap.id, data });
              return; // skip if identifiers are missing
            }
            rows.push({
              id: docSnap.id,
              createdAt: created,
              price: priceNum,
              refererId: data.refererId || '',
              saleId: data.saleId,
              userId: data.userId,
              pinned: Boolean(data.pinned),
              pinnedAt: data.pinnedAt ? normalizeToDate(data.pinnedAt) : null,
            });
          });
          setSales(rows);
          setLastDoc(snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null);
          setLoading(false);
        },
        async (err) => {
          console.error('Sales subscription error:', err);
          // Fallback: attempt a one-time snapshot so page still renders data
          try {
            const fallbackSnap = await getDocs(q);
            const rows: SaleRow[] = fallbackSnap.docs.map((docSnap) => {
              const data = docSnap.data() as FirestoreSale;
              return {
                id: docSnap.id,
                createdAt: normalizeToDate(data.createdAt) || new Date(0),
                price: normalizeToNumber(data.price) ?? 0,
                refererId: data.refererId || '',
                saleId: data.saleId || '',
                userId: data.userId || '',
                pinned: Boolean(data.pinned),
                pinnedAt: data.pinnedAt ? normalizeToDate(data.pinnedAt) : null,
              };
            });
            setSales(rows);
            setLastDoc(fallbackSnap.docs.length ? fallbackSnap.docs[fallbackSnap.docs.length - 1] : null);
            setError(t('sales.realtimeUnavailable'));
          } catch (fallbackErr) {
            console.error('Fallback snapshot failed:', fallbackErr);
            setError(t('sales.unableToLoad'));
          } finally {
            setLoading(false);
          }
        }
      );
      return () => unsub();
    } catch (e) {
      console.error('Sales subscription initialization failed:', e);
      setError(t('sales.initRealtimeFailed'));
      setLoading(false);
    }
  }, [batchSize]);

  // Refresh action: re-fetch latest batch and reset pagination
  const refresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'sales'),
        orderBy('createdAt', 'desc'),
        limit(batchSize)
      );
      const snapshot = await getDocs(q);
      const rows: SaleRow[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as FirestoreSale;
        return {
          id: docSnap.id,
          createdAt: normalizeToDate(data.createdAt) || new Date(0),
          price: normalizeToNumber(data.price) ?? 0,
          refererId: data.refererId || '',
          saleId: data.saleId || '',
          userId: data.userId || '',
          pinned: Boolean(data.pinned),
          pinnedAt: data.pinnedAt ? normalizeToDate(data.pinnedAt) : null,
        };
      });
      setSales(rows);
      setLastDoc(snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null);
      setCurrentPage(1);
    } catch (e) {
      console.error('Refresh failed:', e);
      setError(t('sales.refreshFailed'));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-enable server-side filtering for large datasets
  useEffect(() => {
    setUseServerFilters(sales.length > serverFilterThreshold);
  }, [sales.length]);

  // Selection helpers
  const isSelected = (id: string) => selectedIds.has(id);
  const clearSelection = () => setSelectedIds(new Set());
  const toggleRowSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Client-side sorting & filtering for the current batch
  const filteredSales = useMemo(() => {
    // Use server results when enabled and available
    let result = useServerFilters && serverFilteredSales ? [...serverFilteredSales] : [...sales];
    // Search by saleId or username/referrer name (cached)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const nameContains = (id: string, t: string) => {
        const cached = (userCache.get(id) || '').toLowerCase();
        return cached.includes(t) || id.toLowerCase().includes(t);
      };
      result = result.filter((s) =>
        s.saleId.toLowerCase().includes(term) ||
        nameContains(s.userId, term) ||
        nameContains(s.refererId, term)
      );
    }
    // Referrer filter
    if (referrerFilter) {
      if (referrerFilter === NO_REFERRER) {
        result = result.filter((s) => !s.refererId);
      } else {
        result = result.filter((s) => s.refererId === referrerFilter);
      }
    }
    // Date filters
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((s) => s.createdAt >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      result = result.filter((s) => s.createdAt <= to);
    }
    // Amount filters
    if (filters.amountMin) {
      const min = parseFloat(filters.amountMin);
      result = result.filter((s) => s.price >= min);
    }
    if (filters.amountMax) {
      const max = parseFloat(filters.amountMax);
      result = result.filter((s) => s.price <= max);
    }

    // Exclude rows where username is unknown, or referrer name is unknown
    const isKnownName = (id: string) => {
      const n = (userCache.get(id) || '').trim();
      return n.length > 0;
    };
    result = result.filter((s) => isKnownName(s.userId) && (!s.refererId || isKnownName(s.refererId)));

    // Sorting (pinned items first, then chosen sort key)
    result.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1; // pinned first
      }
      if (a.pinned && b.pinned) {
        const aPA = a.pinnedAt ? a.pinnedAt.getTime() : 0;
        const bPA = b.pinnedAt ? b.pinnedAt.getTime() : 0;
        if (aPA !== bPA) return (bPA - aPA); // newer pinned first
      }
      if (sortKey === 'createdAt') {
        return (a.createdAt.getTime() - b.createdAt.getTime()) * dir;
      }
      if (sortKey === 'price') {
        return (a.price - b.price) * dir;
      }
      return a.saleId.localeCompare(b.saleId) * dir;
    });

    return result;
  }, [sales, serverFilteredSales, useServerFilters, searchTerm, filters, sortKey, sortDir, nameCacheTick, referrerFilter]);

  // Pagination
  const indexOfLastSale = currentPage * salesPerPage;
  const indexOfFirstSale = indexOfLastSale - salesPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);
  const totalPages = Math.ceil(filteredSales.length / salesPerPage) || 1;
  const allCurrentSelected = useMemo(() => currentSales.every((s) => selectedIds.has(s.id)) && currentSales.length > 0, [currentSales, selectedIds]);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Batch prefetch usernames for IDs visible on current page (optimizes lookups)
  useEffect(() => {
    const ids = new Set<string>();
    currentSales.forEach((s) => {
      if (s.userId) ids.add(s.userId);
      if (s.refererId) ids.add(s.refererId);
    });
    const missing = [...ids].filter((id) => !userCache.has(id) && !resolvingIds.has(id));
    if (missing.length === 0) return;
    // Resolve in parallel using existing resolver (which caches results)
    Promise.all(missing.map((id) => getUserName(id))).then(() => {
      setNameCacheTick((n) => n + 1);
    });
  }, [currentSales, resolvingIds]);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle referrer selection
  const handleReferrerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setReferrerFilter(val);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: ''
    });
    setReferrerFilter('');
    setServerFilteredSales(null);
    setSearchTerm('');
  };

  // Server-side filter fetch for large datasets (date range and referrer only)
  useEffect(() => {
    const fetchServerFiltered = async () => {
      if (!useServerFilters) {
        setServerFilteredSales(null);
        return;
      }
      // We cannot query for missing referrerId reliably; fallback to client for NO_REFERRER
      if (referrerFilter === NO_REFERRER) {
        setServerFilteredSales(null);
        return;
      }
      try {
        setFilterLoading(true);
        let qRef: Query = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));
        if (filters.dateFrom) {
          const from = new Date(filters.dateFrom);
          qRef = query(qRef, where('createdAt', '>=', from));
        }
        if (filters.dateTo) {
          const to = new Date(filters.dateTo);
          qRef = query(qRef, where('createdAt', '<=', to));
        }
        if (referrerFilter) {
          qRef = query(qRef, where('refererId', '==', referrerFilter));
        }
        // Limit to a reasonable page size for performance
        qRef = query(qRef, limit(batchSize));
        const snapshot = await getDocs(qRef);
        const rows: SaleRow[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as FirestoreSale;
          return {
            id: docSnap.id,
            createdAt: normalizeToDate(data.createdAt) || new Date(0),
            price: normalizeToNumber(data.price) ?? 0,
            refererId: data.refererId || '',
            saleId: data.saleId || '',
            userId: data.userId || '',
            pinned: Boolean(data.pinned),
            pinnedAt: data.pinnedAt ? normalizeToDate(data.pinnedAt) : null,
          };
        });
        setServerFilteredSales(rows);
      } catch (e) {
        console.error('Server-side filter failed:', e);
        setServerFilteredSales(null);
      } finally {
        setFilterLoading(false);
      }
    };
    fetchServerFiltered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useServerFilters, filters.dateFrom, filters.dateTo, referrerFilter, batchSize]);

  // Referrer options (All, No Referrer, plus unique referrer IDs from current sales)
  const referrerOptions = useMemo(() => {
    const uniq = new Set<string>();
    sales.forEach((s) => { if (s.refererId) uniq.add(s.refererId); });
    const known = [...uniq]
      .map((id) => ({ id, name: (userCache.get(id) || '').trim() }))
      .filter((opt) => opt.name.length > 0);
    const base = [
      { id: '', name: t('sales.allReferrers') },
      { id: NO_REFERRER, name: t('sales.noReferrer') },
    ];
    return [...base, ...known.sort((a, b) => a.name.localeCompare(b.name))];
  }, [sales, userCache, nameCacheTick]);

  // Delete selected sales with confirmation and audit log
  const deleteSelectedSales = async () => {
    if (selectedIds.size === 0) return;
    const ok = window.confirm(tf('sales.confirmDeleteSelected', { count: selectedIds.size }));
    if (!ok) return;
    setActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      let success = 0;
      let failed = 0;
      await Promise.all(ids.map(async (id) => {
        try {
          const ref = doc(db, 'sales', id);
          const snap = await getDoc(ref);
          const saleData = snap.exists() ? snap.data() : null;
          await deleteDoc(ref);
          await addDoc(collection(db, 'auditLogs'), {
            action: 'delete',
            saleId: id,
            byUid: authUser?.uid || null,
            at: serverTimestamp(),
            sale: saleData,
          });
          success++;
        } catch (e) {
          console.error('Delete failed for', id, e);
          failed++;
        }
      }));
      // Optimistically update UI
      setSales((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      clearSelection();
      setActionMessage({ type: failed ? 'error' : 'success', text: failed ? tf('sales.deleteResultMixed', { success, failed }) : tf('sales.deleteResult', { success }) });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  // Pin/Unpin selected items (toggle per item), persist to Firestore
  const togglePinSelected = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      let pinnedCount = 0;
      let unpinnedCount = 0;
      await Promise.all(ids.map(async (id) => {
        const sale = sales.find((s) => s.id === id);
        if (!sale) return;
        try {
          const ref = doc(db, 'sales', id);
          if (sale.pinned) {
            await updateDoc(ref, { pinned: false, pinnedAt: null });
            unpinnedCount++;
          } else {
            await updateDoc(ref, { pinned: true, pinnedAt: serverTimestamp() });
            pinnedCount++;
          }
        } catch (e) {
          console.error('Pin toggle failed for', id, e);
        }
      }));
      setActionMessage({ type: 'success', text: tf('sales.pinToggleResult', { pinned: pinnedCount, unpinned: unpinnedCount }) });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  // Export functions (based on Firestore fields)
  const exportToExcel = () => {
    const exportData = filteredSales.map((sale, idx) => ({
      [t('sales.header.sr')]: idx + 1,
      [t('sales.header.saleId')]: sale.saleId,
      [t('sales.header.username')]: userCache.get(sale.userId) || '',
      [t('sales.header.refererName')]: sale.refererId ? (userCache.get(sale.refererId) || '') : t('sales.noReferrer'),
      [t('sales.header.createdAt')]: formatDate(sale.createdAt),
      [t('sales.header.price')]: sale.price,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t('sales.sheetName'));
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `sales-report-${date}.xlsx`);
  };

  const exportToCSV = () => {
    const exportData = filteredSales.map((sale, idx) => ({
      [t('sales.header.sr')]: idx + 1,
      [t('sales.header.saleId')]: sale.saleId,
      [t('sales.header.username')]: userCache.get(sale.userId) || '',
      [t('sales.header.refererName')]: sale.refererId ? (userCache.get(sale.refererId) || '') : t('sales.noReferrer'),
      [t('sales.header.createdAt')]: formatDate(sale.createdAt),
      [t('sales.header.price')]: sale.price,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Create and download CSV file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `sales-report-${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Helper: normalize Firestore timestamp/string/number to Date
  function normalizeToDate(value: Timestamp | string | number | undefined): Date | null {
    try {
      if (!value) return null;
      // Prefer using toDate() when available (robust for Firestore Timestamp)
      if (typeof (value as any)?.toDate === 'function') {
        return (value as any).toDate();
      }
      if (value instanceof Timestamp) return value.toDate();
      if (typeof value === 'number') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
      }
      if (typeof value === 'string') {
        // Try native parsing first
        let parsed = new Date(value);
        if (!isNaN(parsed.getTime())) return parsed;

        // Handle Firestore console-like strings: "October 29, 2025 at 11:06:07 PM UTC+5"
        const re = /^([A-Za-z]+ \d{1,2}, \d{4}) at (\d{1,2}:\d{2}:\d{2} [AP]M) UTC([+-]\d{1,2})$/;
        const m = re.exec(value);
        if (m) {
          const [, datePart, timePart, offset] = m;
          const candidate = `${datePart} ${timePart} GMT${offset}`; // GMT offset is parseable
          parsed = new Date(candidate);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      }
      return null;
    } catch (e) {
      console.warn('normalizeToDate failed:', e, value);
      return null;
    }
  }

  // Helper: normalize numeric-like values to number
  function normalizeToNumber(value: number | string | undefined): number | null {
    if (value === undefined || value === null) return null;
    const n = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(n as number) ? null : Number(n);
  }

  // Resolve user names with caching
  const getUserName = async (id: string): Promise<string> => {
    if (!id) return '';
    const cached = userCache.get(id);
    if (cached) return cached;
    setResolvingIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      const snap = await getDoc(doc(db, 'users', id));
      if (!snap.exists()) {
        userCache.set(id, '');
        return '';
      }
      const data = snap.data() as any;
      const name = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || '';
      userCache.set(id, name);
      return name;
    } catch (e) {
      console.error('Failed to resolve user name for', id, e);
      userCache.set(id, '');
      return '';
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Simple formatter to interpolate params into translation templates
  const tf = (key: string, params?: Record<string, string | number>) => {
    let s = t(key);
    if (params) {
      Object.keys(params).forEach((k) => {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
      });
    }
    return s;
  };

  return (
    <MainLayout title={t('sales.title')}>
      <div className="space-y-6">
        {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('sales.title')}</h1>
          <p className="text-muted mt-1">{t('sales.subtitle')}</p>
          {/* Applied filters summary */}
          <div className="flex flex-wrap gap-2 mt-2">
            {referrerFilter && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-card-hover border border-border rounded">
                {t('sales.filterSummary.referrer')} {referrerFilter === NO_REFERRER ? t('sales.noReferrer') : (userCache.get(referrerFilter) || t('sales.unknownUser'))}
              </span>
            )}
            {filters.dateFrom && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-card-hover border border-border rounded">
                {t('sales.filterSummary.from')} {filters.dateFrom}
              </span>
            )}
            {filters.dateTo && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-card-hover border border-border rounded">
                {t('sales.filterSummary.to')} {filters.dateTo}
              </span>
            )}
            {filterLoading && (
              <span className="inline-flex items-center px-2 py-1 text-xs text-muted">
                {t('sales.filtering')}
              </span>
            )}
            {actionMessage && (
              <span className={`inline-flex items-center px-2 py-1 text-xs border rounded ${actionMessage.type === 'success' ? 'border-green-500 text-green-700 bg-green-50' : 'border-red-500 text-red-700 bg-red-50'}`}>
                {actionMessage.text}
              </span>
            )}
          </div>
        </div>

          {/* Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FiDownload size={16} />
              {t('sales.exportExcel')}
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiDownload size={16} />
              {t('sales.exportCSV')}
            </button>
            <button
              onClick={refresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-primary border border-border rounded-lg hover:bg-card-hover disabled:opacity-50"
            >
              <FiRefreshCw className={isRefreshing ? 'animate-spin' : ''} size={16} />
              {t('app.refresh')}
            </button>
            {/* Selection actions */}
            <button
              onClick={deleteSelectedSales}
              disabled={selectedIds.size === 0 || actionLoading}
              aria-label={t('sales.ariaDeleteSelected')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <FiTrash size={16} />
              {t('sales.deleteSelected')}
            </button>
            <button
              onClick={togglePinSelected}
              disabled={selectedIds.size === 0 || actionLoading}
              aria-label={t('sales.ariaPinUnpinSelected')}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              <FiStar size={16} />
              {t('sales.pinUnpin')}
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 border border-red-200 bg-red-50 text-red-700 rounded-lg">
            <FiAlertCircle size={18} />
            <span>{error}</span>
            {!authUser && <span className="ml-2">{t('auth.signInRequired')}</span>}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-card rounded-lg ">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={18} />
                <input
                  type="text"
                  placeholder={t('sales.searchPlaceholder')}
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-card-hover transition-colors"
            >
              <FiFilter size={16} />
              {t('sales.filters')}
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="pt-4 border-t border-border overflow-x-auto scrollbar-thin p-6">
              <div className="flex flex-nowrap items-end gap-3 min-w-max">
                {/* Referrer Name */}
                <div className="min-w-[220px]">
                  <label className="block text-xs font-medium text-muted mb-1">
                    {t('sales.referrerName')}
                  </label>
                  <select
                    name="referrerFilter"
                    value={referrerFilter}
                    onChange={handleReferrerChange}
                    className="w-full h-10 px-3 border border-border rounded-md bg-white shadow-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    {referrerOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
                {/* Date From */}
                <div className="min-w-[190px]">
                  <label className="block text-xs font-medium text-muted mb-1">
                    <FiCalendar className="inline mr-1" size={14} />
                    {t('sales.fromDate')}
                  </label>
                  <input
                    type="date"
                    name="dateFrom"
                    value={filters.dateFrom}
                    onChange={handleFilterChange}
                    className="w-full h-10 px-3 border border-border rounded-md bg-white shadow-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
                
                {/* Date To */}
                <div className="min-w-[190px]">
                  <label className="block text-xs font-medium text-muted mb-1">
                    <FiCalendar className="inline mr-1" size={14} />
                    {t('sales.toDate')}
                  </label>
                  <input
                    type="date"
                    name="dateTo"
                    value={filters.dateTo}
                    onChange={handleFilterChange}
                    className="w-full h-10 px-3 border border-border rounded-md bg-white shadow-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
                
                {/* Amount Min */}
                <div className="min-w-[160px]">
                  <label className="block text-xs font-medium text-muted mb-1">
                    <FiDollarSign className="inline mr-1" size={14} />
                    {t('sales.minAmount')}
                  </label>
                  <input
                    type="number"
                    name="amountMin"
                    value={filters.amountMin}
                    onChange={handleFilterChange}
                    placeholder={t('sales.minAmountPlaceholder')}
                    step="0.01"
                    className="w-full h-10 px-3 border border-border rounded-md bg-white shadow-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
                
                {/* Amount Max */}
                <div className="min-w-[160px]">
                  <label className="block text-xs font-medium text-muted mb-1">
                    <FiDollarSign className="inline mr-1" size={14} />
                    {t('sales.maxAmount')}
                  </label>
                  <input
                    type="number"
                    name="amountMax"
                    value={filters.amountMax}
                    onChange={handleFilterChange}
                    placeholder={t('sales.maxAmountPlaceholder')}
                    step="0.01"
                    className="w-full h-10 px-3 border border-border rounded-md bg-white shadow-sm focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
                {/* Clear filters */}
                <div className="min-w-[140px] ml-auto">
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm text-muted hover:text-primary rounded-md transition-colors"
                  >
                    {t('sales.resetFilters')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      aria-label={t('sales.selectAllOnPage')}
                      checked={allCurrentSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            currentSales.forEach((s) => next.add(s.id));
                            return next;
                          });
                        } else {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            currentSales.forEach((s) => next.delete(s.id));
                            return next;
                          });
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('sales.header.sr')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      setSortKey('saleId');
                      setSortDir(sortKey === 'saleId' && sortDir === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    {t('sales.header.saleId')} {sortKey === 'saleId' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('sales.header.username')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('sales.header.refererName')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      setSortKey('createdAt');
                      setSortDir(sortKey === 'createdAt' && sortDir === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    {t('sales.header.createdAt')} {sortKey === 'createdAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      setSortKey('price');
                      setSortDir(sortKey === 'price' && sortDir === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    {t('sales.header.price')} {sortKey === 'price' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">{t('sales.loading')}</td>
                  </tr>
                ) : currentSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">{t('sales.noResults')}</td>
                  </tr>
                ) : (
                  currentSales.map((sale, idx) => (
                    <tr key={sale.id} className={`hover:bg-gray-50 transition-colors ${isSelected(sale.id) ? 'bg-blue-50' : ''}`} aria-selected={isSelected(sale.id)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          aria-label={tf('sales.selectSale', { id: sale.saleId })}
                          checked={isSelected(sale.id)}
                          onChange={() => toggleRowSelect(sale.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {indexOfFirstSale + idx + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          {sale.saleId}
                          {sale.pinned && <FiStar aria-label={t('sales.pinned')} className="text-yellow-500" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <AsyncName id={sale.userId} getUserName={getUserName} />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {sale.refererId ? (
                            <AsyncName id={sale.refererId} getUserName={getUserName} />
                          ) : (
                            t('sales.noReferrer')
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(sale.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">{formatCurrency(sale.price)}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {t('app.previous')}
              </button>
              <button
                onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {t('app.next')}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t('app.showing')}
                  {' '}
                  <span className="font-medium">{indexOfFirstSale + 1}</span>
                  {' '}
                  {t('app.to')}
                  {' '}
                  <span className="font-medium">{Math.min(indexOfLastSale, filteredSales.length)}</span>
                  {' '}
                  {t('app.of')}
                  {' '}
                  <span className="font-medium">{filteredSales.length}</span>
                  {' '}
                  {t('app.results')}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('app.previous')}
                  </button>
                  <button
                    onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('app.next')}
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SalesPage;

// Lightweight component to display names with async resolution
function AsyncName({ id, getUserName }: { id: string; getUserName: (id: string) => Promise<string> }) {
  const [name, setName] = React.useState<string>('');
  useEffect(() => {
    let mounted = true;
    getUserName(id).then((n) => {
      if (mounted) setName(n);
    });
    return () => {
      mounted = false;
    };
  }, [id]);
  return <span>{name}</span>;
}
