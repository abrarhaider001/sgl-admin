// Card Image Service - Handles 5-variant image uploads for cards
// Implements bronze, silver, gold, titanium, and diamond image variants

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { CardImages } from '@/types/album';

export type ImageVariant = 'bronze' | 'silver' | 'gold' | 'titanium' | 'diamond';

export interface CardImageUploadResult {
  variant: ImageVariant;
  url: string;
  fileName: string;
  size: number;
}

export interface CardImageUploadOptions {
  maxSizeInMB?: number;
  allowedTypes?: string[];
  quality?: number;
}

export interface CardImageValidationError {
  variant: ImageVariant;
  code: string;
  message: string;
}

export class CardImageService {
  private static readonly DEFAULT_OPTIONS: CardImageUploadOptions = {
    maxSizeInMB: 5,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    quality: 0.8
  };

  private static readonly REQUIRED_VARIANTS: ImageVariant[] = ['bronze', 'silver', 'gold', 'titanium', 'diamond'];

  /**
   * Validates a single image file
   */
  private static validateImageFile(file: File, variant: ImageVariant, options?: CardImageUploadOptions): CardImageValidationError[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const errors: CardImageValidationError[] = [];

    // Check file size
    const maxSizeBytes = (opts.maxSizeInMB || 5) * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      errors.push({
        variant,
        code: 'FILE_TOO_LARGE',
        message: `${variant} image must be smaller than ${opts.maxSizeInMB}MB`
      });
    }

    // Check file type
    if (opts.allowedTypes && !opts.allowedTypes.includes(file.type)) {
      errors.push({
        variant,
        code: 'INVALID_FILE_TYPE',
        message: `${variant} image must be one of: ${opts.allowedTypes.join(', ')}`
      });
    }

    // Check file name convention (optional validation)
    const expectedPattern = new RegExp(`.*_${variant}\\.(png|jpg|jpeg|webp)$`, 'i');
    if (!expectedPattern.test(file.name)) {
      console.warn(`File name doesn't follow convention for ${variant}: expected *_${variant}.ext`);
    }

