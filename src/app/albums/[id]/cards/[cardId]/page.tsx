'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  FiArrowLeft, 
  FiEdit, 
  FiPlus, 
  FiDownload, 
  FiUpload,
  FiCode,
  FiTrash2,
  FiCheck,
  FiX,
  FiFileText
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';

// Types
interface Card {
  id: string;
  cardId: string; // Unique CardId identifier for each card
  name: string;
  description: string;
  imageUrl: string;
  albumId: string;
  rarity: string;
  type: string;
  points: number;
  codeCount: number;
}

interface RedeemCode {
  id: string;
  code: string;
  cardId: string;
  qrCode?: string;
  createdAt: string;
  usedAt?: string;
  usedBy?: string;
}

// Mock data
const MOCK_CARD: Card = {
  id: '1',
  cardId: 'CARD_001',
  name: 'Fire Dragon',
  description: 'A powerful fire-breathing dragon with ancient magical abilities.',
  imageUrl: '/images/cards/fire-dragon.jpg',
  albumId: '1',
  rarity: 'Legendary',
  type: 'Creature',
  points: 150,
  codeCount: 25
};

const MOCK_CODES: RedeemCode[] = [
  {
    id: '1',
    code: 'FIRE001ABC',
    cardId: '1',
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    code: 'FIRE002DEF',
    cardId: '1',
    createdAt: '2024-01-16'
  },
  {
    id: '3',
    code: 'FIRE003GHI',
    cardId: '1',
    createdAt: '2024-01-17'
  }
];

