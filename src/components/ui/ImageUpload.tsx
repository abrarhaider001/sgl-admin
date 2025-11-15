'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { FiUpload, FiX, FiImage, FiAlertCircle, FiCheck, FiLoader } from 'react-icons/fi';
import { imageService, ImageUploadOptions, ImageUploadResult } from '@/services/imageService';

export interface ImageUploadProps {
  value?: string;
  onChange?: (result: ImageUploadResult | null) => void;
  // Legacy support
  onImageUpload?: (result: ImageUploadResult | null) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
  context?: 'album' | 'card' | 'banner' | 'avatar' | 'pack';
  entityId?: string;
  options?: ImageUploadOptions;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
  multiple?: boolean;
  dragAndDrop?: boolean;
  showProgress?: boolean;
  maxRetries?: number;
  // Legacy support
  existingImageUrl?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onImageUpload,
  onError,
  onProgress,
  context = 'card',
  entityId,
  options,
  placeholder,
  className = '',
  disabled = false,
  showPreview = true,
  multiple = false,
  dragAndDrop = true,
  showProgress = true,
  maxRetries = 3,
  existingImageUrl
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  // Track the latest file selection to avoid race conditions
  const selectionIdRef = useRef(0);
  // Keep a blob URL reference to revoke when replaced/unmounted
  const blobUrlRef = useRef<string | null>(null);
  // Store progress interval for cleanup across selections
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update preview when value changes
  useEffect(() => {
    const normalize = (v?: string) => (v && v.trim().length > 0 ? v : null);
    const initial = normalize(value) ?? normalize(existingImageUrl) ?? null;
    setPreview(initial);
    setUploadSuccess(!!initial);
  }, [value, existingImageUrl]);

  // Cleanup any blob preview URLs and active intervals when unmounting
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  // Get context-specific options
  const uploadOptions = options || imageService.getOptionsForContext(context);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // For now, handle single file
    setError(null);
    setUploading(true);
    setProgress(0);
    setUploadSuccess(false);
    setRetryCount(0);
    if (typeof onProgress === 'function') onProgress(0);

    // Enhanced client-side validation
    const validationErrors: string[] = [];
    
    // File type validation based on upload options to match service
    const allowedTypes = uploadOptions.allowedTypes && uploadOptions.allowedTypes.length > 0
      ? uploadOptions.allowedTypes
      : ['image/jpeg', 'image/jpg', 'image/png'];
    const fileType = file.type.toLowerCase();
    if (!allowedTypes.includes(fileType)) {
      const supportedFormats = context === 'banner' ? 'JPEG, PNG' : 'JPEG, PNG, GIF';
      validationErrors.push(`Invalid file type. Supported formats: ${supportedFormats}. Got: ${file.type}`);
    }
    
