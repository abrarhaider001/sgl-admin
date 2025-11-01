'use client';

import React, { useState } from 'react';
import { firebaseRedeemCodeService } from '@/services/firebaseRedeemCodeService';

interface AddPromoCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPromoCreated?: (codeValue: string) => void;
  cardId: string;
}

export const AddPromoCodeDialog: React.FC<AddPromoCodeDialogProps> = ({
  isOpen,
  onClose,
  onPromoCreated,
  cardId
}) => {
  const [codeValue, setCodeValue] = useState<string>('');
  const [codeError, setCodeError] = useState<string>('');
  const [maxUsage, setMaxUsage] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateCode = (v: string): string => {
    const autoPattern = /^Promo\d{4}$/; // still allowed
    const customPattern = /^[A-Za-z][A-Za-z0-9_-]{2,31}$/; // 3-32 chars, start with letter
    if (!v.trim()) return 'Promo code name is required';
    if (!(autoPattern.test(v) || customPattern.test(v))) {
      return 'Use 3–32 chars: letters, numbers, hyphens or underscores; start with a letter';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const err = validateCode(codeValue);
    setCodeError(err);
    if (err) return;

    if (!Number.isFinite(maxUsage) || maxUsage < 1) {
      alert('Please enter a valid maximum usage (>= 1)');
      return;
    }

    if (!cardId) {
      alert('Card ID is missing. Open this dialog from a specific card.');
      return;
    }

    setIsSubmitting(true);
    try {
      const promo = await firebaseRedeemCodeService.createPromoCode(cardId, Math.floor(maxUsage), codeValue.trim());
      alert(`Promo code created: ${promo.code} (Max usage: ${promo.max_usage})`);
      if (onPromoCreated) onPromoCreated(promo.code);
      onClose();
    } catch (error) {
      console.error('Error creating promo code:', error);
      const message = error instanceof Error ? error.message : 'Failed to create promo code. Please try again.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Add Promo Code</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card ID
                </label>
                <input
                  type="text"
                  value={cardId}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promo code name
                </label>
                <input
                  type="text"
                  value={codeValue}
                  onChange={(e) => {
                    setCodeValue(e.target.value);
                    setCodeError(validateCode(e.target.value));
                  }}
                  placeholder="e.g., NEWYEAR2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-invalid={!!codeError}
                  aria-describedby="promo-code-help promo-code-error"
                  required
                />
                <p id="promo-code-help" className="text-xs text-gray-500 mt-1">
                  Allowed: letters, numbers, hyphens (-), underscores (_). 3–32 characters.
                </p>
                {codeError && (
                  <p id="promo-code-error" className="text-xs text-red-600 mt-1">{codeError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum usage limit
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxUsage}
                  onChange={(e) => setMaxUsage(Number(e.target.value))}
                  placeholder="e.g., 100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !!codeError || !codeValue.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Promo Code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};