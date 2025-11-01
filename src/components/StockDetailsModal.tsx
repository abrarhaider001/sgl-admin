'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Edit, Save, Upload, Calendar, Hash, DollarSign, Star, Package } from 'lucide-react';
import { Stock, UpdateStockRequest } from '@/types/stock';
import { stockService } from '@/services/stockService';
import ImageUpload from '@/components/ui/ImageUpload';

interface StockDetailsModalProps {
  isOpen: boolean;
  stockId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function StockDetailsModal({ isOpen, stockId, onClose, onUpdate }: StockDetailsModalProps) {
  const [stock, setStock] = useState<Stock | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<UpdateStockRequest>({
    name: '',
    description: '',
    rarity: 'common',
    price: 0,
    image: undefined
  });

  // Load stock details
  const loadStock = useCallback(async () => {
    if (!stockId) return;
    try {
      setLoading(true);
      const stockData = await stockService.getStock(stockId);
      if (stockData) {
        setStock(stockData);
        setFormData({
          name: stockData.name,
          description: stockData.description,
          rarity: stockData.rarity,
          price: stockData.price,
          image: stockData.image
        });
      }
    } catch (error) {
      console.error('Error loading stock:', error);
    } finally {
      setLoading(false);
    }
  }, [stockId]);

  useEffect(() => {
    if (isOpen && stockId) {
      loadStock();
    }
  }, [isOpen, stockId, loadStock]);

  // Handle form input changes
  const handleInputChange = (field: keyof UpdateStockRequest, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle image upload
  const handleImageUpload = (result: { url?: string } | null) => {
    setFormData(prev => ({
      ...prev,
      image: result?.url || ''
    }));
  };

  // Handle image upload error
  const handleImageError = (error: string) => {
    setErrors(prev => ({ ...prev, image: error }));
  };

  // Save updates
  const handleSave = async () => {
    try {
      setLoading(true);
      setErrors({});

      const newErrors: Record<string, string> = {};
      if (!formData.name?.trim()) newErrors.name = 'Name is required';
      if (!formData.description?.trim()) newErrors.description = 'Description is required';
      if (formData.price === undefined || formData.price <= 0) newErrors.price = 'Price must be greater than 0';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      await stockService.updateStock(stockId!, formData);
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating stock:', error);
      setErrors({ submit: 'Failed to update stock' });
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    if (stock) {
      setFormData({
        name: stock.name,
        description: stock.description,
        rarity: stock.rarity,
        price: stock.price,
        image: stock.image || ''
      });
    }
    setErrors({});
    setIsEditing(false);
  };

  // Close modal
  const handleClose = () => {
    setIsEditing(false);
    setErrors({});
    onClose();
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'text-gray-600 bg-gray-100',
      uncommon: 'text-green-600 bg-green-100',
      rare: 'text-blue-600 bg-blue-100',
      epic: 'text-purple-600 bg-purple-100',
      legendary: 'text-yellow-600 bg-yellow-100'
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              {loading ? 'Loading...' : stock?.name || 'Stock Details'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && stock && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : stock ? (
            <div className="space-y-8">
              {/* Basic Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left */}
                <div className="space-y-6">
                  {/* Stock Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Stock Image
                    </label>
                    {isEditing ? (
                      <ImageUpload
                        value={formData.image}
                        onChange={handleImageUpload}
                        onError={handleImageError}
                        context="card"
                        className="w-full"
                        placeholder="Upload stock image"
                      />
                    ) : (
                      <div className="relative">
                        {stock.image ? (
                          <img
                            src={stock.image}
                            alt={stock.name}
                            className="w-full h-48 object-cover rounded-lg border"
                          />
                        ) : (
                          <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                            <div className="text-gray-400 text-center">
                              <Upload className="w-12 h-12 mx-auto mb-2" />
                              <span>No image available</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {errors.image && (
                      <p className="mt-1 text-sm text-red-600">{errors.image}</p>
                    )}
                  </div>

                  {/* Stock Number + Price + Rarity */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Stock Number */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center text-gray-600 mb-1">
                        <Hash className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Stock Number</span>
                      </div>
                      <p className="font-semibold">{stock.stockNumber}</p>
                    </div>

                    {/* Price */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center text-gray-600 mb-1">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Price</span>
                      </div>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                          className={`w-full px-2 py-1 border rounded ${
                            errors.price ? 'border-red-500' : 'border-gray-300'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      ) : (
                        <p className="font-semibold">${stock.price.toFixed(2)}</p>
                      )}
                      {errors.price && (
                        <p className="mt-1 text-xs text-red-600">{errors.price}</p>
                      )}
                    </div>

                    {/* Rarity */}
                    <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                      <div className="flex items-center text-gray-600 mb-1">
                        <Star className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Rarity</span>
                      </div>
                      {isEditing ? (
                        <select
                          value={formData.rarity}
                          onChange={(e) => handleInputChange('rarity', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="common">Common</option>
                          <option value="uncommon">Uncommon</option>
                          <option value="rare">Rare</option>
                          <option value="epic">Epic</option>
                          <option value="legendary">Legendary</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getRarityColor(stock.rarity)}`}
                        >
                          {stock.rarity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Name *
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          errors.name ? 'border-red-500' : 'border-gray-300'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        placeholder="Enter stock name"
                      />
                    ) : (
                      <p className="text-lg font-semibold text-gray-900">{stock.name}</p>
                    )}
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          errors.description ? 'border-red-500' : 'border-gray-300'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        placeholder="Enter stock description"
                      />
                    ) : (
                      <p className="text-gray-700 leading-relaxed">{stock.description}</p>
                    )}
                    {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                  </div>

                  {/* Created + Updated */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center text-gray-600 mb-1">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Created</span>
                      </div>
                      <p className="text-sm">{new Date(stock.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center text-gray-600 mb-1">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Last Updated</span>
                      </div>
                      <p className="text-sm">{new Date(stock.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards in Stock */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Cards in Stock ({(stock as any).cards?.length || 0} total)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(stock as any).cards?.map((card: { cardId: string; quantity: number }, index: number) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Card {card.cardId}</p>
                          <p className="text-sm text-gray-600">Quantity: {card.quantity}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              {isEditing && (
                <div className="flex items-center justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}

              {errors.submit && (
                <div className="text-red-600 text-sm text-center">{errors.submit}</div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Stock not found or failed to load.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
