'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  FiDownload, 
  FiUpload, 
  FiPlus, 
  FiTrash2, 
  FiSearch, 
  FiFilter, 
  FiChevronLeft, 
  FiChevronRight, 
  FiEdit,
  FiArrowLeft,
  FiGrid,
  FiList,
  FiPackage,
  FiCreditCard,
  FiCode,
  FiLoader,
  FiPlusCircle
} from 'react-icons/fi';
import MainLayout from '@/components/layout/MainLayout';
import { useLanguage } from '@/context/LanguageContext';
import { firebaseRedeemCodeService } from '@/services/firebaseRedeemCodeService';
import { firebaseCardService } from '@/services/firebaseCardService';
import { AddCodesDialog } from '@/components/AddCodesDialog';
import { AddPromoCodeDialog } from '@/components/AddPromoCodeDialog';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';

// Type definitions
interface Album {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  cardCount: number;
}

interface Card {
  id: string;
  cardId: string; // Unique CardId identifier for each card
  name: string;
  description: string;
  imageUrl: string;
  albumId: string;
  codeCount: number;
}

interface RedeemCode {
  id: string;
  code: string;
  cardId?: string;
  type?: 'promo';
  remainingUses?: number;
  maxUsers?: number;
  usedBy?: string[];
  qrCode?: string;
  createdAt: string;
  usedAt?: string;
}

type ViewMode = 'albums' | 'cards' | 'codes';

