'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { FiUpload, FiX, FiAlertCircle } from 'react-icons/fi';
import type { CardImages } from '@/types/card';
import { useLanguage } from '@/context/LanguageContext';

export type CardImageVariant = keyof CardImages;

export interface CardImagesUploadProps {
  value?: Partial<CardImages>;
  onChange?: (files: Partial<Record<CardImageVariant, File>>) => void;
  disabled?: boolean;
  className?: string;
}

const VARIANTS: CardImageVariant[] = ['bronze', 'silver', 'gold', 'titanium', 'diamond'];
const LABEL_KEYS: Record<CardImageVariant, string> = {
  bronze: 'cards.variant.bronze',
  silver: 'cards.variant.silver',
  gold: 'cards.variant.gold',
  titanium: 'cards.variant.titanium',
  diamond: 'cards.variant.diamond',
};
const SELECT_KEYS: Record<CardImageVariant, string> = {
  bronze: 'cards.selectBronzeImage',
  silver: 'cards.selectSilverImage',
  gold: 'cards.selectGoldImage',
  titanium: 'cards.selectTitaniumImage',
  diamond: 'cards.selectDiamondImage',
};

const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const maxSizeBytes = 5 * 1024 * 1024; // 5MB

const CardImagesUpload: React.FC<CardImagesUploadProps> = ({ value, onChange, disabled, className = '' }) => {
  const { t } = useLanguage();
  const [files, setFiles] = useState<Partial<Record<CardImageVariant, File>>>({});
  const [errors, setErrors] = useState<Partial<Record<CardImageVariant, string>>>({});

  const previews = useMemo(() => {
    const result: Partial<Record<CardImageVariant, string>> = {};
    for (const variant of VARIANTS) {
      const file = files[variant];
      if (file) {
        result[variant] = URL.createObjectURL(file);
      } else if (value?.[variant]) {
        result[variant] = value[variant] as string;
      }
    }
    return result;
  }, [files, value]);

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return t('cards.error.invalidFileType');
    }
    if (file.size > maxSizeBytes) {
      return t('cards.error.fileTooLarge');
    }
    return null;
  };

  const handleSelect = (variant: CardImageVariant, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    const err = validateFile(file);
    setErrors(prev => ({ ...prev, [variant]: err || undefined }));
    if (err) return;

    const updated = { ...files, [variant]: file };
    setFiles(updated);
    if (typeof onChange === 'function') onChange(updated);
  };

  const handleRemove = (variant: CardImageVariant) => {
    const updated = { ...files };
    delete updated[variant];
    setFiles(updated);
    if (typeof onChange === 'function') onChange(updated);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">{t('cards.cardImagesVariants')}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {VARIANTS.map((variant) => (
          <div key={variant} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">{t(LABEL_KEYS[variant])}</span>
              <div className="flex items-center gap-2">
                <label className={`inline-flex items-center px-2 py-1 text-xs rounded cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                  <FiUpload className="mr-1" size={14} /> {t('app.upload')}
                  <input
                    type="file"
                    accept={allowedTypes.join(',')}
                    className="hidden"
                    disabled={!!disabled}
                    onChange={(e) => handleSelect(variant, e.target.files)}
                  />
                </label>
                {(files[variant] || value?.[variant]) && (
                  <button
                    type="button"
                    onClick={() => handleRemove(variant)}
                    className={`p-1 rounded ${disabled ? 'opacity-50 cursor-not-allowed' : 'bg-red-100 hover:bg-red-200 text-red-700'}`}
                    disabled={!!disabled}
                    title={t('app.remove')}
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="relative w-full h-40 bg-gray-100 rounded overflow-hidden">
              {previews[variant] ? (
                <Image src={previews[variant] as string} alt={`${t(LABEL_KEYS[variant])} preview`} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                  <FiUpload className="mb-2" />
                  <span>{t(SELECT_KEYS[variant])}</span>
                </div>
              )}
            </div>
            {errors[variant] && (
              <div className="mt-2 flex items-center text-red-600 text-xs">
                <FiAlertCircle className="mr-1" size={12} />
                <span>{errors[variant]}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">{t('cards.allowedTypesNote')}</p>
    </div>
  );
};

export default CardImagesUpload;