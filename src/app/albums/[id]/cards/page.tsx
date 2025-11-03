'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  FiArrowLeft,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiImage,
  FiX,
  FiSave,
  FiLoader
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import ImageUpload from '@/components/ui/ImageUpload';
import CardImagesUpload from '@/components/ui/CardImagesUpload';
import Snackbar from '@/components/ui/Snackbar';
import { useSnackbar } from '@/hooks/useSnackbar';
import { Album } from '@/types/album';
import type { Card, CreateCardRequest, UpdateCardRequest, CardImages } from '@/types/card';
import type { CardImageVariant } from '@/components/ui/CardImagesUpload';
interface ImageUploadResult {
  url: string;
  path: string;
  name: string;
}
import { firebaseAlbumService } from '@/services/firebaseAlbumService';
import { firebaseCardService } from '@/services/firebaseCardService';
import { useLanguage } from '@/context/LanguageContext';

const AlbumCardsPage = () => {
  const router = useRouter();
  const params = useParams();
  const albumId = params.id as string;
  const { t } = useLanguage();

  // State management
  const [album, setAlbum] = useState<Album | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCard, setDeletingCard] = useState<Card | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateCardRequest>({
    cardID: '',
    name: '',
    description: '',
    imageUrl: '',
    points: 10
  });
  const [imageUploadResult, setImageUploadResult] = useState<ImageUploadResult | null>(null);
  const [imagesFiles, setImagesFiles] = useState<Partial<Record<CardImageVariant, File>>>({});

  // Snackbar hook
  const { snackbar, showSnackbar, hideSnackbar } = useSnackbar();

  // Load data
  useEffect(() => {
    if (albumId) {
      loadAlbumAndCards();
    }
  }, [albumId]);

  // Filter cards
  useEffect(() => {
    const filtered = cards.filter(card => 
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.cardID.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCards(filtered);
  }, [cards, searchTerm]);

  const loadAlbumAndCards = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load album details
      const albumResponse = await firebaseAlbumService.getAlbum(albumId);
      if (!albumResponse.success || !albumResponse.album) {
        setError(albumResponse.error || t('albums.notFound'));
        return;
      }
      setAlbum(albumResponse.album);

      // Load cards for this album
      if (albumResponse.album.cardIds && albumResponse.album.cardIds.length > 0) {
        const cardsData = await firebaseCardService.getCardsByIds(albumResponse.album.cardIds);
        setCards(cardsData);
      } else {
        setCards([]);
      }
    } catch (err) {
      console.error('Error loading album and cards:', err);
      setError(t('albums.errorLoadAlbumCards'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Validate required fields
      if (!formData.cardID.trim() || !formData.name.trim()) {
        setError(t('cards.requiredIdName'));
        showSnackbar(t('cards.requiredIdName'), 'error');
        return;
      }

      // Use uploaded image(s) if available
      const cardData: CreateCardRequest = {
        ...formData,
        imageUrl: imageUploadResult?.url || formData.imageUrl || ''
      };

      // If all five variants are provided, create with images; otherwise fallback to legacy single image
      const requiredVariants: (keyof CardImages)[] = ['bronze', 'silver', 'gold', 'titanium', 'diamond'];
      const hasAllVariants = requiredVariants.every(v => !!imagesFiles[v as CardImageVariant]);

      if (hasAllVariants) {
        await firebaseCardService.createCardWithImages(
          cardData,
          imagesFiles as { [key in keyof CardImages]: File }
        );
      } else {
        await firebaseCardService.createCard(cardData);
      }

      // Update album's cardIds array
      const updatedCardIds = [...(album?.cardIds || []), formData.cardID];
      await firebaseAlbumService.updateAlbum(albumId, { cardIds: updatedCardIds });

      // Reload data
      await loadAlbumAndCards();

      // Reset form
      resetForm();
      setShowCreateModal(false);
      showSnackbar(t('cards.createSuccess'), 'success');
    } catch (err: any) {
      console.error('Error creating card:', err);
      setError(err.message || t('cards.errorCreateCard'));
      showSnackbar(err.message || t('cards.errorCreateCard'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCard = async () => {
    if (!editingCard) return;

    try {
      setSubmitting(true);
      setError(null);

      const updates: UpdateCardRequest = {
        name: formData.name,
        description: formData.description,
        points: formData.points,
        imageUrl: imageUploadResult?.url || formData.imageUrl
      };

      // If any variant files provided, update with images; else legacy update
      if (Object.keys(imagesFiles).length > 0) {
        await firebaseCardService.updateCardWithImages(
          editingCard.cardID,
          updates,
          imagesFiles as { [key in keyof Partial<CardImages>]: File }
        );
      } else {
        await firebaseCardService.updateCard(editingCard.cardID, updates);
      }
      await loadAlbumAndCards();

      resetForm();
      setEditingCard(null);
      setShowCreateModal(false);
      showSnackbar(t('cards.updateSuccess'), 'success');
    } catch (err: any) {
      console.error('Error updating card:', err);
      setError(err.message || t('cards.errorUpdateCard'));
      showSnackbar(err.message || t('cards.errorUpdateCard'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!deletingCard) return;

    try {
      setSubmitting(true);
      setError(null);

      // Delete the card
      await firebaseCardService.deleteCard(deletingCard.cardID);

      // Update album's cardIds array
      const updatedCardIds = (album?.cardIds || []).filter(id => id !== deletingCard.cardID);
      await firebaseAlbumService.updateAlbum(albumId, { cardIds: updatedCardIds });

      // Reload data
      await loadAlbumAndCards();

      setShowDeleteModal(false);
      setDeletingCard(null);
      showSnackbar(t('cards.deleteSuccess'), 'success');
    } catch (err: any) {
      console.error('Error deleting card:', err);
      setError(err.message || t('cards.errorDeleteCard'));
      showSnackbar(err.message || t('cards.errorDeleteCard'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCard = (card: Card) => {
    setEditingCard(card);
    setFormData({
      cardID: card.cardID,
      name: card.name,
      description: card.description,
      imageUrl: card.imageUrl,
      points: card.points
    });
    setImageUploadResult(null);
    setImagesFiles({});
    setShowCreateModal(true);
  };

  const handleDeleteClick = (card: Card) => {
    setDeletingCard(card);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      cardID: '',
      name: '',
      description: '',
      imageUrl: '',
      points: 10
    });
    setImageUploadResult(null);
    setEditingCard(null);
    setImagesFiles({});
  };

  const handleImageUpload = (result: ImageUploadResult) => {
    setImageUploadResult(result);
  };

  // Do not block the whole page while loading; show loader inside grid

  if (error && !album) {
    return (
      <MainLayout title={t('app.error')}>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/albums')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← {t('albums.backToAlbums')}
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`${t('albums.cards')} - ${album?.name || t('albums.title')}` }>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/albums')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <FiArrowLeft className="mr-2" />
              {t('albums.backToAlbums')}
            </button>
            <div>
              <p className="text-gray-600">{`${cards.length} ${t('cards.countLabel')}`}</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <FiPlus className="mr-2" />
            {t('cards.createCard')}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('cards.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Cards Grid */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FiLoader className="animate-spin text-blue-600 mr-2" size={24} />
              <span className="text-gray-600">{t('cards.fetchingCards')}</span>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FiImage className="mx-auto text-gray-400 mb-4" size={48} />
                <div className="text-gray-600 mb-2">{t('cards.noCardsFound')}</div>
                <div className="text-gray-500 text-sm">
                  {searchTerm ? t('cards.tryAdjustingSearch') : t('albums.startAddingCards')}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
              {filteredCards.map((card) => (
                <div 
                  key={card.cardID} 
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/codes?cardId=${card.cardID}`)}
                >
                  <div className="aspect-square bg-gray-100 relative">
                    {(card.images?.bronze || card.imageUrl) ? (
                      <Image
                        src={(card.images?.bronze || card.imageUrl) as string}
                        alt={card.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <FiImage className="text-gray-400" size={48} />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">{card.name}</h3>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {card.points} {t('cards.points')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{card.description}</p>
                    <p className="text-xs text-gray-500 mb-3">{t('cards.cardId')}: {card.cardID}</p>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCard(card);
                        }}
                        className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-sm"
                      >
                        <FiEdit2 size={14} className="mr-1" />
                        {t('app.edit')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(card);
                        }}
                        className="bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center text-sm"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Create/Edit Card Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-6xl w-[95vw] overflow-hidden border border-gray-200 shadow-2xl">
              <div className="p-6 max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingCard ? t('cards.editCard') : t('cards.createCard')}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                {/* Two-column layout: fields on the left, image variants upload on the right */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left: Form Fields */}
                  <div className="space-y-4">
                    {/* Card ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('cards.cardId')} *
                      </label>
                      <input
                        type="text"
                        value={formData.cardID}
                        onChange={(e) => setFormData({ ...formData, cardID: e.target.value })}
                        disabled={!!editingCard}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        placeholder={t('cards.enterUniqueCardId')}
                      />
                    </div>

                    {/* Card Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('cards.name')} *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('cards.enterCardName')}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('cards.description')}
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('cards.enterDescription')}
                      />
                    </div>

                    {/* Points */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('cards.points')}
                      </label>
                      <input
                        type="number"
                        value={formData.points}
                        onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Right: Multi-variant Card Images Upload */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700">
                        {t('cards.cardImages')}
                      </label>
        <p className="text-xs text-gray-500">{t('cards.uploadVariantsHelp')}</p>
                    </div>
                    <CardImagesUpload
                      value={editingCard?.images}
                      onChange={setImagesFiles}
                      disabled={submitting}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={submitting}
                  >
                    {t('app.cancel')}
                  </button>
                  <button
                    onClick={editingCard ? handleUpdateCard : handleCreateCard}
                    disabled={submitting || !formData.cardID.trim() || !formData.name.trim()}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <FiSave className="mr-2" />
                        {editingCard ? t('app.update') : t('app.create')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingCard && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{t('cards.deleteCard')}</h2>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingCard(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      {deletingCard.imageUrl ? (
                        <Image
                          src={deletingCard.imageUrl}
                          alt={deletingCard.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <FiImage className="text-gray-400" size={24} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{deletingCard.name}</h3>
                      <p className="text-sm text-gray-600">{t('cards.cardId')}: {deletingCard.cardID}</p>
                      <p className="text-sm text-gray-600">{deletingCard.points} {t('cards.points')}</p>
                    </div>
                  </div>
                  <p className="text-gray-600">
                    {t('cards.deleteConfirmExtended')}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingCard(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={submitting}
                  >
                    {t('app.cancel')}
                  </button>
                  <button
                    onClick={handleDeleteCard}
                    disabled={submitting}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      t('cards.deleteCard')
                    )}
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

export default AlbumCardsPage;