const CardDetailPage = () => {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  
  // State
  const [card, setCard] = useState<Card>(MOCK_CARD);
  const [codes, setCodes] = useState<RedeemCode[]>(MOCK_CODES);
  const [activeTab, setActiveTab] = useState<'details' | 'codes' | 'qr'>('details');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddCodeModal, setShowAddCodeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [newCode, setNewCode] = useState('');
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  
  // Export filters
  const [exportFilters, setExportFilters] = useState({
    dateFrom: '',
    dateTo: ''
  });
  
  // File handling
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Generate QR codes for codes that don't have them
  useEffect(() => {
    const generateQRCodes = async () => {
      const QRCode = (await import('qrcode')).default;
      const updatedCodes = await Promise.all(
        codes.map(async (code) => {
          if (!code.qrCode) {
            try {
              const qrCodeDataURL = await QRCode.toDataURL(code.code);
              return { ...code, qrCode: qrCodeDataURL };
            } catch (error) {
              console.error('Error generating QR code:', error);
              return code;
            }
          }
          return code;
        })
      );
      setCodes(updatedCodes);
    };
    
    generateQRCodes();
  }, [codes.length]);

  // Navigation
  const handleBack = () => {
    router.push(`/albums/${params.id}/cards`);
  };

  // Card editing
  const handleEditCard = () => {
    setEditingCard({ ...card });
    setShowEditModal(true);
  };

  const handleSaveCard = () => {
    if (editingCard) {
      setCard(editingCard);
      setShowEditModal(false);
      setEditingCard(null);
    }
  };

  // Code management
  const handleAddCode = () => {
    if (newCode.trim()) {
      const code: RedeemCode = {
        id: Date.now().toString(),
        code: newCode.trim(),
        cardId: card.id,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setCodes(prev => [...prev, code]);
      setNewCode('');
      setShowAddCodeModal(false);
    }
  };

  const handleDeleteCode = (codeId: string) => {
    setCodes(prev => prev.filter(code => code.id !== codeId));
  };

  // File import
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      // Dynamic import with proper error handling
      const XLSXModule = await import('xlsx');
      const XLSX = XLSXModule.default || XLSXModule;
      
      if (!XLSX || !XLSX.read) {
        throw new Error('XLSX library not loaded properly');
      }
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      
      const newCodes: RedeemCode[] = [];
      
      for (let i = 1; i < jsonData.length; i++) { // Skip header row
        const codeValue = jsonData[i][0];
        if (codeValue && typeof codeValue === 'string') {
          const newCode: RedeemCode = {
            id: Date.now().toString() + i,
            code: codeValue.trim(),
            cardId: card.id,
            createdAt: new Date().toISOString().split('T')[0]
          };
          newCodes.push(newCode);
        }
      }
      
      setCodes(prev => [...prev, ...newCodes]);
      setShowImportModal(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error importing file:', error);
      alert('Error importing file. Please check the format.');
    }
  };

  // Export functionality with QR codes
  const handleExportCodes = async () => {
    try {
      // Dynamic import with proper error handling
      const XLSXModule = await import('xlsx');
      const XLSX = XLSXModule.default || XLSXModule;
      
      if (!XLSX || !XLSX.utils) {
        throw new Error('XLSX library not loaded properly');
      }
    
      let codesToExport = selectedCodes.length > 0 
        ? codes.filter(code => selectedCodes.includes(code.id))
        : codes;
      
      // Apply export filters
      if (exportFilters.dateFrom) {
        codesToExport = codesToExport.filter(code => code.createdAt >= exportFilters.dateFrom);
      }
      
      if (exportFilters.dateTo) {
        codesToExport = codesToExport.filter(code => code.createdAt <= exportFilters.dateTo);
      }

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
    
      // Prepare data with QR codes
      const exportData = codesToExport.map((code, index) => ({
        'Redeem Code': code.code,
        'QR Code': code.qrCode ? 'QR_IMAGE_' + index : 'No QR Code',
        'Created At': code.createdAt,
        'Used At': code.usedAt || '',
        'Used By': code.usedBy || ''
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths for better display
      const colWidths = [
        { wch: 15 }, // Redeem Code
        { wch: 20 }, // QR Code
        { wch: 12 }, // Created At
        { wch: 12 }, // Used At
        { wch: 15 }  // Used By
      ];
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Redeem Codes');
      
      const fileName = `${card.name}_redeem_codes_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      // Also create a ZIP file with individual QR code images
      await createQRCodeZip(codesToExport);
      
      setShowExportModal(false);
      setSelectedCodes([]);
      setExportFilters({ dateFrom: '', dateTo: '' });
    } catch (error) {
      console.error('Error exporting codes:', error);
      alert('Error exporting codes. Please try again.');
    }
  };

  // Create ZIP file with QR code images
  const createQRCodeZip = async (codesToExport: RedeemCode[]) => {
    try {
      // Import JSZip dynamically to avoid SSR issues
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default || JSZipModule;
      const zip = new JSZip();
      
      // Add QR code images to ZIP
      codesToExport.forEach((code, index) => {
        if (code.qrCode) {
          const base64Data = code.qrCode.replace(/^data:image\/png;base64,/, '');
          zip.file(`QR_${code.code}.png`, base64Data, { base64: true });
        }
      });
      
      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download ZIP file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${card.name}_QR_codes_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
    } catch (error) {
      console.error('Error creating QR code ZIP:', error);
    }
  };

  // QR Code download
  const downloadQRCode = (code: RedeemCode) => {
    if (!code.qrCode) return;
    
    const link = document.createElement('a');
    link.download = `QR_${code.code}.png`;
    link.href = code.qrCode;
    link.click();
  };

  // Download all QR codes as ZIP
  const downloadAllQRCodes = async () => {
    await createQRCodeZip(codes);
  };

  // Download selected QR codes as ZIP
  const downloadSelectedQRCodes = async () => {
    const selectedCodesData = codes.filter(code => selectedCodes.includes(code.id));
    if (selectedCodesData.length === 0) {
      alert('Please select codes to download');
      return;
    }
    await createQRCodeZip(selectedCodesData);
  };

  // Bulk operations
  const toggleCodeSelection = (codeId: string) => {
    setSelectedCodes(prev => 
      prev.includes(codeId) 
        ? prev.filter(id => id !== codeId)
        : [...prev, codeId]
    );
  };

  const selectAllCodes = () => {
    setSelectedCodes(codes.map(code => code.id));
  };

  const clearSelection = () => {
    setSelectedCodes([]);
  };

  return (
    <MainLayout title={t('cards.cardDetails')}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Go back to cards list"
              >
                <FiArrowLeft size={20} />
                <span>{t('cards.backToCards')}</span>
              </button>
              
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FiFileText className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{card.name}</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{card.description}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleEditCard}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              aria-label="Edit card details"
            >
              <FiEdit size={16} />
              <span>{t('cards.editCard')}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-1 sm:space-x-8 overflow-x-auto">
            {[
              { id: 'details', label: t('cards.detailsTab'), icon: FiEdit, description: t('cards.detailsTabDescription') },
              { id: 'codes', label: t('codes.redeemCodesTab'), icon: FiFileText, description: t('codes.redeemCodesTabDescription') },
              { id: 'qr', label: t('codes.qrCodesTab'), icon: FiCode, description: t('codes.qrCodesTabDescription') }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-t-lg'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-t-lg'
                }`}
                title={tab.description}
                aria-label={`${tab.label} - ${tab.description}`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full ml-1"></div>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card Image */}
            <div className="space-y-4">
              <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={card.imageUrl || '/images/placeholder-card.svg'}
                  alt={card.name}
                  width={400}
                  height={533}
                  className="w-full h-full object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={false}
                />
              </div>
            </div>

            {/* Card Details */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">{t('cards.information')}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('cards.cardId')}</label>
                    <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg">{card.cardId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('cards.name')}</label>
                    <p className="text-gray-900">{card.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('cards.description')}</label>
                    <p className="text-gray-900">{card.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('cards.rarity')}</label>
                      <p className="text-gray-900">{card.rarity}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('cards.type')}</label>
                      <p className="text-gray-900">{card.type}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('cards.points')}</label>
                    <p className="text-gray-900">{card.points}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('codes.totalCodes')}</label>
                    <p className="text-gray-900">{codes.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'codes' && (
          <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowAddCodeModal(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <FiPlus size={16} />
                  <span>{t('codes.add')}</span>
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <FiUpload size={16} />
                  <span>{t('codes.importCsvExcel')}</span>
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <FiDownload size={16} />
                  <span>{t('app.export')}</span>
                </button>
              </div>
              
              {selectedCodes.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {selectedCodes.length} {t('codes.codesSelectedLabel')}
                  </span>
                  <button
                    onClick={downloadSelectedQRCodes}
                    className="flex items-center space-x-1 text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <FiDownload size={14} />
                    <span>{t('codes.downloadSelected')}</span>
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {t('app.clearSelection')}
                  </button>
                </div>
              )}
            </div>

            {/* Codes List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('codes.redeemCodesTitle')}</h3>
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm font-medium px-3 py-1 rounded-full">
                      {codes.length} {t('codes.total')}
                    </span>
                    <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm font-medium px-3 py-1 rounded-full">
                      {codes.filter(c => c.usedAt).length} {t('codes.used')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllCodes}
                      className="flex items-center space-x-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      <FiCheck size={14} />
                      <span>{t('app.selectAll')}</span>
                    </button>
                    <button
                      onClick={clearSelection}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {t('app.clearSelection')}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {codes.map((code) => (
                  <div key={code.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedCodes.includes(code.id)}
                          onChange={() => toggleCodeSelection(code.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-mono text-lg font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
                              {code.code}
                            </div>
                            {code.usedAt ? (
                              <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs font-medium px-2 py-1 rounded-full">
                                {t('codes.used')}
                              </span>
                            ) : (
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium px-2 py-1 rounded-full">
                                {t('codes.available')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>{t('codes.createdAt')}: {new Date(code.createdAt).toLocaleDateString()} at {new Date(code.createdAt).toLocaleTimeString()}</div>
                            {code.usedAt && (
                              <div className="text-red-600 dark:text-red-400">
                                Used: {new Date(code.usedAt).toLocaleDateString()} at {new Date(code.usedAt).toLocaleTimeString()}
                                {code.usedBy && ` by ${code.usedBy}`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => downloadQRCode(code)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title={t('codes.downloadQRCode')}
                        >
                          <FiDownload size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteCode(code.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t('codes.deleteCode')}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {codes.length === 0 && (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <FiCode size={24} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('codes.noCodesYet')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {t('codes.noCodesYetDescription')}
                    </p>
                    <button
                      onClick={handleAddCode}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <FiPlus size={16} />
                      <span>{t('codes.addFirstCode')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="space-y-6">
            {/* QR Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('codes.qrManagementTitle')}</h3>
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium px-3 py-1 rounded-full">
                  {codes.length} {t('codes.qrCodes')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={selectAllCodes}
                  className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <FiCheck size={16} />
                  <span>{t('app.selectAll')}</span>
                </button>
                <button
                  onClick={downloadAllQRCodes}
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <FiDownload size={16} />
                  <span>{t('codes.downloadAllQRCodes')}</span>
                </button>
                {selectedCodes.length > 0 && (
                  <button
                    onClick={downloadSelectedQRCodes}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <FiDownload size={16} />
                    <span>{t('codes.downloadSelected')} ({selectedCodes.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Selection Summary */}
            {selectedCodes.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-blue-800 dark:text-blue-200 font-medium">
                    {selectedCodes.length} of {codes.length} {t('codes.qrCodesSelectedSuffix')}
                  </span>
                  <button
                    onClick={clearSelection}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-sm font-medium"
                  >
                    {t('app.clearSelection')}
                  </button>
                </div>
              </div>
            )}

            {/* QR Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {codes.map((code) => (
                <div key={code.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <input
                      type="checkbox"
                      checked={selectedCodes.includes(code.id)}
                      onChange={() => toggleCodeSelection(code.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                    />
                    <button
                      onClick={() => downloadQRCode(code)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Download QR Code"
                    >
                      <FiDownload size={18} />
                    </button>
                  </div>
                  
                  {code.qrCode && (
                    <div className="mb-4 flex justify-center bg-white p-3 rounded-lg border border-gray-100">
                      <Image
                        src={code.qrCode}
                        alt={`QR Code for ${code.code}`}
                        width={140}
                        height={140}
                        className="rounded-md"
                      />
                    </div>
                  )}
                  
                  <div className="text-center space-y-2">
                    <div className="font-mono text-sm font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                      {code.code}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Created: {new Date(code.createdAt).toLocaleDateString()}
                    </div>
                    {code.usedAt && (
                      <div className="text-xs text-red-500 dark:text-red-400">
                        Used: {new Date(code.usedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {codes.length === 0 && (
              <div className="text-center py-12">
                <FiCode className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('codes.noQrCodesYet')}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t('codes.noQrCodesDescription')}
                </p>
                <button
                  onClick={() => setActiveTab('codes')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiPlus className="mr-2" size={16} />
                  {t('codes.addCodes')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Edit Card Modal */}
        {showEditModal && editingCard && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">{t('cards.editCard')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('cards.name')}</label>
                  <input
                    type="text"
                    value={editingCard.name}
                    onChange={(e) => setEditingCard({ ...editingCard, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('cards.description')}</label>
                  <textarea
                    value={editingCard.description}
                    onChange={(e) => setEditingCard({ ...editingCard, description: e.target.value })}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('cards.rarity')}</label>
                    <select
                      value={editingCard.rarity}
                      onChange={(e) => setEditingCard({ ...editingCard, rarity: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Common">Common</option>
                      <option value="Uncommon">Uncommon</option>
                      <option value="Rare">Rare</option>
                      <option value="Epic">Epic</option>
                      <option value="Legendary">Legendary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('cards.points')}</label>
                    <input
                      type="number"
                      value={editingCard.points}
                      onChange={(e) => setEditingCard({ ...editingCard, points: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCard(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {t('app.cancel')}
                </button>
                <button
                  onClick={handleSaveCard}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {t('app.save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Code Modal */}
        {showAddCodeModal && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">{t('codes.addRedeemCode')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('codes.codeLabel')}</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder={t('codes.enterCodePlaceholder')}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddCodeModal(false);
                    setNewCode('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {t('app.cancel')}
                </button>
                <button
                  onClick={handleAddCode}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {t('codes.add')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">{t('codes.importTitle')}</h3>
              <p className="text-gray-600 mb-4">
                {t('codes.importHelpText')}
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileImport}
                className="w-full mb-4 p-2 border border-gray-300 rounded-lg"
              />
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {t('app.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-4">{t('codes.exportTitle')}</h3>
              <p className="text-gray-600 mb-4">
                {selectedCodes.length > 0 
                  ? `${t('codes.exportSelectedCodes')} ${t('codes.withQrCodes')}`
                  : `${t('codes.exportAllCodesFor')} ${card.name} ${t('codes.withQrCodes')}`
                }
              </p>
              
              {/* Export Filters */}
              <div className="space-y-4 mb-6">
                <h4 className="font-medium text-gray-900">{t('app.filterOptions')}</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('app.fromDate')}
                    </label>
                    <input
                      type="date"
                      value={exportFilters.dateFrom}
                      onChange={(e) => setExportFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('app.toDate')}
                    </label>
                    <input
                      type="date"
                      value={exportFilters.dateTo}
                      onChange={(e) => setExportFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowExportModal(false);
                    setExportFilters({ dateFrom: '', dateTo: '' });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {t('app.cancel')}
                </button>
                <button
                  onClick={handleExportCodes}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {t('app.export')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CardDetailPage;