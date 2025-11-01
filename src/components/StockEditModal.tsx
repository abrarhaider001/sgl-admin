'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Package, DollarSign, FileText, Tag, Globe } from 'lucide-react';
import { Stock, UpdateStockRequest, StockFormData, StockFormErrors } from '@/types/stock';
import { stockService } from '@/services/stockService';

interface StockEditModalProps {
  isOpen: boolean;
  stock: Stock | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockEditModal({ isOpen, stock, onClose, onSuccess }: StockEditModalProps) {
  const [formData, setFormData] = useState<StockFormData>({
    stockNumber: '',
    name: '',
    description: '',
    rarity: 'common',
    price: '',
    currency: 'USD',
    image: undefined
  });

  const [errors, setErrors] = useState<StockFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form with stock data when modal opens
  useEffect(() => {
    if (isOpen && stock) {
      setFormData({
        stockNumber: stock.stockNumber || '',
        name: stock.name || '',
        description: stock.description || '',
        rarity: stock.rarity || 'common',
        price: stock.price?.toString() || '',
        currency: stock.currency || 'USD',
        image: undefined
      });
      setImagePreview(stock.image || null);
// (line removed – no corresponding state setter exists)
      setErrors({});
    }
  }, [isOpen, stock]);

  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof StockFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          image: 'Please select a valid image file (JPG, PNG, WEBP)'
        }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          image: 'Image size must be less than 5MB'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Clear image error
      setErrors(prev => ({
        ...prev,
        image: undefined
      }));
    }
  };

  // Remove image
  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: undefined
    }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: StockFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Pack name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.stockNumber.trim()) {
      newErrors.stockNumber = 'Stock number is required';
    }

    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) {
      newErrors.price = 'Please enter a valid price greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !stock) {
      return;
    }

    setLoading(true);

    try {
      const stockData: UpdateStockRequest = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        rarity: formData.rarity,
        price: parseFloat(formData.price),
        currency: formData.currency as "USD" | "EUR" | "GBP" | undefined,
        stockNumber: formData.stockNumber.trim(),
      };

      // Handle image upload if present
      if (formData.image instanceof File) {
        // In a real implementation, you would upload the image to a storage service
        // For now, we'll create a mock URL
        stockData.image = `/images/stocks/${Date.now()}-${formData.image.name}`;
      } else if (imagePreview && imagePreview === stock.image) {
        // Keep existing image if no new image uploaded
        stockData.image = stock.image;
      }

      await stockService.updateStock(stock.id, stockData);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating stock:', error);
      setErrors({ name: 'Failed to update pack. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      setFormData({
        stockNumber: '',
        name: '',
        description: '',
        rarity: 'common',
        price: '',
        currency: 'USD',
        image: undefined
      });
      setImagePreview(null);
// (line removed – no corresponding state setter exists)
      setErrors({});
      onClose();
    }
  };

  if (!isOpen || !stock) return null;

  return (
    <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Pack</h2>
              <p className="text-sm text-gray-500">ID: {stock.id}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Pack Name */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Package className="w-4 h-4" />
              <span>Pack Name *</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter pack name"
              disabled={loading}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              <span>Description *</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter pack description"
              disabled={loading}
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>

          {/* Stock Number */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4" />
              <span>Stock Number *</span>
            </label>
            <input
              type="text"
              name="stockNumber"
              value={formData.stockNumber}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.stockNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter stock number"
              disabled={loading}
            />
            {errors.stockNumber && <p className="mt-1 text-sm text-red-600">{errors.stockNumber}</p>}
          </div>

          {/* Rarity */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4" />
              <span>Rarity Level *</span>
            </label>
            <select
              name="rarity"
              value={formData.rarity}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
          </div>

          {/* Price and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4" />
                <span>Price *</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={loading}
              />
              {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
            </div>
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4" />
                <span>Currency *</span>
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Upload className="w-4 h-4" />
              <span>Pack Image</span>
            </label>
            <div className="space-y-3">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Click to upload image</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (max 5MB)</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
                disabled={loading}
              />
            </div>
            {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Pack'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};