    return errors;
  }

  /**
   * Validates all 5 image files
   */
  static validateImageFiles(files: Record<ImageVariant, File>, options?: CardImageUploadOptions): CardImageValidationError[] {
    const errors: CardImageValidationError[] = [];

    // Check that all variants are provided
    for (const variant of this.REQUIRED_VARIANTS) {
      if (!files[variant]) {
        errors.push({
          variant,
          code: 'MISSING_VARIANT',
          message: `${variant} image is required`
        });
      } else {
        // Validate individual file
        const fileErrors = this.validateImageFile(files[variant], variant, options);
        errors.push(...fileErrors);
      }
    }

    return errors;
  }

  /**
   * Generates the proper file name for a card image variant
   */
  private static generateFileName(cardId: string, variant: ImageVariant, originalFile: File): string {
    const extension = originalFile.name.split('.').pop()?.toLowerCase() || 'png';
    return `card_${cardId}_${variant}.${extension}`;
  }

  /**
   * Generates the storage path for a card image
   */
  private static generateStoragePath(cardId: string, variant: ImageVariant, originalFile: File): string {
    const fileName = this.generateFileName(cardId, variant, originalFile);
    return `cards/${cardId}/${fileName}`;
  }

  /**
   * Uploads a single image variant
   */
  private static async uploadSingleImage(
    cardId: string,
    variant: ImageVariant,
    file: File,
    options?: CardImageUploadOptions
  ): Promise<CardImageUploadResult> {
    try {
      // Validate the file
      const errors = this.validateImageFile(file, variant, options);
      if (errors.length > 0) {
        throw new Error(errors.map(e => e.message).join('; '));
      }

      // Generate storage path
      const storagePath = this.generateStoragePath(cardId, variant, file);
      const storageRef = ref(storage, storagePath);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          cardId,
          variant,
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      });

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        variant,
        url: downloadURL,
        fileName: this.generateFileName(cardId, variant, file),
        size: file.size
      };
    } catch (error) {
      console.error(`Error uploading ${variant} image for card ${cardId}:`, error);
      throw new Error(`Failed to upload ${variant} image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Uploads all 5 image variants for a card
   */
  static async uploadCardImages(
    cardId: string,
    files: Record<ImageVariant, File>,
    options?: CardImageUploadOptions
  ): Promise<CardImages> {
    // Validate all files first
    const validationErrors = this.validateImageFiles(files, options);
    if (validationErrors.length > 0) {
      throw new Error('Validation failed: ' + validationErrors.map(e => e.message).join('; '));
    }

    try {
      // Upload all images in parallel
      const uploadPromises = this.REQUIRED_VARIANTS.map(variant =>
        this.uploadSingleImage(cardId, variant, files[variant], options)
      );

      const results = await Promise.all(uploadPromises);

      // Convert results to CardImages format
      const cardImages: CardImages = {
        bronze: '',
        silver: '',
        gold: '',
        titanium: '',
        diamond: ''
      };

      results.forEach(result => {
        cardImages[result.variant] = result.url;
      });

      return cardImages;
    } catch (error) {
      console.error(`Error uploading images for card ${cardId}:`, error);
      // Clean up any successfully uploaded images
      await this.deleteCardImages(cardId).catch(cleanupError => {
        console.error('Error during cleanup:', cleanupError);
      });
      throw error;
    }
  }

  /**
   * Updates a specific image variant for a card
   */
  static async updateCardImageVariant(
    cardId: string,
    variant: ImageVariant,
    file: File,
    options?: CardImageUploadOptions
  ): Promise<string> {
    try {
      // Delete the old image first
      await this.deleteCardImageVariant(cardId, variant).catch(error => {
        console.warn(`Could not delete old ${variant} image:`, error);
      });

      // Upload the new image
      const result = await this.uploadSingleImage(cardId, variant, file, options);
      return result.url;
    } catch (error) {
      console.error(`Error updating ${variant} image for card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a specific image variant for a card
   */
  static async deleteCardImageVariant(cardId: string, variant: ImageVariant): Promise<void> {
    try {
      const storagePath = `cards/${cardId}/card_${cardId}_${variant}`;
      
      // Try common extensions
      const extensions = ['png', 'jpg', 'jpeg', 'webp'];
      const deletePromises = extensions.map(async (ext) => {
        try {
          const fullPath = `${storagePath}.${ext}`;
          const storageRef = ref(storage, fullPath);
          await deleteObject(storageRef);
          console.log(`Deleted ${variant} image: ${fullPath}`);
        } catch (error) {
          // Ignore not found errors, as we're trying multiple extensions
          if ((error as any)?.code !== 'storage/object-not-found') {
            throw error;
          }
        }
      });

      await Promise.allSettled(deletePromises);
    } catch (error) {
      console.error(`Error deleting ${variant} image for card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Deletes all images for a card
   */
  static async deleteCardImages(cardId: string): Promise<void> {
    try {
      const cardFolderRef = ref(storage, `cards/${cardId}`);
      
      // List all files in the card's folder
      const listResult = await listAll(cardFolderRef);
      
      // Delete all files
      const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
      await Promise.all(deletePromises);
      
      console.log(`Deleted all images for card ${cardId}`);
    } catch (error) {
      console.error(`Error deleting images for card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Gets the expected file names for all variants of a card
   */
  static getExpectedFileNames(cardId: string): Record<ImageVariant, string> {
    return {
      bronze: `card_${cardId}_bronze.png`,
      silver: `card_${cardId}_silver.png`,
      gold: `card_${cardId}_gold.png`,
      titanium: `card_${cardId}_titanium.png`,
      diamond: `card_${cardId}_diamond.png`
    };
  }

  /**
   * Validates that the provided files follow the naming convention
   */
  static validateFileNamingConvention(cardId: string, files: Record<ImageVariant, File>): CardImageValidationError[] {
    const errors: CardImageValidationError[] = [];
    
    for (const variant of this.REQUIRED_VARIANTS) {
      if (files[variant]) {
        const expectedPattern = new RegExp(`card_${cardId}_${variant}\\.(png|jpg|jpeg|webp)$`, 'i');
        if (!expectedPattern.test(files[variant].name)) {
          errors.push({
            variant,
            code: 'INVALID_FILE_NAME',
            message: `${variant} image must be named: card_${cardId}_${variant}.{png|jpg|jpeg|webp}`
          });
        }
      }
    }
    
    return errors;
  }
}

export default CardImageService;