'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Package, DollarSign, TrendingUp } from 'lucide-react';
import { FiSearch } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import PackCreateModal from '@/components/PackCreateModal';
import PackEditModal from '@/components/PackEditModal';
import SingleCardPriceModal from '@/components/SingleCardPriceModal';
import { Pack } from '@/types/pack';
import firebasePackService, { PackStats, PackFilters } from '@/services/firebasePackService';
import { firebaseAlbumService } from '@/services/firebaseAlbumService';
import { useLanguage } from '@/context/LanguageContext';
// Stock modals are removed for Firebase packs MVP

const StorePage = () => {
  const [stocks, setStocks] = useState<Pack[]>([]);
  const [stats, setStats] = useState<PackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Pack | null>(null);
  const [linkedAlbumName, setLinkedAlbumName] = useState<string>('');
  const [linkedAlbumImage, setLinkedAlbumImage] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Real-time subscription + filtered pagination
  useEffect(() => {
    setLoading(true);
    const unsubscribe = firebasePackService.subscribePacks((all) => {
      const filters: PackFilters = {
        search: searchTerm || undefined,
      };
      const filtered = firebasePackService.filterPacks(all, filters);
      const pageSize = 12;
      const start = (currentPage - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);
      setStocks(pageItems);
      setTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)));
      setStats(firebasePackService.computeStats(all));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentPage, searchTerm]);

  // Fetch linked album details when viewing pack details
  useEffect(() => {
    const fetchAlbumName = async () => {
      try {
        if (showDetailsModal && selectedStock?.linkedAlbum) {
          const res = await firebaseAlbumService.getAlbum(selectedStock.linkedAlbum);
          if (res.success && res.album) {
            setLinkedAlbumName(res.album.name || '');
            setLinkedAlbumImage(res.album.image || '');
            return;
          }
        }
        setLinkedAlbumName('');
        setLinkedAlbumImage('');
      } catch (e) {
        console.warn('Failed to fetch linked album name:', e);
        setLinkedAlbumName('');
        setLinkedAlbumImage('');
      }
    };
    fetchAlbumName();
  }, [showDetailsModal, selectedStock]);

  const loadStocks = async () => {
    try {
      setLoading(true);
      const all = await firebasePackService.getPacks();
      const filters: PackFilters = {
        search: searchTerm || undefined
      };
      const filtered = firebasePackService.filterPacks(all, filters);
      // Simple client-side pagination
      const pageSize = 12;
      const start = (currentPage - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);
      setStocks(pageItems);
      setTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)));
    } catch (error) {
      console.error('Error loading stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const packs = await firebasePackService.getPacks();
      const statsData = firebasePackService.computeStats(packs);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const { t } = useLanguage();

  const handleDeleteStock = async (packId: string) => {
    if (!confirm(t('store.confirmDelete'))) return;
    try {
      await firebasePackService.deletePack(packId);
    } catch (err) {
      console.error('Delete pack failed', err);
      alert(t('store.deleteFailed'));
    }
  };

  const handleEditStock = (stock: Pack) => {
    setSelectedStock(stock);
    setShowEditModal(true);
  };

  // Creation/Update handlers removed for Firebase MVP

  // Rarity helpers removed per request

  return (
    <MainLayout title={t('store.title')}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('store.title')}</h1>
            <p className="text-gray-600 mt-1">{t('store.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPriceModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <DollarSign className="w-5 h-5" />
              {t('store.singleCardPrice')}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('store.addPack')}
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('store.totalPacks')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPacks}</p>
                  <p className="text-xs text-gray-500">{t('store.totalPacksDesc')}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('store.totalValue')}</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.totalValue.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{t('store.totalValueDesc')}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('store.averagePrice')}</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.averagePrice.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{t('store.averagePriceDesc')}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Alerts */}
        {/* Inventory alerts removed for Firebase packs MVP */}

        {/* Search Bar (aligned with Users page) */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('store.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Stock Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stocks.map((stock) => (
              <div key={stock.packId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Stock Image */}
                <div className="relative h-100 bg-gradient-to-br from-gray-100 to-gray-200">
                  {stock.image ? (
                    <img
                      src={stock.image}
                      alt={stock.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  {/* Rarity badge removed */}
                </div>

                {/* Stock Info */}
                <div className="p-4">
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900 truncate">{stock.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{stock.stockNo}</p>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{stock.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-gray-900">${stock.price}</span>
                  </div>
                  

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedStock(stock);
                        setShowDetailsModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      {t('app.view')}
                    </button>
                    <button
                      onClick={() => handleEditStock(stock)}
                      className="flex items-center justify-center px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStock(stock.packId)}
                      className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && stocks.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('store.noPacksFound')}</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? t('store.tryAdjustingSearch') : t('store.getStartedAddPack')}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('store.addPack')}
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {t('app.previous')}
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              {t('app.page')} {currentPage} {t('app.of')} {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {t('app.next')}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <PackCreateModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <PackEditModal open={showEditModal} pack={selectedStock} onClose={() => setShowEditModal(false)} />
      <SingleCardPriceModal open={showPriceModal} onClose={() => setShowPriceModal(false)} />

      {showDetailsModal && selectedStock && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{t('store.packDetails')}</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Pack Image */}
              {selectedStock.image && (
                <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={selectedStock.image}
                    alt={selectedStock.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedStock.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{t('store.stockNumber')}: {selectedStock.stockNo}</p>
                <p className="text-gray-700">{selectedStock.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">{t('store.price')}</p>
                  <p className="text-lg font-semibold">${selectedStock.price}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-600">{t('store.linkedAlbum')}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedStock.linkedAlbum
                          ? (linkedAlbumName ? linkedAlbumName : selectedStock.linkedAlbum)
                          : t('store.none')}
                      </p>
                      {selectedStock.linkedAlbum && linkedAlbumName && (
                        <p className="text-xs text-gray-500">ID: {selectedStock.linkedAlbum}</p>
                      )}
                    </div>
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                      {linkedAlbumImage ? (
                        <img src={linkedAlbumImage} alt={linkedAlbumName || 'Album'} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-400">{t('store.noImage')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEditStock(selectedStock);
                }}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('store.editPack')}
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                {t('app.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default StorePage;