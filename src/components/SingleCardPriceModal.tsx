import React, { useEffect, useState } from 'react';
import { DollarSign, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import firebaseSingleCardPriceService, { SingleCardPriceDoc } from '@/services/firebaseSingleCardPriceService';
import { notifySuccess, notifyError } from '@/utils/snackbarBus';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SingleCardPriceModal({ open, onClose }: Props) {
  const { t } = useLanguage();
  const [priceDoc, setPriceDoc] = useState<SingleCardPriceDoc | null>(null);
  const [value, setValue] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!open) return;
      setLoading(true);
      try {
        const doc = await firebaseSingleCardPriceService.getCurrentPrice();
        setPriceDoc(doc);
        setValue(doc?.pricePerCard || '');
      } catch (e) {
        // notifyError('read', 'Single Card Price', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open]);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      const id = await firebaseSingleCardPriceService.updatePrice(value.trim(), priceDoc?.id);
      setPriceDoc({ id, pricePerCard: value.trim() });
      notifySuccess('update', 'Single Card Price');
      onClose();
    } catch (e) {
      notifyError('update', 'Single Card Price', e);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{t('store.singleCardPrice')}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">{t('store.singleCardPriceDesc')}</p>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 inline-block">
              {t('store.singleCardPrice')}
            </label>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              disabled={loading || saving}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('app.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !value.trim()}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t('app.loading') : t('app.update')}
          </button>
        </div>
      </div>
    </div>
  );
}