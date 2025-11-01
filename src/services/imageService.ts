// Centralized Image Upload Service
// Handles file validation, upload, and storage for albums, cards, and banners
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface ImageUploadOptions {
  maxSizeInMB?: number;
  allowedTypes?: string[];
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface ImageUploadResult {
  url: string;
  originalName: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
}

export interface ImageValidationError {
  code: string;
  message: string;
}

class ImageService {
  private readonly defaultOptions: Required<ImageUploadOptions> = {
    maxSizeInMB: 5,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    quality: 0.8,
    maxWidth: 2048,
    maxHeight: 2048
  };

  /**
   * Validates an image file against the specified options
   */
  validateImage(file: File, options?: ImageUploadOptions): ImageValidationError[] {
    const errors: ImageValidationError[] = [];
    const opts = { ...this.defaultOptions, ...options };
    
    // File type validation - Enhanced to support JPEG, PNG, GIF
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      errors.push({
        code: 'INVALID_TYPE',
        message: `Invalid file type. Supported formats: JPEG, PNG, GIF. Got: ${file.type}`
      });
    }
    
    // File size validation
    const maxSizeInBytes = opts.maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File size too large. Maximum allowed: ${opts.maxSizeInMB}MB. Current: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      });
    }
    
    // Minimum file size validation (prevent empty files)
    if (file.size < 1024) { // 1KB minimum
      errors.push({
        code: 'FILE_TOO_SMALL',
        message: 'File is too small. Minimum size: 1KB'
      });
    }
    
    return errors;
  }

  /**
   * Creates a preview URL for an image file
   */
  createPreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Failed to create image preview'));
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Compresses and resizes an image if needed
   */
  private compressImage(file: File, options?: ImageUploadOptions): Promise<File> {
    return new Promise((resolve, reject) => {
      const opts = { ...this.defaultOptions, ...options };
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          opts.quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Uploads an image file and returns the URL
   * Uses the real upload API endpoint
  */
  async uploadImage(file: File, options?: ImageUploadOptions, entityType?: string, entityId?: string): Promise<ImageUploadResult> {
    // Validate the image
    const validationErrors = this.validateImage(file, options);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.map(e => e.message).join('; '));
    }

    try {
      // Compress the image if needed
      const processedFile = await this.compressImage(file, options);

      // Determine storage folder based on entity type
      const folderMap: Record<string, string> = {
        album: 'albums',
        card: 'cards',
        banner: 'banners',
        avatar: 'avatars',
        pack: 'packs'
      };
      const folder = entityType ? (folderMap[entityType] || 'uploads') : 'uploads';

      // Sanitize filename and create unique path
      const originalName = processedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const path = `${folder}/${entityId ? `${entityId}/` : ''}${timestamp}-${rand}-${originalName}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, processedFile, { contentType: processedFile.type });
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Get image dimensions
      const { width, height } = await this.getImageDimensions(processedFile);

      return {
        url: downloadURL,
        originalName: processedFile.name,
        size: processedFile.size,
        type: processedFile.type,
        width,
        height
      };
    } catch (error) {
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the dimensions of an image file
   */
  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error('Failed to get image dimensions'));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Deletes an uploaded image
   * Uses the real API endpoint to delete from storage
   */
  async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      // Create a Storage ref from the download URL and delete
      let storageRef;
      if (imageUrl.startsWith('http')) {
        const oIndex = imageUrl.indexOf('/o/');
        if (oIndex !== -1) {
          const endIndex = imageUrl.indexOf('?', oIndex);
          const encodedPath = imageUrl.substring(oIndex + 3, endIndex === -1 ? imageUrl.length : endIndex);
          const storagePath = decodeURIComponent(encodedPath);
          storageRef = ref(storage, storagePath);
        } else {
          storageRef = ref(storage, imageUrl);
        }
      } else {
        storageRef = ref(storage, imageUrl);
      }
      await deleteObject(storageRef);
      return true;
    } catch (error) {
      console.error('Failed to delete image:', error);
      return false;
    }
  }

  /**
   * Batch upload multiple images
   */
  async uploadMultipleImages(files: File[], options?: ImageUploadOptions): Promise<ImageUploadResult[]> {
    const results: ImageUploadResult[] = [];
    
    for (const file of files) {
      try {
        const result = await this.uploadImage(file, options);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Continue with other files
      }
    }
    
    return results;
  }

  /**
   * Get optimized image options for different use cases
   */
  getOptionsForContext(context: 'album' | 'card' | 'banner' | 'avatar'): ImageUploadOptions {
    // Extend to include 'pack' context
    // Keeping function signature backward compatible; ImageUpload passes options directly
    switch (context) {
      case 'album':
        return {
          maxSizeInMB: 5,
          allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
          quality: 0.85,
          maxWidth: 1200,
          maxHeight: 1200
        };
      
      case 'card':
        return {
          maxSizeInMB: 3,
          allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
          quality: 0.8,
          maxWidth: 800,
          maxHeight: 1000
        };
      
      case 'banner':
        return {
          maxSizeInMB: 10,
          allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
          quality: 0.9,
          maxWidth: 1920,
          maxHeight: 800
        };
      
      case 'avatar':
        return {
          maxSizeInMB: 2,
          allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
          quality: 0.8,
          maxWidth: 400,
          maxHeight: 400
        };
      case 'pack':
        return {
          maxSizeInMB: 5,
          allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
          quality: 0.85,
          maxWidth: 1200,
          maxHeight: 1200
        };
      
      default:
        return this.defaultOptions;
    }
  }
}

// Export singleton instance
export const imageService = new ImageService();
export default imageService;