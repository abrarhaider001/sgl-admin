'use client';

import React, { useState } from 'react';
import { firebaseRedeemCodeService } from '@/services/firebaseRedeemCodeService';

interface AddCodesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  redeemCodeId: string;
  cardId: string;
  onCodesAdded: () => void;
}

export const AddCodesDialog: React.FC<AddCodesDialogProps> = ({
  isOpen,
  onClose,
  redeemCodeId,
  cardId,
  onCodesAdded
}) => {
  const [codes, setCodes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!codes.trim()) {
      alert('Please enter at least one code');
      return;
    }

    setIsSubmitting(true);
    try {
      const codeArray = codes.split('\n').map(c => c.trim()).filter(code => code !== '');
      await firebaseRedeemCodeService.addCodesToRedeemCode(cardId, codeArray);
      alert('Codes added successfully!');
      setCodes('');
      onCodesAdded();
      onClose();
    } catch (error) {
      console.error('Error adding codes:', error);
      alert('Failed to add codes. Please try again.');
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
            <h2 className="text-xl font-bold">Add Codes</h2>
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
                  Codes (one per line)
                </label>
                <textarea
                  value={codes}
                  onChange={(e) => setCodes(e.target.value)}
                  placeholder="Enter codes, one per line..."
                  rows={6}
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
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add Codes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};