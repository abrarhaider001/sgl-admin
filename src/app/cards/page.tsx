'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  FiEdit2, 
  FiTrash2, 
  FiEye, 
  FiSearch, 
  FiFilter, 
  FiChevronLeft, 
  FiChevronRight, 
  FiPlus,
  FiPackage,
  FiMove,
  FiGrid,
  FiList,
  FiX
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';
import ImageUpload from '@/components/ui/ImageUpload';
import CardImagesUpload from '@/components/ui/CardImagesUpload';
import { ImageUploadResult } from '@/services/imageService';

import { 
  Card, 
  Album,
  CardFilters,
  PaginationOptions,
  CardValidationError
} from '@/types/album';
import type { CardImages } from '@/types/card';
import type { CardImageVariant } from '@/components/ui/CardImagesUpload';
import { CreateCardRequest, UpdateCardRequest } from '@/services/cardService';
import { albumService } from '@/services/albumService';
import { cardService } from '@/services/cardService';



const CardsPage = () => {
  const { t } = useLanguage();

  
  // State management
  const [cards, setCards] = useState<Card[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [cardsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Card | null, direction: 'ascending' | 'descending' }>({ key: null, direction: 'ascending' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [imageUploadResult, setImageUploadResult] = useState<ImageUploadResult | null>(null);
  
  // Filters
  const [filters, setFilters] = useState<CardFilters>({});
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    points: 0,
    albumId: '',
    type: 'standard',
    rarity: 'common' as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary',
  });

  // Load data
  useEffect(() => {
    loadAlbums();
    loadCards();
  }, []);

  // Filter cards when search term, filters, or selected album changes
  useEffect(() => {
    filterCards();
  }, [cards, searchTerm, filters, selectedAlbum, sortConfig]);

  const loadAlbums = async () => {
    try {
      const response = await albumService.getAlbums({}, {
        page: 1,
        limit: 100,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      // Normalize identifier to ensure `id` exists even if API returns `albumId`
      const normalized = (response.data || []).map((a: any) => ({
        ...a,
        id: a?.id ?? a?.albumId,
      }));
      setAlbums(normalized);
    } catch (err) {
      console.error('Error loading albums:', err);
    }
  };

  const loadCards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await cardService.getCards({}, {
        page: 1,
        limit: 1000, // Load all for client-side filtering
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      setCards(response.data);
    } catch (err) {
      setError(t('cards.errorLoadCards'));
      console.error('Error loading cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterCards = () => {
    let result = [...cards];

    // Album filter
    if (selectedAlbum !== 'all') {
      result = result.filter(card => card.albumId === selectedAlbum);
    }

    // Search filter
    if (searchTerm) {
      result = result.filter(card =>
        card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }





    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];
        
        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredCards(result);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Get current cards for pagination
  const indexOfLastCard = currentPage * cardsPerPage;
  const indexOfFirstCard = indexOfLastCard - cardsPerPage;
  const currentCards = filteredCards.slice(indexOfFirstCard, indexOfLastCard);
  const totalPages = Math.ceil(filteredCards.length / cardsPerPage);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Request sort
  const requestSort = (key: keyof Card) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Filter handling logic can be added here if needed
  };

  // View card details
  const viewCardDetails = (card: Card) => {
    setSelectedCard(card);
    setShowCardModal(true);
  };

  // Card operations
  const editCard = (card: Card) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      description: card.description,
      imageUrl: card.image || '', // Map from image to imageUrl for form state
      points: card.points,
      albumId: card.albumId,
      type: card.type || 'standard',
      rarity: card.rarity || 'common',
    });
    
    // Set image upload result if card has an image
    if (card.image) {
      setImageUploadResult({ 
        url: card.image,
        originalName: 'existing-image',
        size: 0,
        type: 'image/jpeg'
      });
    }
    setShowEditModal(true);
  };

  const deleteCard = async (cardId: string) => {
    if (window.confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
      try {
        await cardService.deleteCard(cardId);
        await loadCards();
      } catch (err) {
        if (err instanceof CardValidationError) {
          setError(err.errors[0].message);
        } else {
          setError(t('cards.errorDeleteCard'));
        }
        console.error('Error deleting card:', err);
      }
    }
  };

  const saveCard = async () => {
    try {
      setError(null);
      
      // Validate albumId for new cards
      if (!editingCard && !formData.albumId) {
        setError(t('cards.errorSelectAlbum'));
        return;
      }
      
      if (editingCard) {
        // Update existing card
        await cardService.updateCard(editingCard.id, {
          name: formData.name,
          description: formData.description,
          image: imageUploadResult?.url || formData.imageUrl || null, // Map to image field, use null for empty
          points: formData.points,
          albumId: formData.albumId,
          type: formData.type,
          rarity: formData.rarity,
        });
      } else {
        // Create new card
        await cardService.createCard({
          // CardID will be auto-generated by the API
          albumId: formData.albumId,
          name: formData.name,
          description: formData.description,
          type: formData.type,
          rarity: formData.rarity,
          points: formData.points,
          image: imageUploadResult?.url || formData.imageUrl || null, // Map to image field, use null for empty
        });
      }
      
      setShowEditModal(false);
      setEditingCard(null);
      resetForm();
      await loadCards();
    } catch (err) {
      if (err instanceof CardValidationError) {
        setError(err.errors.map(e => e.message).join(', '));
      } else {
        setError(t('cards.errorSaveCard'));
      }
      console.error('Error saving card:', err);
    }
  };



  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      points: 0,
      albumId: selectedAlbum !== 'all' ? selectedAlbum : (albums.length > 0 ? albums[0].id : ''),
      type: 'standard',
      rarity: 'common',
    });
    setImageUploadResult(null);
    setImagesFiles({});
  };



  // Handle image upload
  const handleImageUpload = (result: ImageUploadResult | null) => {
    setImageUploadResult(result);
    setFormData(prev => ({
      ...prev,
      imageUrl: result?.url || ''
    }));
  };

  // Handle image upload error
  const handleImageError = (error: string) => {
    console.error('Image upload error:', error);
  };

  // Multi-variant image files state (for future Firebase integration)
  const [imagesFiles, setImagesFiles] = useState<Partial<Record<CardImageVariant, File>>>({});

  const getAlbumName = (albumId: string) => {
    const album = albums.find((a: any) => a?.id === albumId || a?.albumId === albumId);
    return album ? album.name : 'Unknown Album';
  };

  if (loading) {
    return (
      <MainLayout title="Cards">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t('cards.title')}>
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-primary">{t('cards.title')}</h1>
            <div className="flex items-center space-x-4 text-sm text-muted">
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="font-medium text-primary">{filteredCards.length}</span>
                <span>{t('cards.cardsTotal')}</span>
              </span>
              {selectedAlbum !== 'all' && (
                <span className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>{t('cards.inAlbum')} <span className="font-medium text-primary">{getAlbumName(selectedAlbum)}</span></span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingCard(null);
                resetForm();
                setShowEditModal(true);
              }}
              disabled={albums.length === 0}
              className={`${
                albums.length === 0 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium`}
              title={albums.length === 0 ? 'No albums available. Create an album first.' : ''}
            >
              <FiPlus size={18} />
              <span>{t('cards.addNew')}</span>
            </button>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-error rounded-full"></div>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}
        
        {/* Search and Filters */}
        <div className="card">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Album Selection */}
            <div className="min-w-0 flex-shrink-0">
              <label className="block text-sm font-semibold text-muted mb-2">
                {t('cards.albumCollection')}
              </label>
              <select
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="input min-w-[200px]"
              >
                <option value="all">{t('cards.allAlbums')} ({cards.length})</option>
                {albums.map((album: any) => {
                  const aid = album?.id ?? album?.albumId;
                  const albumCardCount = cards.filter(card => (card as any).albumId === aid).length;
                  return (
                    <option key={aid} value={aid}>
                      {album.name} ({albumCardCount}/{album?.capacity ?? 0})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-muted mb-2">
                {t('cards.searchCards')}
              </label>
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted" size={18} />
                <input
                  type="text"
                  placeholder={t('cards.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-12 pr-4"
                />
              </div>
            </div>

            {/* View Mode and Filters */}
            <div className="flex items-end gap-3">
              <div className="flex bg-surface-elevated rounded-xl p-1 border border-border-light">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 rounded-lg transition-all duration-200 ${
                    viewMode === 'grid'
                      ? 'bg-accent text-white shadow-md'
                      : 'text-muted hover:text-accent hover:bg-accent/10'
                  }`}
                  title="Grid View"
                >
                  <FiGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 rounded-lg transition-all duration-200 ${
                    viewMode === 'list'
                      ? 'bg-accent text-white shadow-md'
                      : 'text-muted hover:text-accent hover:bg-accent/10'
                  }`}
                  title="List View"
                >
                  <FiList size={18} />
                </button>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-secondary flex items-center space-x-2 ${
                  showFilters ? 'bg-accent/10 text-accent border-accent/20' : ''
                }`}
              >
                <FiFilter size={16} />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-border-light">
              <div className="flex gap-4 flex-wrap">

              </div>
            </div>
          )}
        </div>
        

        
        {/* Cards Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentCards.map((card, index) => {
              const keyVal = card.cardId ?? index;
              return (
                <div key={keyVal} className="card-hover group overflow-hidden">
                  {/* Card Image */}
                  <div className="relative h-48 bg-gradient-to-br from-surface-elevated to-surface overflow-hidden">
                    {(card as any).images?.bronze || card.image ? (
                      <Image 
                        src={((card as any).images?.bronze || card.image) as string} 
                        alt={card.name} 
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-accent/30">
                        <FiPackage className="text-accent" size={32} />
                      </div>
                    )}
                    

                    
                    {/* Points Badge */}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-white text-xs font-semibold">
                      {card.points} pts
                    </div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-5 space-y-4">
                    {/* Card ID */}
                    <div className="bg-blue-50 px-2 py-1 rounded text-xs border border-blue-200">
                      <span className="text-blue-600 font-medium">ID:</span>
                      <span className="ml-1 font-mono text-blue-800 font-semibold">{card.cardId}</span>
                    </div>
                    
                    {/* Header */}
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg text-primary line-clamp-1">{card.name}</h3>
                      <p className="text-sm text-muted line-clamp-2 leading-relaxed">{card.description}</p>
                    </div>
                    
                    {/* Metadata */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-end">
                        <div className="flex items-center space-x-1">
                          <FiPackage className="text-muted" size={12} />
                          <span className="text-xs text-muted truncate max-w-[100px]">
                            {getAlbumName(card.albumId)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => viewCardDetails(card)}
                        className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center space-x-1"
                        title="View Details"
                      >
                        <FiEye size={14} />
                        <span>View</span>
                      </button>
                      <button 
                        onClick={() => editCard(card)}
                        className="btn-success btn-sm p-2"
                        title="Edit Card"
                      >
                        <FiEdit2 size={14} />
                      </button>

                      <button 
                        onClick={() => deleteCard(card.id)}
                        className="p-2 rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all duration-200"
                        title="Delete Card"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-elevated border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:bg-surface transition-colors" onClick={() => requestSort('name')}>
                      <div className="flex items-center space-x-1">
                        <span>{t('cards.name')}</span>
                        {sortConfig.key === 'name' && (
                          <span className="text-accent">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                      {t('cards.cardId')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:bg-surface transition-colors" onClick={() => requestSort('points')}>
                      <div className="flex items-center space-x-1">
                        <span>{t('cards.points')}</span>
                        {sortConfig.key === 'points' && (
                          <span className="text-accent">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                      {t('cards.album')}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted uppercase tracking-wider">
                      {t('cards.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentCards.map((card, index) => {
                    const keyVal = card.cardId ?? card.id ?? index;
                    return (
                      <tr key={keyVal} className={`hover:bg-surface-elevated transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-surface/30'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-4">
                            <div className="relative h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-surface-elevated to-surface">
                              {(card as any).images?.bronze || card.image ? (
                                <Image 
                                  src={((card as any).images?.bronze || card.image) as string} 
                                  alt={card.name} 
                                  width={48}
                                  height={48}
                                  className="h-12 w-12 object-cover"
                                />
                              ) : (
                                <div className="h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-accent/30">
                                  <FiPackage className="text-accent" size={20} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-primary truncate">{card.name}</div>
                              <div className="text-sm text-muted line-clamp-1">{card.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="bg-blue-50 px-2 py-1 rounded text-xs border border-blue-200 inline-block">
                            <span className="font-mono text-blue-800 font-semibold">{card.cardId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-accent">{card.points} pts</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-1">
                            <FiPackage className="text-muted" size={14} />
                            <span className="text-sm text-muted truncate max-w-[120px]">{getAlbumName(card.albumId)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end items-center space-x-2">
                            <button 
                              onClick={() => viewCardDetails(card)}
                              className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all duration-200"
                              title="View Details"
                            >
                              <FiEye size={16} />
                            </button>
                            <button 
                              onClick={() => editCard(card)}
                              className="btn-success btn-sm p-2"
                              title="Edit Card"
                            >
                              <FiEdit2 size={16} />
                            </button>

                            <button 
                              onClick={() => deleteCard(card.id)}
                              className="p-2 rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all duration-200"
                              title="Delete Card"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card">
            <div className="flex items-center justify-between px-6 py-4">
              {/* Mobile Pagination */}
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                  disabled={currentPage === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                  disabled={currentPage === totalPages}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <FiChevronRight size={16} />
                </button>
              </div>
              
              {/* Desktop Pagination */}
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted">
                    Showing <span className="font-semibold text-primary">{indexOfFirstCard + 1}</span> to{' '}
                    <span className="font-semibold text-primary">{indexOfLastCard > filteredCards.length ? filteredCards.length : indexOfLastCard}</span> of{' '}
                    <span className="font-semibold text-primary">{filteredCards.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="flex items-center space-x-1" aria-label="Pagination">
                    <button
                      onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-border hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FiChevronLeft className="text-muted" size={18} />
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => paginate(pageNum)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              currentPage === pageNum
                                ? 'bg-accent text-white shadow-lg'
                                : 'text-muted hover:bg-surface-elevated hover:text-primary'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-border hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FiChevronRight className="text-muted" size={18} />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Card Details Modal */}
      {showCardModal && selectedCard && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <h2 className="text-2xl font-bold text-gray-900">{t('cards.cardDetails')}</h2>
              <button 
                onClick={() => setShowCardModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3">
                  <div className="relative aspect-[3/4] mb-4">
                    <Image 
                  src={selectedCard.image || '/images/placeholder-card.svg'} 
                  alt={selectedCard.name} 
                  fill
                  className="rounded-xl object-cover shadow-lg"
                    />
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-25 p-4 rounded-xl border border-blue-200 text-center">
                    <span className="text-sm text-gray-600 block mb-1">{t('cards.points')}</span>
                    <span className="text-2xl font-bold text-gray-900">{selectedCard.points}</span>
                  </div>
                </div>
                
                <div className="md:w-2/3 space-y-6">
                  <div>
                    <h3 className="text-3xl font-bold mb-4 text-gray-900">{selectedCard.name}</h3>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                      <span className="text-sm text-blue-600 font-medium">Card ID:</span>
                      <span className="ml-2 font-mono text-blue-800 font-semibold">{selectedCard.cardId}</span>
                    </div>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200">{selectedCard.description}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-blue-25 p-6 rounded-xl border border-blue-200">
                    <h4 className="font-bold mb-4 text-gray-900 text-lg">Album Information</h4>
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border border-gray-200">
                        <span className="text-sm text-gray-600 block mb-1">Current Album</span>
                        <span className="font-medium text-gray-900">{selectedCard.albumId ? albums.find((a: any) => a?.id === selectedCard.albumId || a?.albumId === selectedCard.albumId)?.name || 'Unknown Album' : 'No Album Assigned'}</span>
                      </div>

                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-25 p-6 rounded-xl border border-yellow-200">
                    <h4 className="font-bold mb-4 text-gray-900 text-lg">{t('cards.cardEvolution')}</h4>
                    <p className="text-gray-600 italic text-center">{t('cards.evolutionPlaceholder')}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <button 
                  onClick={() => {
                    setShowCardModal(false);
                    editCard(selectedCard);
                  }}
                  className="btn-primary"
                >
                  {t('cards.edit')}
                </button>
                <button 
                  onClick={() => setShowCardModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                >
                  {t('app.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Card Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-100 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl border border-gray-200 max-w-7xl w-[95vw] overflow-hidden">
            <div className="p-8 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {editingCard ? t('cards.editCard') : t('cards.addCard')}
                </h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-full bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Card ID Field */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Card ID</label>
                  {editingCard ? (
                    <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50">
                      <span className="font-mono text-blue-800 font-semibold">{editingCard.cardId}</span>
                    </div>
                  ) : (
                    <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600">
                      <span className="text-sm">Auto-generated when card is created</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('cards.name')}</label>
                  <input 
                    type="text" 
                    value={editingCard ? editingCard.name : formData.name}
                    onChange={(e) => {
                      if (editingCard) {
                        setEditingCard({...editingCard, name: e.target.value});
                      } else {
                        setFormData({...formData, name: e.target.value});
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 backdrop-blur-sm transition-all duration-200"
                    placeholder="Enter card name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('cards.description')}</label>
                  <textarea 
                    value={editingCard ? editingCard.description : formData.description}
                    onChange={(e) => {
                      if (editingCard) {
                        setEditingCard({...editingCard, description: e.target.value});
                      } else {
                        setFormData({...formData, description: e.target.value});
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 backdrop-blur-sm transition-all duration-200 resize-none h-24"
                    placeholder="Enter card description"
                  />
                </div>
                

                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Album Assignment</label>
                  <select 
                    value={editingCard ? editingCard.albumId || '' : formData.albumId}
                    onChange={(e) => {
                      const albumId = e.target.value || '';
                      if (editingCard) {
                        setEditingCard({...editingCard, albumId: albumId || editingCard.albumId});
                      } else {
                        setFormData({...formData, albumId});
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 backdrop-blur-sm transition-all duration-200"
                  >
                    <option value="">No Album</option>
                    {albums.map((album: any) => {
                      const aid = album?.id ?? album?.albumId;
                      return (
                        <option key={aid} value={aid}>{album.name}</option>
                      );
                    })}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700">{t('cards.cardImages')}</label>
      <p className="text-xs text-gray-500 mb-2">{t('cards.uploadVariantsHelp')}</p>
                  <CardImagesUpload
                    value={(editingCard as any)?.images as Partial<CardImages>}
                    onChange={setImagesFiles}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('cards.points')}</label>
                  <input 
                    type="number" 
                    value={editingCard ? editingCard.points : formData.points}
                    onChange={(e) => {
                      if (editingCard) {
                        setEditingCard({...editingCard, points: parseInt(e.target.value) || 0});
                      } else {
                        setFormData({...formData, points: parseInt(e.target.value) || 0});
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 backdrop-blur-sm transition-all duration-200"
                    min="0"
                    placeholder="Enter points"
                  />
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-4">
                <button 
                  onClick={() => saveCard()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('app.save')}</span>
                </button>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary"
                >
                  {t('app.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default CardsPage;