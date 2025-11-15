'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiPlus, FiTrash2, FiEdit, FiEye, FiSearch, FiFilter, FiChevronLeft, FiChevronRight, FiLoader } from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';
import ImageUpload from '@/components/ui/ImageUpload';
import { ImageUploadResult } from '@/services/imageService';
import { firebaseBannerService, Banner, CreateBannerRequest, UpdateBannerRequest } from '@/services/firebaseBannerService';

const BannersPage = () => {
  const { t } = useLanguage();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [filteredBanners, setFilteredBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [bannersPerPage] = useState(8);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Banner | null, direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });
  const [showFilters, setShowFilters] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    bannerId: '',
    image: '',
    url: '',
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Load banners on component mount
  useEffect(() => {
    loadBanners();
  }, []);

  // Filter banners when search term or sort config changes
  useEffect(() => {
    filterBanners();
  }, [banners, searchTerm, sortConfig]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await firebaseBannerService.getBanners();
      console.log('getBanners response:', response);
      
      if (response.success && response.banners) {
        setBanners(response.banners);
        setNotification({
          type: 'success',
          message: `Loaded ${response.banners.length} banners successfully`
        });
      } else {
        setError(response.error || 'Failed to load banners');
        setNotification({
          type: 'error',
          message: response.error || 'Failed to load banners'
        });
      }
    } catch (error: any) {
      console.error('Error loading banners:', error);
      setError(error.message || 'Failed to load banners');
      setNotification({
        type: 'error',
        message: error.message || 'Failed to load banners'
      });
    } finally {
      setLoading(false);
      // Clear notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const filterBanners = () => {
    let result = [...banners];

    // Search filter
    if (searchTerm) {
      result = result.filter(banner =>
        banner.bannerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        banner.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by createdAt field based on sortConfig
    if (sortConfig.key === 'createdAt') {
      result.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      });
    }

    setFilteredBanners(result);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle search and filter changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Get current banners for pagination
  const indexOfLastBanner = currentPage * bannersPerPage;
  const indexOfFirstBanner = indexOfLastBanner - bannersPerPage;
  const currentBanners = filteredBanners.slice(indexOfFirstBanner, indexOfLastBanner);
  const totalPages = Math.ceil(filteredBanners.length / bannersPerPage);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Request sort
  // const requestSort = (key: keyof Banner) => {
  //   let direction: 'ascending' | 'descending' = 'ascending';
  //   if (sortConfig.key === key && sortConfig.direction === 'ascending') {
  //     direction = 'descending';
  //   }
  //   setSortConfig({ key, direction });
  //   setTimeout(applyFilters, 300);
  // };

  // Handle banner form changes
  const handleBannerFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBannerForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open banner modal for adding
  const openAddBannerModal = () => {
    setEditMode(false);
    setBannerForm({
      bannerId: '',
      image: '',
      url: '',
    });
    setShowBannerModal(true);
  };

  // Open banner modal for editing
  const openEditBannerModal = (banner: Banner) => {
    setEditMode(true);
    setCurrentBanner(banner);
    setBannerForm({
      bannerId: banner.bannerId,
      image: banner.image,
      url: banner.url,
    });
    setShowBannerModal(true);
  };

  // Open preview modal
  const openPreviewModal = (banner: Banner) => {
    setCurrentBanner(banner);
    setShowPreviewModal(true);
  };

  // Save banner (add or edit)
  const saveBanner = async () => {
    try {
      // Form validation - only URL is required now
      if (!bannerForm.url.trim()) {
        setError('Banner URL is required');
        return;
      }

      // URL validation for both image and URL (only if provided)
      if (bannerForm.image.trim() && !bannerForm.image.startsWith('http://') && !bannerForm.image.startsWith('https://')) {
        setError('Image URL must start with http:// or https://');
        return;
      }

      if (!bannerForm.url.startsWith('http://') && !bannerForm.url.startsWith('https://')) {
        setError('URL must start with http:// or https://');
        return;
      }

      setError(null);
      
      if (editMode && currentBanner) {
        // Edit existing banner
        const updateData: UpdateBannerRequest = {
          bannerId: bannerForm.bannerId || undefined,
          image: bannerForm.image || '', // Allow empty image
          url: bannerForm.url,
        };

        const response = await firebaseBannerService.updateBanner(currentBanner.id, updateData);
        
        if (response.success) {
          showNotification('success', 'Banner updated successfully!');
        } else {
          setError(response.error || 'Failed to update banner');
          return;
        }
      } else {
        // Add new banner
        const createData: CreateBannerRequest = {
          image: bannerForm.image || '', // Allow empty image
          url: bannerForm.url,
        };

        if (bannerForm.bannerId.trim()) {
          createData.bannerId = bannerForm.bannerId;
        }

        console.log('Creating banner with data:', createData);
        const response = await firebaseBannerService.createBanner(createData);
        console.log('Create banner response:', response);
        
        if (response.success) {
          showNotification('success', 'Banner created successfully!');
        } else {
          setError(response.error || 'Failed to create banner');
          return;
        }
      }
      
      // Reload banners after save
      await loadBanners();
      setShowBannerModal(false);
    } catch (err) {
      console.error('Error saving banner:', err);
      setError('Failed to save banner');
    }
  };

  // Delete banner with confirmation dialog
  const showDeleteConfirmation = (banner: Banner) => {
    setBannerToDelete(banner);
    setShowDeleteModal(true);
  };

  const confirmDeleteBanner = async () => {
    if (bannerToDelete) {
      try {
        setError(null);
        const response = await firebaseBannerService.deleteBanner(bannerToDelete.id);
        
        if (response.success) {
          showNotification('success', 'Banner deleted successfully!');
          await loadBanners(); // Reload banners after delete
        } else {
          setError(response.error || 'Failed to delete banner');
        }
      } catch (err) {
        console.error('Error deleting banner:', err);
        setError('Failed to delete banner');
      } finally {
        setShowDeleteModal(false);
        setBannerToDelete(null);
      }
    }
  };

  // Handle sort change
  const handleSortChange = (direction: 'ascending' | 'descending') => {
    setSortConfig({ key: 'createdAt', direction });
  };



  return (
    <MainLayout title={t('banners.title')}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{t('banners.title')}</h1>
          <button
            onClick={openAddBannerModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
          >
            <FiPlus size={18} />
            <span>{t('banners.add')}</span>
          </button>
        </div>
        
        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('banners.search')}
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <select
                value={sortConfig.direction}
                onChange={(e) => handleSortChange(e.target.value as 'ascending' | 'descending')}
                className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
              >
                <option value="descending">Newest First</option>
                <option value="ascending">Oldest First</option>
              </select>
              <FiFilter className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex items-center justify-center py-12">
              <FiLoader className="animate-spin text-blue-600 mr-2" size={24} />
              <span className="text-gray-600">Loading banners...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Banners Grid */}
        {!loading && !error && (
          <>
            {currentBanners.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? t('banners.noSearchResults') : t('banners.noBanners')}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm 
                    ? t('banners.tryDifferentSearch') 
                    : t('banners.createFirstBanner')
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={openAddBannerModal}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FiPlus className="mr-2" />
                    {t('banners.addBanner')}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
            {currentBanners.map((banner) => (
              <div key={banner.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-60 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  <Image 
                    src={banner.image || '/images/placeholder-banner.svg'} 
                    alt={banner.bannerId} 
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-2 truncate">
                    <span className="font-medium">URL:</span> {banner.url}
                  </p>
                  <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                    <p className="truncate">
                      <span className="font-medium">Created:</span> {new Date(banner.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {/* Action Buttons - Store-style */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openPreviewModal(banner)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                      title="Preview Banner"
                    >
                      <FiEye className="w-4 h-4" />
                      Preview
                    </button>
                    <button
                      onClick={() => openEditBannerModal(banner)}
                      className="flex items-center justify-center px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Edit Banner"
                    >
                      <FiEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => showDeleteConfirmation(banner)}
                      className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Delete Banner"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
            )}
          </>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="relative z-0 inline-flex rounded-lg shadow-sm space-x-2" aria-label="Pagination">
              <button
                onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 mr-2"
              >
                <span className="sr-only">{t('banners.previous')}</span>
                <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                <button
                  key={number}
                  onClick={() => paginate(number)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg ${
                    number === currentPage
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {number}
                </button>
              ))}
              
              <button
                onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="sr-only">{t('banners.next')}</span>
                <FiChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        )}
      </div>
      
      {/* Banner Form Modal */}
      {showBannerModal && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editMode ? 'Edit Banner' : 'Add New Banner'}
                </h2>
                <button 
                  onClick={() => setShowBannerModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  &times;
                </button>
              </div>
              
              {/* Notification */}
              {notification && (
                <div className={`mb-4 p-4 rounded-md ${
                  notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {notification.message}
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Banner ID (Optional)</label>
                  <input 
                    type="text" 
                    name="bannerId"
                    value={bannerForm.bannerId}
                    onChange={handleBannerFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Leave empty for auto-generation"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Banner Image</label>
                  <ImageUpload
                    value={bannerForm.image || ''} 
                    existingImageUrl={currentBanner?.image || bannerForm.image || ''} 
                    context="banner"
                    onChange={(result) =>
                      setBannerForm(prev => ({ ...prev, image: result?.url || '' }))
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Link URL *</label>
                  <input 
                    type="url" 
                    name="url"
                    value={bannerForm.url}
                    onChange={handleBannerFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="https://example.com/promotion"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button 
                  onClick={() => setShowBannerModal(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveBanner}
                  disabled={loading || !bannerForm.url.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all duration-200 font-medium flex items-center space-x-2"
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{editMode ? 'Update' : 'Save'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Banner Preview Modal */}
      {showPreviewModal && currentBanner && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Preview: {currentBanner.bannerId}</h2>
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  &times;
                </button>
              </div>
              
              <div className="mb-4">
                <div className="rounded-lg overflow-hidden relative aspect-video">
                  <Image 
                    src={currentBanner.image || '/images/placeholder-banner.svg'} 
                    alt={currentBanner.bannerId} 
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Banner ID:</span> {currentBanner.bannerId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">URL:</span> 
                    <a href={currentBanner.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 ml-1">
                      {currentBanner.url}
                    </a>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Created:</span> {new Date(currentBanner.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && bannerToDelete && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Confirm Delete</h2>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete this banner?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Banner ID:</span> {bannerToDelete.bannerId}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">URL:</span> {bannerToDelete.url}
                </p>
              </div>
              <p className="text-red-600 text-sm mt-2">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setBannerToDelete(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteBanner}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default BannersPage;