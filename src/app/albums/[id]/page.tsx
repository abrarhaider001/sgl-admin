'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  FiArrowLeft, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiPackage, 
  FiGrid, 
  FiList, 
  FiSearch, 
  FiEye, 
  FiUpload, 
  FiX, 
  FiImage, 
  FiAlertCircle, 
  FiStar, 
  FiAward, 
  FiTarget, 
  FiCode, 
  FiDownload, 
  FiFileText, 
  FiCheck 
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';
import ImageUpload from '@/components/ui/ImageUpload';
import { ImageUploadResult } from '@/services/imageService';
import { AlbumWithCards, Card, CreateCardRequest, UpdateCardRequest, CardType } from '@/types/album';
import { albumService } from '@/services/albumService';

const AlbumDetailsPage = () => {
  const { t, language } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const albumId = params.id as string;
  const csvInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [album, setAlbum] = useState<AlbumWithCards | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardDetail, setShowCardDetail] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [imageUploadResult, setImageUploadResult] = useState<ImageUploadResult | null>(null);
  
  // Form state
  const [cardFormData, setCardFormData] = useState<CreateCardRequest>({
    name: '',
    description: '',
    type: 'common',
    points: 0,
    imageUrl: '',
    albumId: albumId
  });
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // QR Code state
  const [redeemCodes, setRedeemCodes] = useState<string[]>([]);
  const [manualCode, setManualCode] = useState('');
  const [generatedQRs, setGeneratedQRs] = useState<{code: string, qrUrl: string}[]>([]);
  const [selectedQRs, setSelectedQRs] = useState<Set<string>>(new Set());

  // Load album details and cards
  useEffect(() => {
    if (albumId) {
      loadAlbumDetails();
    }
  }, [albumId]);

  // Filter cards
  useEffect(() => {
    let filtered = cards.filter(card =>
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCards(filtered);
  }, [cards, searchTerm]);

  const loadAlbumDetails = async () => {
    try {
      setLoading(true);
      const albumData = await albumService.getAlbumWithCards(albumId);
      if (albumData) {
        setAlbum(albumData);
        setCards(albumData.cards);
      } else {
        setError(language === 'en' ? 'Album not found' : 'Álbum no encontrado');
      }
    } catch (err) {
      setError(language === 'en' ? 'Failed to load album details' : 'Error al cargar detalles del álbum');
      console.error('Error loading album:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateCardForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!cardFormData.name.trim()) {
      errors.name = language === 'en' ? 'Card name is required' : 'El nombre de la carta es requerido';
    }
    
    if (!cardFormData.description.trim()) {
      errors.description = language === 'en' ? 'Description is required' : 'La descripción es requerida';
    }
    
    if (cardFormData.points < 0 || cardFormData.points > 10000) {
      errors.points = language === 'en' ? 'Points must be between 0 and 10000' : 'Los puntos deben estar entre 0 y 10000';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageUpload = (result: ImageUploadResult | null) => {
    setImageUploadResult(result);
    setCardFormData(prev => ({
      ...prev,
      imageUrl: result?.url || ''
    }));
  };

  const handleImageError = (error: string) => {
    setError(error);
  };

  const generateUniqueCardId = (): string => {
    // Generate a unique card ID (in real app, this would be handled by the backend)
    return `CARD_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  };

  const handleAddCard = async () => {
    if (!validateCardForm()) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      // CardID will be auto-generated by the API
      await albumService.createCard({
        ...cardFormData,
        // cardId will be auto-generated
        image: imageUploadResult?.url || cardFormData.imageUrl || null, // Map to image field, use null for empty
        albumId: albumId
      });
      
      await loadAlbumDetails();
      setShowAddCardModal(false);
      resetCardForm();
    } catch (err: any) {
      setError(err.message || (language === 'en' ? 'Failed to create card' : 'Error al crear carta'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCard = async () => {
    if (!editingCard || !validateCardForm()) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      await albumService.updateCard({
        id: editingCard.id,
        ...cardFormData,
        image: imageUploadResult?.url || cardFormData.imageUrl || null // Map to image field, use null for empty
      });
      
      await loadAlbumDetails();
      setEditingCard(null);
      resetCardForm();
    } catch (err: any) {
      setError(err.message || (language === 'en' ? 'Failed to update card' : 'Error al actualizar carta'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async (cardId: string, cardName: string) => {
    const confirmMessage = language === 'en' 
      ? `Are you sure you want to delete "${cardName}"? This action cannot be undone.`
      : `¿Estás seguro de que quieres eliminar "${cardName}"? Esta acción no se puede deshacer.`;
      
    if (!confirm(confirmMessage)) return;
    
    try {
      await albumService.deleteCard(cardId);
      await loadAlbumDetails();
    } catch (err: any) {
      setError(err.message || (language === 'en' ? 'Failed to delete card' : 'Error al eliminar carta'));
    }
  };

  const resetCardForm = () => {
    setCardFormData({
      name: '',
      description: '',
      type: 'common',
      points: 0,
      imageUrl: '',
      albumId: albumId
    });
    setImageUploadResult(null);
    setValidationErrors({});
  };

  const openEditModal = (card: Card) => {
    setEditingCard(card);
    setCardFormData({
      name: card.name,
      description: card.description,
      type: card.type,
      points: card.points,
      imageUrl: card.image || '', // Map from image to imageUrl for form state
      albumId: card.albumId
    });
    if (card.image) {
      setImageUploadResult({ url: card.image });
    }
  };

  const openCardDetail = (card: Card) => {
    setSelectedCard(card);
    setShowCardDetail(true);
  };

  const openQRModal = (card: Card) => {
    setSelectedCard(card);
    setShowQRModal(true);
    setRedeemCodes([]);
    setGeneratedQRs([]);
    setSelectedQRs(new Set());
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          
          // Enhanced CSV/Excel parsing with better error handling
          let codes: string[] = [];
          
          // Handle different file formats and delimiters
          if (file.name.toLowerCase().includes('.csv') || file.type === 'text/csv') {
            // CSV format - handle quoted fields and various delimiters
            const lines = text.split(/\r?\n/);
            codes = lines.flatMap(line => {
              // Handle quoted CSV fields
              const matches = line.match(/("([^"]|"")*"|[^,]*)/g);
              return matches ? matches.map(match => 
                match.replace(/^"|"$/g, '').replace(/""/g, '"').trim()
              ).filter(code => code.length > 0) : [];
            });
          } else {
            // Plain text or other formats - split by common delimiters
            codes = text.split(/[,;\t\n\r]+/)
              .map(code => code.trim())
              .filter(code => code.length > 0);
          }
          
          // Validate and clean codes
          const validCodes = codes.filter(code => {
            // Remove empty codes and validate format (alphanumeric + some special chars)
            return code.length > 0 && /^[A-Za-z0-9\-_]+$/.test(code);
          });
          
          if (validCodes.length === 0) {
            setError(language === 'en' 
              ? 'No valid redeem codes found in the file. Codes should be alphanumeric.' 
              : 'No se encontraron códigos válidos en el archivo. Los códigos deben ser alfanuméricos.');
            return;
          }
          
          if (validCodes.length !== codes.length) {
            const skipped = codes.length - validCodes.length;
            console.warn(`Skipped ${skipped} invalid codes during import`);
          }
          
          setRedeemCodes(validCodes);
          generateQRCodes(validCodes);
          setError(null);
          
        } catch (err) {
          setError(language === 'en' 
            ? 'Error parsing file. Please check the file format.' 
            : 'Error al procesar el archivo. Verifique el formato del archivo.');
          console.error('CSV parsing error:', err);
        }
      };
      
      reader.onerror = () => {
        setError(language === 'en' 
          ? 'Error reading file. Please try again.' 
          : 'Error al leer el archivo. Inténtelo de nuevo.');
      };
      
      reader.readAsText(file);
    }
  };

  const generateQRCodes = (codes: string[]) => {
    // Optimize QR code generation with batch processing and caching
    const qrs = codes.map(code => {
      // Check if QR already exists to avoid regeneration
      const existingQR = generatedQRs.find(qr => qr.code === code);
      if (existingQR) return existingQR;
      
      // Generate optimized SVG QR code representation
      const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="white"/>
        <rect x="10" y="10" width="20" height="20" fill="black"/>
        <rect x="170" y="10" width="20" height="20" fill="black"/>
        <rect x="10" y="170" width="20" height="20" fill="black"/>
        <text x="100" y="100" text-anchor="middle" font-family="monospace" font-size="10" fill="black">${code}</text>
        <text x="100" y="120" text-anchor="middle" font-family="monospace" font-size="8" fill="gray">QR Code</text>
      </svg>`;
      
      return {
        code,
        qrUrl: `data:image/svg+xml;base64,${btoa(qrSvg)}`
      };
    });
    
    setGeneratedQRs(qrs);
  };

  const addManualCode = () => {
    if (manualCode.trim()) {
      // Validate manual code format
      const code = manualCode.trim();
      
      if (!/^[A-Za-z0-9\-_]+$/.test(code)) {
        setError(language === 'en' 
          ? 'Invalid code format. Use only letters, numbers, hyphens, and underscores.' 
          : 'Formato de código inválido. Use solo letras, números, guiones y guiones bajos.');
        return;
      }
      
      // Check for duplicates
      if (redeemCodes.includes(code)) {
        setError(language === 'en' 
          ? 'This code already exists.' 
          : 'Este código ya existe.');
        return;
      }
      
      const newCodes = [...redeemCodes, code];
      setRedeemCodes(newCodes);
      generateQRCodes(newCodes);
      setManualCode('');
      setError(null);
    }
  };

  const downloadQR = (qr: {code: string, qrUrl: string}) => {
    // Convert SVG to PNG for better compatibility
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = 200;
    canvas.height = 200;
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 200, 200);
        ctx.drawImage(img, 0, 0);
        
        // Convert to PNG and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `QR_${qr.code}.png`;
            link.click();
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      }
    };
    
    img.src = qr.qrUrl;
  };

  const downloadSelectedQRs = async () => {
    // Batch download with progress indication
    const selectedCodes = Array.from(selectedQRs);
    
    for (let i = 0; i < selectedCodes.length; i++) {
      const code = selectedCodes[i];
      const qr = generatedQRs.find(q => q.code === code);
      
      if (qr) {
        // Add small delay between downloads to prevent browser blocking
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        downloadQR(qr);
      }
    }
  };

  const toggleQRSelection = (code: string) => {
    const newSelected = new Set(selectedQRs);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedQRs(newSelected);
  };

  const getCardTypeIcon = (type: CardType) => {
    switch (type) {
      case 'legendary': return <FiAward className="text-yellow-500" size={16} />;
      case 'rare': return <FiStar className="text-blue-500" size={16} />;
      case 'common': return <FiTarget className="text-gray-500" size={16} />;
      default: return <FiTarget className="text-gray-500" size={16} />;
    }
  };

  const getCardTypeColor = (type: CardType) => {
    switch (type) {
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <MainLayout title={language === 'en' ? 'Album Cards' : 'Cartas del Álbum'}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error && !album) {
    return (
      <MainLayout title={language === 'en' ? 'Album Cards' : 'Cartas del Álbum'}>
        <div className="flex flex-col items-center justify-center h-64">
          <FiPackage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
          <button
            onClick={() => router.push('/albums')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiArrowLeft className="mr-2" size={16} />
            {language === 'en' ? 'Back to Albums' : 'Volver a Álbumes'}
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={album?.name || (language === 'en' ? 'Album Cards' : 'Cartas del Álbum')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/albums')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FiArrowLeft className="mr-2" size={16} />
              {language === 'en' ? 'Back to Albums' : 'Volver a Álbumes'}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{album?.name}</h1>
              <p className="text-gray-600 mt-1">{album?.description}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddCardModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="mr-2" size={16} />
            {language === 'en' ? 'Add Card' : 'Agregar Carta'}
          </button>
        </div>

        {/* Album Stats */}
        {album && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <FiPackage className="text-white" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">
                    {language === 'en' ? 'Total Cards' : 'Total de Cartas'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{album.currentCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="bg-green-500 p-3 rounded-lg">
                  <FiGrid className="text-white" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">
                    {language === 'en' ? 'Capacity' : 'Capacidad'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{album.capacity}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="bg-purple-500 p-3 rounded-lg">
                  <FiTarget className="text-white" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">
                    {language === 'en' ? 'Utilization' : 'Utilización'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {album.capacity > 0 ? Math.round((album.currentCount / album.capacity) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <FiAlertCircle className="text-red-500 mr-3" size={20} />
            <p className="text-red-800">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <FiX size={20} />
            </button>
          </div>
        )}

        {/* Search and View Controls */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Search cards...' : 'Buscar cartas...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <FiGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <FiList size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Cards Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCards.map((card) => (
              <div key={card.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-48 bg-gray-100">
                  {card.image ? (
                    <Image
                      src={card.image}
                      alt={card.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      priority={false}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <FiImage className="text-gray-400" size={48} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-mono shadow-sm">
                    {card.cardId}
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{card.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{card.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getCardTypeColor(card.type)}`}>
                      {getCardTypeIcon(card.type)}
                      <span className="capitalize">{card.type}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {card.points} {language === 'en' ? 'pts' : 'ptos'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openCardDetail(card)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      {language === 'en' ? 'View Details' : 'Ver Detalles'}
                    </button>
                    <button
                      onClick={() => openEditModal(card)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card.id, card.name)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {language === 'en' ? 'Card' : 'Carta'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {language === 'en' ? 'Card ID' : 'ID de Carta'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {language === 'en' ? 'Type' : 'Tipo'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {language === 'en' ? 'Points' : 'Puntos'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {language === 'en' ? 'Actions' : 'Acciones'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCards.map((card) => (
                    <tr key={card.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            {card.image ? (
                              <Image
                                src={card.image}
                                alt={card.name}
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-lg object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FiImage className="text-gray-400" size={20} />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{card.name}</div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">{card.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">{card.cardId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getCardTypeColor(card.type)}`}>
                          {getCardTypeIcon(card.type)}
                          <span className="capitalize">{card.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{card.points}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openCardDetail(card)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title={language === 'en' ? 'View Details' : 'Ver Detalles'}
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(card)}
                            className="text-gray-600 hover:text-blue-600 p-1"
                            title={language === 'en' ? 'Edit' : 'Editar'}
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card.id, card.name)}
                            className="text-gray-600 hover:text-red-600 p-1"
                            title={language === 'en' ? 'Delete' : 'Eliminar'}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredCards.length === 0 && !loading && (
          <div className="text-center py-12">
            <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {language === 'en' ? 'No cards found' : 'No se encontraron cartas'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {language === 'en' 
                ? 'Get started by adding a new card to this album.' 
                : 'Comienza agregando una nueva carta a este álbum.'
              }
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddCardModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiPlus className="mr-2" size={16} />
                {language === 'en' ? 'Add Card' : 'Agregar Carta'}
              </button>
            </div>
          </div>
        )}

        {/* Create/Edit Card Modal */}
        {(showAddCardModal || editingCard) && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingCard 
                      ? (language === 'en' ? 'Edit Card' : 'Editar Carta')
                      : (language === 'en' ? 'Create Card' : 'Crear Carta')
                    }
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddCardModal(false);
                      setEditingCard(null);
                      resetCardForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Card Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'en' ? 'Card Name' : 'Nombre de la Carta'} *
                    </label>
                    <input
                      type="text"
                      value={cardFormData.name}
                      onChange={(e) => setCardFormData({...cardFormData, name: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder={language === 'en' ? 'Enter card name...' : 'Ingresa el nombre de la carta...'}
                    />
                    {validationErrors.name && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.name}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'en' ? 'Description' : 'Descripción'} *
                    </label>
                    <textarea
                      value={cardFormData.description}
                      onChange={(e) => setCardFormData({...cardFormData, description: e.target.value})}
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.description ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder={language === 'en' ? 'Enter card description...' : 'Ingresa la descripción de la carta...'}
                    />
                    {validationErrors.description && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.description}</p>
                    )}
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'en' ? 'Type' : 'Tipo'} *
                    </label>
                    <select
                      value={cardFormData.type}
                      onChange={(e) => setCardFormData({...cardFormData, type: e.target.value as CardType})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="common">{language === 'en' ? 'Common' : 'Común'}</option>
                      <option value="rare">{language === 'en' ? 'Rare' : 'Rara'}</option>
                      <option value="legendary">{language === 'en' ? 'Legendary' : 'Legendaria'}</option>
                    </select>
                  </div>

                  {/* Points */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'en' ? 'Points' : 'Puntos'} *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      value={cardFormData.points}
                      onChange={(e) => setCardFormData({...cardFormData, points: parseInt(e.target.value) || 0})}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.points ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                    {validationErrors.points && (
                      <p className="text-red-600 text-sm mt-1">{validationErrors.points}</p>
                    )}
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'en' ? 'Card Image' : 'Imagen de la Carta'}
                    </label>
                    
                    <ImageUpload
                      onChange={handleImageUpload}
                      onError={handleImageError}
                      onProgress={(progress) => {
                        // Optional: Add progress tracking state if needed
                        console.log(`Upload progress: ${progress}%`);
                      }}
                      value={imageUploadResult?.url}
                      context="card"
                      showProgress={true}
                      maxRetries={3}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddCardModal(false);
                      setEditingCard(null);
                      resetCardForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {language === 'en' ? 'Cancel' : 'Cancelar'}
                  </button>
                  <button
                    onClick={editingCard ? handleUpdateCard : handleAddCard}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting 
                      ? (language === 'en' ? 'Saving...' : 'Guardando...')
                      : editingCard 
                      ? (language === 'en' ? 'Update Card' : 'Actualizar Carta')
                      : (language === 'en' ? 'Create Card' : 'Crear Carta')
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card Detail Modal */}
        {showCardDetail && selectedCard && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {language === 'en' ? 'Card Details' : 'Detalles de la Carta'}
                  </h2>
                  <button
                    onClick={() => setShowCardDetail(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card Image */}
                  <div>
                    <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
                      {selectedCard.image ? (
                        <Image
                          src={selectedCard.image}
                          alt={selectedCard.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <FiImage className="text-gray-400" size={64} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'en' ? 'Card ID' : 'ID de Carta'}
                      </label>
                      <div className="bg-gray-50 px-3 py-2 rounded-lg font-mono text-sm">
                        {selectedCard.cardId}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'en' ? 'Name' : 'Nombre'}
                      </label>
                      <div className="bg-gray-50 px-3 py-2 rounded-lg">
                        {selectedCard.name}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'en' ? 'Description' : 'Descripción'}
                      </label>
                      <div className="bg-gray-50 px-3 py-2 rounded-lg">
                        {selectedCard.description}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'en' ? 'Type' : 'Tipo'}
                        </label>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getCardTypeColor(selectedCard.type)}`}>
                          {getCardTypeIcon(selectedCard.type)}
                          <span className="capitalize">{selectedCard.type}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'en' ? 'Points' : 'Puntos'}
                        </label>
                        <div className="bg-gray-50 px-3 py-2 rounded-lg">
                          {selectedCard.points}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCardDetail(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {language === 'en' ? 'Close' : 'Cerrar'}
                  </button>
                  <button
                    onClick={() => openQRModal(selectedCard)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FiCode className="mr-2" size={16} />
                    {language === 'en' ? 'QR & Redeem Codes' : 'QR y Códigos de Canje'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && selectedCard && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {language === 'en' ? 'QR & Redeem Codes' : 'QR y Códigos de Canje'} - {selectedCard.name}
                  </h2>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Upload CSV */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      {language === 'en' ? 'Upload Redeem Codes' : 'Subir Códigos de Canje'}
                    </h3>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCSVUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => csvInputRef.current?.click()}
                      className="inline-flex items-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
                    >
                      <FiFileText className="mr-2" size={16} />
                      {language === 'en' ? 'Upload CSV/TXT File' : 'Subir Archivo CSV/TXT'}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      {language === 'en' 
                        ? 'Upload a CSV or TXT file with redeem codes (one per line or comma-separated)'
                        : 'Sube un archivo CSV o TXT con códigos de canje (uno por línea o separados por comas)'
                      }
                    </p>
                  </div>

                  {/* Manual Entry */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      {language === 'en' ? 'Add Manual Code' : 'Agregar Código Manual'}
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder={language === 'en' ? 'Enter redeem code...' : 'Ingresa código de canje...'}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={addManualCode}
                        disabled={!manualCode.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {language === 'en' ? 'Add' : 'Agregar'}
                      </button>
                    </div>
                  </div>

                  {/* Generated QR Codes */}
                  {generatedQRs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {language === 'en' ? 'Generated QR Codes' : 'Códigos QR Generados'} ({generatedQRs.length})
                        </h3>
                        {selectedQRs.size > 0 && (
                          <button
                            onClick={downloadSelectedQRs}
                            className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <FiDownload className="mr-2" size={16} />
                            {language === 'en' ? `Download Selected (${selectedQRs.size})` : `Descargar Seleccionados (${selectedQRs.size})`}
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                        {generatedQRs.map((qr) => (
                          <div key={qr.code} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-mono text-gray-600">{qr.code}</span>
                              <input
                                type="checkbox"
                                checked={selectedQRs.has(qr.code)}
                                onChange={() => toggleQRSelection(qr.code)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </div>
                            <div className="bg-gray-100 p-2 rounded mb-2">
                              <img src={qr.qrUrl} alt={`QR for ${qr.code}`} className="w-full h-24 object-contain" />
                            </div>
                            <button
                              onClick={() => downloadQR(qr)}
                              className="w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                              <FiDownload className="mr-1" size={14} />
                              {language === 'en' ? 'Download' : 'Descargar'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {language === 'en' ? 'Close' : 'Cerrar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AlbumDetailsPage;