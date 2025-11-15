'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  FiEdit2, 
  FiTrash2, 
  FiEye, 
  FiSearch, 
  FiPlus,
  FiLoader,
  FiX,
  FiImage,
  FiAlertCircle,
  FiBook
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';
import ImageUpload from '@/components/ui/ImageUpload';
import { ImageUploadResult } from '@/services/imageService';
import { firebaseAlbumService } from '@/services/firebaseAlbumService';
import Snackbar from '@/components/ui/Snackbar';
import { useSnackbar } from '@/hooks/useSnackbar';

import { 
  Album
} from '@/types/album';

const AlbumsPage = () => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  // State management
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [deletingAlbum, setDeletingAlbum] = useState<Album | null>(null);
  const [imageUploadResult, setImageUploadResult] = useState<ImageUploadResult | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    albumId: '',
    name: '',
    image: ''
  });
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Firebase service instance
  // const firebaseAlbumService = new FirebaseAlbumService();

  // Load data
  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await firebaseAlbumService.getAlbums();
      if (response.success && response.albums) {
        setAlbums(response.albums);
      } else {
        setError(response.error || 'Failed to load albums');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load albums');
    } finally {
      setLoading(false);
    }
  };

  // Filter albums based on search term
  const filteredAlbums = albums.filter(album => 
    album.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (album.albumId && album.albumId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Album name is required';
    }
    
    if (!formData.albumId.trim()) {
      errors.albumId = 'Album ID is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      albumId: '',
      name: '',
      image: ''
    });
    setValidationErrors({});
    setImageUploadResult(null);
    setError(null);
  };

  const handleImageUpload = (result: ImageUploadResult | null) => {
    setImageUploadResult(result);
    setFormData(prev => ({
      ...prev,
      image: result?.url || ''
    }));
  };

  const handleCreateAlbum = async () => {
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await firebaseAlbumService.createAlbum({
        albumId: formData.albumId,
        name: formData.name,
        image: imageUploadResult?.url || formData.image || undefined,
        cardIds: []
      });
      
      if (response.success) {
        await loadAlbums();
        setShowCreateModal(false);
        resetForm();
        showSnackbar('Album created successfully!', 'success');
      } else {
        setError(response.error || 'Failed to create album');
        showSnackbar(response.error || 'Failed to create album', 'error');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create album');
      showSnackbar(err.message || 'Failed to create album', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!deletingAlbum) return;
    
    try {
      setSubmitting(true);
      const response = await firebaseAlbumService.deleteAlbum(deletingAlbum.albumId!);
      if (response.success) {
        await loadAlbums();
        setShowDeleteModal(false);
        setDeletingAlbum(null);
        showSnackbar('Album deleted successfully!', 'success');
      } else {
        setError(response.error || 'Failed to delete album');
        showSnackbar(response.error || 'Failed to delete album', 'error');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete album');
      showSnackbar(err.message || 'Failed to delete album', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (album: Album) => {
    setDeletingAlbum(album);
    setShowDeleteModal(true);
  };

  const handleUpdateAlbum = async () => {
    if (!editingAlbum || !validateForm()) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await firebaseAlbumService.updateAlbum(editingAlbum.albumId!, {
        name: formData.name,
        image: imageUploadResult?.url || formData.image || undefined
      });
      
      if (response.success) {
        await loadAlbums();
        setShowCreateModal(false);
        setEditingAlbum(null);
        resetForm();
        showSnackbar('Album updated successfully!', 'success');
      } else {
        setError(response.error || 'Failed to update album');
        showSnackbar(response.error || 'Failed to update album', 'error');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update album');
      showSnackbar(err.message || 'Failed to update album', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAlbum = (album: Album) => {
    setEditingAlbum(album);
    setFormData({
      albumId: album.albumId || '',
      name: album.name,
      image: album.image || ''
    });
    
    // Set image upload result if album has an image
    if (album.image) {
      setImageUploadResult({ 
        url: album.image,
        originalName: 'existing-image',
        size: 0,
        type: 'image/jpeg'
      });
    }
    setShowCreateModal(true);
  };

  const navigateToAlbumCards = (albumId: string) => {
    router.push(`/albums/${albumId}/cards`);
  };

  return (
    <MainLayout title={t('albums.title')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FiBook size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('albums.title')}</h1>
              <p className="text-gray-600 mt-1">{t('albums.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <FiPlus className="mr-2" size={20} />
            {t('albums.addNew')}
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={t('albums.searchPlaceholder')}
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Albums Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FiLoader className="animate-spin text-blue-600 mr-2" size={24} />
              <span className="text-gray-600">{t('albums.loading')}</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-red-600 mb-2">{t('albums.errorLoading')}</div>
                <div className="text-gray-600 text-sm">{error}</div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('albums.header.image')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('albums.header.albumId')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('albums.header.name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('albums.header.cardsCount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('albums.header.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAlbums.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        {t('albums.noResults')}
                      </td>
                    </tr>
                  ) : (
                    filteredAlbums.map((album) => (
                      <tr 
                        key={album.albumId} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigateToAlbumCards(album.albumId!)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                            {album.image ? (
                              <Image
                                src={album.image}
                                alt={album.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FiImage className="text-gray-400" size={20} />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {album.albumId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {album.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {album.cardIds?.length || 0} {t('albums.cards')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToAlbumCards(album.albumId!);
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                              title="View Cards"
                            >
                              <FiEye size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAlbum(album);
                              }}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors"
                              title="Edit Album"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(album);
                              }}
                              className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                              title="Delete Album"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Album Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingAlbum ? 'Edit Album' : 'Create Album'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingAlbum(null);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
                    <FiAlertCircle className="text-red-500 mr-2" size={16} />
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Album ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Album ID *
                    </label>
                    <input
                      type="text"
                      value={formData.albumId}
                      onChange={(e) => setFormData({...formData, albumId: e.target.value})}
                      disabled={!!editingAlbum}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.albumId ? 'border-red-300' : 'border-gray-300'
                      } ${editingAlbum ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="Enter unique album ID..."
                    />
                    {validationErrors.albumId && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.albumId}</p>
                    )}
                  </div>

                  {/* Album Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Album Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter album name..."
                    />
                    {validationErrors.name && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.name}</p>
                    )}
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Album Image (Optional)
                    </label>
                    <ImageUpload
                      onChange={handleImageUpload}
                      onError={(error) => setError(error)}
                      existingImageUrl={imageUploadResult?.url || formData.image || ''} 
                      context="album"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingAlbum(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingAlbum ? handleUpdateAlbum : handleCreateAlbum}
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {submitting && <FiLoader className="animate-spin mr-2" size={16} />}
                    {editingAlbum ? 'Update Album' : 'Create Album'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingAlbum && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Delete Album
                  </h2>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingAlbum(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                      <FiAlertCircle className="text-red-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Are you sure?
                      </h3>
                      <p className="text-gray-600 text-sm">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center mr-3">
                        {deletingAlbum.image ? (
                          <Image
                            src={deletingAlbum.image}
                            alt={deletingAlbum.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiImage className="text-gray-400" size={16} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{deletingAlbum.name}</p>
                        <p className="text-sm text-gray-600">ID: {deletingAlbum.albumId}</p>
                        <p className="text-sm text-gray-600">
                          {deletingAlbum.cardIds?.length || 0} cards will also be affected
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingAlbum(null);
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAlbum}
                    disabled={submitting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {submitting && <FiLoader className="animate-spin mr-2" size={16} />}
                    Delete Album
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Snackbar */}
      <Snackbar
        show={snackbar.show}
        message={snackbar.message}
        type={snackbar.type}
        onClose={hideSnackbar}
      />
    </MainLayout>
  );
};

export default AlbumsPage;