const CodesPage = () => {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const cardId = searchParams.get('cardId');
  
  // Data state
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [promoCodes, setPromoCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddCodesDialog, setShowAddCodesDialog] = useState(false);
  const [showAddPromoDialog, setShowAddPromoDialog] = useState(false);
  const [selectedRedeemCodeId, setSelectedRedeemCodeId] = useState<string>('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  
  // File handling
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch card and redeem codes data
  useEffect(() => {
    const setup = async () => {
      if (!cardId) {
        setError('No card ID provided');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const cardData = await firebaseCardService.getCardById(cardId);
        if (!cardData) {
          setError('Card not found');
          setLoading(false);
          return;
        }
        setSelectedCard({
          id: cardData.id ?? '',
          cardId: cardData.cardID,
          name: cardData.name,
          description: cardData.description,
          imageUrl: cardData.imageUrl,
          albumId: (cardData as any).albumID,
          codeCount: (cardData as any).codeCount ?? 0
        });
        // Subscribe to redeem codes for this card
        const unsubscribeCardCodes = firebaseRedeemCodeService.subscribeToRedeemCodesByCardId(cardId, (docs) => {
          const individualCodes: RedeemCode[] = [];
          docs.forEach((redeemCodeDoc) => {
            if (redeemCodeDoc.codes && redeemCodeDoc.codes.length > 0) {
              redeemCodeDoc.codes.forEach((codeString, index) => {
                individualCodes.push({
                  id: `${redeemCodeDoc.id}_${index}`,
                  code: codeString,
                  cardId: redeemCodeDoc.cardId,
                  createdAt: redeemCodeDoc.createdAt
                });
              });
            }
          });
          setCodes(individualCodes);
          setLoading(false);
        });
        // Subscribe to promo codes
        const unsubscribePromo = firebaseRedeemCodeService.subscribeToPromoCodes((items) => {
          const mapped: RedeemCode[] = items.map((p) => ({
            id: p.id,
            code: p.code,
            type: 'promo',
            remainingUses: p.remaining_uses,
            maxUsers: p.max_usage,
            usedBy: p.used_by,
            cardId: p.card_id,
            createdAt: p.created_at
          }));
          setPromoCodes(mapped);
        });
        // Cleanup on unmount or cardId change
        return () => {
          unsubscribeCardCodes();
          unsubscribePromo();
        };
      } catch (err) {
        console.error('Error initializing redeem codes:', err);
        setError('Failed to load data');
        setLoading(false);
      }
    };
    const cleanup = setup();
    return () => {
      // Ensure unsubscribe is called if setup returned it
      if (typeof cleanup === 'function') {
        (cleanup as unknown as () => void)();
      }
    };
  }, [cardId]);
  
  // Generate QR codes for codes that don't have them
  useEffect(() => {
    const anyCodes = codes.length > 0 || promoCodes.length > 0;
    if (!anyCodes) return;
    
    const addQRCode = async (code: RedeemCode) => {
      if (code.qrCode) return code;
      try {
        const qrCodeDataURL = await QRCode.toDataURL(code.code);
        return { ...code, qrCode: qrCodeDataURL };
      } catch (error: unknown) {
        console.error('Error generating QR code:', error);
        return code;
      }
    };

    const generateQRCodes = async () => {
      const updatedCardCodes = await Promise.all(codes.map(addQRCode));
      const updatedPromoCodes = await Promise.all(promoCodes.map(addQRCode));
      setCodes(updatedCardCodes);
      setPromoCodes(updatedPromoCodes);
    };
    
    generateQRCodes();
  }, [codes.length, promoCodes.length]);
  
  // Data filtering
  const getFilteredData = () => {
    const promoScoped = cardId ? promoCodes.filter(p => p.cardId === cardId) : promoCodes;
    const combined = [...codes, ...promoScoped];
    return combined.filter(code => 
      code.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };
  
  // Pagination
  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);
  
  // Import functionality
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCard || !cardId) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      const newCodes: string[] = [];
      for (let i = 1; i < jsonData.length; i++) { // Skip header row
        const codeValue = jsonData[i][0];
        if (codeValue && typeof codeValue === 'string') {
          newCodes.push(codeValue.trim());
        }
      }
      if (newCodes.length > 0) {
        await firebaseRedeemCodeService.addCodesToRedeemCode(cardId, newCodes);
      }
      setShowImportModal(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: unknown) {
      console.error('Error importing file:', error);
      alert(t('codes.errorImportFile'));
    }
  };
  
  // Export filters
  const [exportFilters, setExportFilters] = useState({
    dateFrom: '',
    dateTo: ''
  });
  
  // Export functionality with QR codes
  const handleExportCodes = async () => {
    let codesToExport = selectedCodes.length > 0 
      ? codes.filter(code => selectedCodes.includes(code.code))
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
      'Created At': code.createdAt || '',
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
    
    // Try to add QR code images to the worksheet
    try {
      for (let i = 0; i < codesToExport.length; i++) {
        const code = codesToExport[i];
        if (code.qrCode) {
          // Convert base64 QR code to binary for embedding
          const base64Data = code.qrCode.replace(/^data:image\/png;base64,/, '');
          const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: 1 }); // Row i+1, Column B (QR Code column)
          
          // Add a note about the QR code since XLSX has limited image support
          if (!worksheet[cellRef]) worksheet[cellRef] = {};
          worksheet[cellRef].v = `QR Code for ${code.code}`;
          worksheet[cellRef].c = [{
            a: 'System',
            t: `QR Code Data: ${code.qrCode.substring(0, 50)}...`,
            h: false
          }];
        }
      }
    } catch (error: unknown) {
      console.warn('Could not embed QR images directly in Excel:', error);
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, t('codes.redeemCodesTitle'));
    
    const fileName = `${selectedCard?.name || 'codes'}_redeem_codes_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    // Also create a ZIP file with individual QR code images
    await createQRCodeZip(codesToExport);
    
    setShowExportModal(false);
    setSelectedCodes([]);
    setExportFilters({ dateFrom: '', dateTo: '' });
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
      link.download = `${selectedCard?.name || 'codes'}_QR_codes_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
    } catch (error: unknown) {
      console.error('Error creating QR code ZIP:', error);
    }
  };
  
  // Download individual QR code
  const downloadQRCode = (code: RedeemCode) => {
    if (!code.qrCode) return;
    
    const link = document.createElement('a');
    link.download = `QR_${code.code}.png`;
    link.href = code.qrCode;
    link.click();
  };

  // Delete code function
  const deleteCode = async (codeItem: RedeemCode) => {
    try {
      if (codeItem.type === 'promo') {
        await firebaseRedeemCodeService.deletePromoCode(codeItem.code);
      } else {
        if (!selectedCard || !cardId) return;
        await firebaseRedeemCodeService.removeCodesFromRedeemCode(cardId, [codeItem.code]);
      }
    } catch (error) {
      console.error('Error deleting code:', error);
      alert(t('codes.errorDeleteCode'));
    }
  };
  
  // Toggle code selection
  const toggleCodeSelection = (codeString: string) => {
    setSelectedCodes(prev => 
      prev.includes(codeString) 
        ? prev.filter(c => c !== codeString)
        : [...prev, codeString]
    );
  };
  
  // Select all codes
  const selectAllCodes = () => {
    setSelectedCodes(filteredData.map(code => code.code));
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedCodes([]);
  };

  return (
    <MainLayout title={t('codes.redeemCodesTitle')}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Back Button */}
              <button
                onClick={() => {
                  if (selectedCard?.albumId) {
                    router.push(`/albums/${selectedCard.albumId}/cards`);
                  } else {
                    router.push('/albums');
                  }
                }}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <FiArrowLeft size={20} />
                <span>{t('cards.backToCards')}</span>
              </button>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedCard?.name ? `${selectedCard.name} - ${t('codes.redeemCodesTitle')}` : t('codes.redeemCodesTitle')}
                </h1>
                <p className="text-gray-600 mt-1">
                  {t('codes.redeemCodesPageSubtitle')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  // Create a new redeem code document first if none exist
                  if (codes.length === 0) {
                    // For now, allow creating codes even if no existing redeem code documents exist
                    setSelectedRedeemCodeId('new');
                    setShowAddCodesDialog(true);
                  } else {
                    setSelectedRedeemCodeId(codes[0].id);
                    setShowAddCodesDialog(true);
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
              >
                <FiPlus size={18} />
                <span>{t('codes.addCodes')}</span>
              </button>
              
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
              >
                <FiUpload size={18} />
                <span>{t('codes.importCodes')}</span>
              </button>
              
              <button
                onClick={() => setShowExportModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
              >
                <FiDownload size={18} />
                <span>{t('codes.exportCodes')}</span>
              </button>

              <button
                onClick={() => setShowAddPromoDialog(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
              >
                <FiPlusCircle size={18} />
                <span>{t('codes.addPromoCode')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <FiLoader size={24} className="animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600">{t('codes.fetchingRedeemCodes')}</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                {t('app.retry')}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <div>
            {/* Search and Filters */}
            <div className="mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder={t('codes.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {selectedCodes.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {selectedCodes.length} {t('codes.codesSelectedLabel')}
                    </span>
                    <button
                      onClick={clearSelection}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      {t('app.clearSelection')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bulk actions */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={selectAllCodes}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {t('app.selectAll')}
                  </button>
                  {selectedCodes.length > 0 && (
                    <button
                      onClick={() => setShowExportModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      {t('codes.exportSelected')} ({selectedCodes.length})
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {t('codes.totalCodes')}: {filteredData.length}
                </div>
              </div>
            </div>

            {/* Codes grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedData.map((code) => (
                <div
                  key={code.id}
                  className={`bg-white rounded-lg shadow-md p-4 transition-all hover:shadow-lg ${
                    selectedCodes.includes(code.code) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <input
                      type="checkbox"
                      checked={selectedCodes.includes(code.code)}
                      onChange={() => toggleCodeSelection(code.code)}
                      className="mt-1"
                    />
                    {code.type === 'promo' && (
                      <span className="ml-2 px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 font-medium">
                        Promo Code
                      </span>
                    )}
                  </div>
                  
                  <div className="text-center mb-4">
                    {code.qrCode && (
                      <img
                        src={code.qrCode}
                        alt={`QR Code for ${code.code}`}
                        className="w-32 h-32 mx-auto mb-2 border rounded"
                      />
                    )}
                  </div>
                  
                  <div className="text-center">
                    <p className="font-mono text-lg font-semibold text-gray-900 mb-2 break-all">
                      {code.code}
                    </p>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      Created: {new Date(code.createdAt).toLocaleDateString()}
                    </p>

                    {code.type === 'promo' && (
                      <div className="text-sm text-yellow-700 mb-3 space-y-1">
                        <p>Remaining uses: {code.remainingUses ?? 0}</p>
                        {typeof code.maxUsers === 'number' && (
                          <p>Max users: {code.maxUsers}</p>
                        )}
                        {code.cardId && (
                          <p>Card ID: {code.cardId}</p>
                        )}
                        {Array.isArray(code.usedBy) && code.usedBy.length > 0 && (
                          <div className="text-xs text-gray-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                            <span className="font-medium">Used by ({code.usedBy.length}):</span>
                            <div className="mt-1 font-mono break-words">{code.usedBy.join(', ')}</div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-center space-x-2">
                      {code.qrCode && (
                        <button
                          onClick={() => downloadQRCode(code)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center"
                        >
                          <FiDownload className="mr-1" size={14} />
                          Download
                        </button>
                      )}
                      <button
                        onClick={() => deleteCode(code)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center"
                      >
                        <FiTrash2 className="mr-1" size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <FiChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
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
                   : `${t('codes.exportAllCodesFor')} ${selectedCard?.name} ${t('codes.withQrCodes')}`
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
                   {t('codes.export')}
                 </button>
               </div>
             </div>
           </div>
         )}
         
         {/* Add Codes Dialog */}
         <AddCodesDialog
           isOpen={showAddCodesDialog}
           onClose={() => setShowAddCodesDialog(false)}
           redeemCodeId={selectedRedeemCodeId}
           cardId={cardId || ''}
           onCodesAdded={() => {
             // No manual refresh needed; realtime subscription updates `codes`
             setLoading(false);
           }}
         />

         {/* Add Promo Code Dialog */}
         <AddPromoCodeDialog
           isOpen={showAddPromoDialog}
           onClose={() => setShowAddPromoDialog(false)}
           onPromoCreated={() => {
             // realtime subscription will pick it up
           }}
           cardId={cardId || ''}
         />
      </div>
    </MainLayout>
  );
};

export default function CodesPageWithSuspense() {
  return (
    <Suspense fallback={<div className="p-6">Loading codes...</div>}>
      <CodesPage />
    </Suspense>
  );
}