    // File size validation
    const maxSizeInMB = uploadOptions.maxSizeInMB || 5;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      validationErrors.push(`File size too large. Maximum allowed: ${maxSizeInMB}MB. Current: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Minimum file size validation
    if (file.size < 1024) {
      validationErrors.push('File is too small. Minimum size: 1KB');
    }
    
    // File name validation
    if (file.name.length > 255) {
      validationErrors.push('File name is too long. Maximum 255 characters allowed');
    }
    
    // Check for potentially malicious file extensions
    const fileName = file.name.toLowerCase();
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
      validationErrors.push('File type not allowed for security reasons');
    }
    
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join('; ');
      setError(errorMessage);
      if (typeof onError === 'function') onError(errorMessage);
      setUploading(false);
      return;
    }

    // Increment selection id to guard against races
    selectionIdRef.current += 1;
    const selectionId = selectionIdRef.current;

    // Revoke previous blob preview if present
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    // Create preview immediately for better UX
    if (showPreview) {
      try {
        if (file.size > (2 * 1024 * 1024)) {
          // Use blob URL for large files to avoid heavy base64 strings
          const blobUrl = URL.createObjectURL(file);
          blobUrlRef.current = blobUrl;
          if (selectionId === selectionIdRef.current) {
            setPreview(blobUrl);
          }
        } else {
          const previewUrl = await imageService.createPreview(file);
          if (selectionId === selectionIdRef.current) {
            setPreview(previewUrl);
          }
        }
      } catch (err) {
        console.warn('Failed to create preview:', err);
      }
    }

  const attemptUpload = async (attempt: number = 1): Promise<void> => {
    try {
        // Simulate upload progress
                if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        progressIntervalRef.current = setInterval(() => {
          setProgress(prev => {
            const newProgress = Math.min(prev + Math.random() * 15, 90);
            if (typeof onProgress === 'function') onProgress(newProgress);
            return newProgress;
          });
        }, 200);

        // Upload the image
        const result = await imageService.uploadImage(file, uploadOptions, context, entityId);
        
        if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
        setProgress(100);
        if (typeof onProgress === 'function') onProgress(100);
        
        if (typeof onChange === 'function') onChange(result);
        if (typeof onImageUpload === 'function') onImageUpload(result);
        setUploadSuccess(true);
        // Reset retry count on success to avoid noisy messages
        setRetryCount(0);
        
        // Update preview with the uploaded image URL
        if (showPreview && result.url) {
          setPreview(result.url);
        }
        
        // Reset progress after success
        setTimeout(() => {
          setProgress(0);
          if (typeof onProgress === 'function') onProgress(0);
        }, 1000);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
        
        if (attempt < maxRetries) {
          setRetryCount(attempt);
          setTimeout(() => attemptUpload(attempt + 1), 1000 * attempt);
        } else {
          setError(`${errorMessage} (Failed after ${maxRetries} attempts)`);
          if (typeof onError === 'function') onError(errorMessage);
          setPreview(null);
          setProgress(0);
          if (typeof onProgress === 'function') onProgress(0);
        }
      }
    };

    try {
      await attemptUpload();
    } finally {
      setUploading(false);
    }
  }, [uploadOptions, onChange, onError, onProgress, showPreview, maxRetries, context]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled && dragAndDrop) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    if (!disabled && dragAndDrop) {
      handleFileSelect(event.dataTransfer.files);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    setProgress(0);
    setUploadSuccess(false);
    setRetryCount(0);
    if (typeof onChange === 'function') onChange(null);
    if (typeof onImageUpload === 'function') onImageUpload(null);
    if (typeof onProgress === 'function') onProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const getContextLabel = () => {
    switch (context) {
      case 'album': return 'Album Image';
      case 'card': return 'Card Image';
      case 'banner': return 'Banner Image';
      case 'avatar': return 'Avatar Image';
      default: return 'Image';
    }
  };

  const getContextDescription = () => {
    const { maxSizeInMB, allowedTypes, maxWidth, maxHeight } = uploadOptions || {};
    const types = allowedTypes?.map(type => type.split('/')[1].toUpperCase()).join(', ') || 'JPEG, PNG, GIF';
    return `Supported formats: ${types}. Max size: ${maxSizeInMB}MB. Max dimensions: ${maxWidth}x${maxHeight}px`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={uploadOptions?.allowedTypes?.join(',') || 'image/*'}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
        multiple={multiple}
      />

      {/* Upload area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
          ${dragOver 
            ? 'border-blue-400 bg-blue-50' 
            : error 
              ? 'border-red-300 bg-red-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${preview ? 'p-2' : 'p-6'}
        `}
      >
        {preview ? (
          // Preview mode
          <div className="relative group">
            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-transparent group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick();
                    }}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                    disabled={disabled || uploading}
                  >
                    <FiUpload size={16} className="text-gray-700" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove();
                    }}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                    disabled={disabled || uploading}
                  >
                    <FiX size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
            </div>
            
            {uploading && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center rounded-lg">
                <div className="flex flex-col items-center space-y-3 text-blue-600">
                  <FiLoader size={24} className="animate-spin" />
                  <div className="text-center">
                    <div className="text-sm font-medium">
                      {retryCount > 0 ? `Retrying... (${retryCount}/${maxRetries})` : 'Uploading...'}
                    </div>
                    {showProgress && (
                      <div className="mt-2 w-32">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{progress}%</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Upload prompt
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              {uploading ? (
                <FiLoader className="text-blue-600 animate-spin" size={24} />
              ) : error ? (
                <FiAlertCircle className="text-red-500" size={24} />
              ) : uploadSuccess ? (
                <FiCheck className="text-green-500" size={24} />
              ) : (
                <FiImage className="text-gray-400" size={24} />
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">
                {uploading 
                  ? (retryCount > 0 ? `Retrying... (${retryCount}/${maxRetries})` : 'Uploading...') 
                  : uploadSuccess 
                    ? 'Upload Complete!' 
                    : placeholder || `Upload ${getContextLabel()}`
                }
              </p>
              
              {uploading && showProgress && (
                <div className="w-48 mx-auto">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-center">{progress}%</div>
                </div>
              )}
              
              {!uploading && !uploadSuccess && (
                <>
                  <p className="text-xs text-gray-500">
                    {dragAndDrop ? 'Click to browse or drag and drop' : 'Click to browse'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {getContextDescription()}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <FiAlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Success message */}
      {!error && !uploading && uploadSuccess && (
        <div className="flex items-center space-x-2 text-green-600 text-sm">
          <FiCheck size={16} />
          <span>Image uploaded successfully</span>
        </div>
      )}

      {/* Retry information */}
      {retryCount > 0 && !uploading && (
        <div className="flex items-center space-x-2 text-yellow-600 text-xs">
          <FiAlertCircle size={14} />
          <span>Upload succeeded after retry</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;


