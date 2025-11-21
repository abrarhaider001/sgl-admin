import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { notifySuccess, notifyError } from '@/utils/snackbarBus';
import { Card, CardImages, CreateCardRequest, UpdateCardRequest } from '@/types/card';
import CardImageService from './cardImageService';


export class FirebaseCardService {
  private collectionName = 'cards';

  // Get all cards
  async getAllCards(): Promise<Card[]> {
    try {
      const cardsCollection = collection(db, this.collectionName);
      const cardsSnapshot = await getDocs(query(cardsCollection, orderBy('name')));
      
      return cardsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          cardID: data.cardID,
          description: data.description,
          imageUrl: data.imageUrl, // Legacy support
          images: data.images, // New 5-image variants
          name: data.name,
          points: data.points,
          isLocked: data.isLocked ?? false
        } as Card;
      });
    } catch (error) {
      console.error('Error fetching cards:', error);
      throw new Error('Failed to fetch cards');
    }
  }

  // Get cards by IDs (for specific album)
  async getCardsByIds(cardIds: string[]): Promise<Card[]> {
    try {
      if (!cardIds || cardIds.length === 0) {
        return [];
      }

      const cardsCollection = collection(db, this.collectionName);
      const cardsQuery = query(cardsCollection, where('cardID', 'in', cardIds));
      const cardsSnapshot = await getDocs(cardsQuery);
      
      return cardsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          cardID: data.cardID,
          description: data.description,
          imageUrl: data.imageUrl, // Legacy support
          images: data.images, // New 5-image variants
          name: data.name,
          points: data.points,
          isLocked: data.isLocked ?? false
        } as Card;
      });
    } catch (error) {
      console.error('Error fetching cards by IDs:', error);
      throw new Error('Failed to fetch cards');
    }
  }

  // Get single card by ID
  async getCardById(cardId: string): Promise<Card | null> {
    try {
      const cardsCollection = collection(db, this.collectionName);
      const cardQuery = query(cardsCollection, where('cardID', '==', cardId));
      const cardSnapshot = await getDocs(cardQuery);
      
      if (cardSnapshot.empty) {
        return null;
      }

      const cardDoc = cardSnapshot.docs[0];
      const data = cardDoc.data();
      return {
        id: cardDoc.id,
        cardID: data.cardID,
        description: data.description,
        imageUrl: data.imageUrl, // Legacy support
        images: data.images, // New 5-image variants
        name: data.name,
        points: data.points,
        isLocked: data.isLocked ?? false
      } as Card;
    } catch (error) {
      console.error('Error fetching card:', error);
      throw new Error('Failed to fetch card');
    }
  }

  // Create new card
  async createCard(cardData: CreateCardRequest): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to create cards');
      }

      // Check if cardID already exists
      const existingCard = await this.getCardById(cardData.cardID);
      if (existingCard) {
        throw new Error('Card with this ID already exists');
      }

      const cardsCollection = collection(db, this.collectionName);
      const docRef = await addDoc(cardsCollection, {
        ...cardData,
        createdAt: Timestamp.now()
      });

      notifySuccess('create', 'Card');
      return docRef.id;
    } catch (error) {
      console.error('Error creating card:', error);
      notifyError('create', 'Card', error);
      throw error;
    }
  }

  // Create new card with 5 image variants
  async createCardWithImages(
    cardData: CreateCardRequest, 
    imageFiles: { [key in keyof CardImages]: File }
  ): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to create cards');
      }

      // Check if cardID already exists
      const existingCard = await this.getCardById(cardData.cardID);
      if (existingCard) {
        throw new Error('Card with this ID already exists');
      }

      // Upload all 5 image variants (returns CardImages with URLs)
      const images: CardImages = await CardImageService.uploadCardImages(cardData.cardID, imageFiles);

      // Create card with image URLs
      const cardsCollection = collection(db, this.collectionName);
      const docRef = await addDoc(cardsCollection, {
        ...cardData,
        images,
        createdAt: Timestamp.now()
      });

      notifySuccess('create', 'Card');
      return docRef.id;
    } catch (error) {
      console.error('Error creating card with images:', error);
      
      // Cleanup: attempt to delete uploaded images if card creation failed
      try {
        await CardImageService.deleteCardImages(cardData.cardID);
      } catch (cleanupError) {
        console.error('Error cleaning up images after failed card creation:', cleanupError);
      }
      
      notifyError('create', 'Card', error);
      throw error;
    }
  }

  // Update existing card
  async updateCard(cardId: string, updates: UpdateCardRequest): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to update cards');
      }

      // Find the document by cardID
      const cardsCollection = collection(db, this.collectionName);
      const cardQuery = query(cardsCollection, where('cardID', '==', cardId));
      const cardSnapshot = await getDocs(cardQuery);
      
      if (cardSnapshot.empty) {
        throw new Error('Card not found');
      }

      const cardDoc = cardSnapshot.docs[0];
      const cardRef = doc(db, this.collectionName, cardDoc.id);
      
      await updateDoc(cardRef, {
        ...updates
      });
      notifySuccess('update', 'Card');
    } catch (error) {
      console.error('Error updating card:', error);
      notifyError('update', 'Card', error);
      throw error;
    }
  }

  // Update card with specific image variants
  async updateCardWithImages(
    cardId: string, 
    updates: UpdateCardRequest,
    imageFiles?: { [key in keyof Partial<CardImages>]: File }
  ): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to update cards');
      }

      // Find the document by cardID
      const cardsCollection = collection(db, this.collectionName);
      const cardQuery = query(cardsCollection, where('cardID', '==', cardId));
      const cardSnapshot = await getDocs(cardQuery);
      
      if (cardSnapshot.empty) {
        throw new Error('Card not found');
      }

      const cardDoc = cardSnapshot.docs[0];
      const cardRef = doc(db, this.collectionName, cardDoc.id);
      const currentCard = cardDoc.data() as Card;

      let updatedImages = currentCard.images;

      // Upload/update specific image variants if provided
      if (imageFiles && Object.keys(imageFiles).length > 0) {
        const variantUrlEntries = await Promise.all(
          Object.entries(imageFiles).map(async ([variant, file]) => {
            const url = await CardImageService.updateCardImageVariant(cardId, variant as keyof CardImages, file);
            return [variant, url] as const;
          })
        );

        const updatedVariantUrls = Object.fromEntries(variantUrlEntries);

        updatedImages = {
          ...currentCard.images,
          ...updatedVariantUrls
        } as CardImages;
      }

      // Update card with new data and images
      await updateDoc(cardRef, {
        ...updates,
        ...(updatedImages && { images: updatedImages })
      });
      
      notifySuccess('update', 'Card');
    } catch (error) {
      console.error('Error updating card with images:', error);
      notifyError('update', 'Card', error);
      throw error;
    }
  }

  // Delete card
  async deleteCard(cardId: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to delete cards');
      }

      // Find the document by cardID
      const cardsCollection = collection(db, this.collectionName);
      const cardQuery = query(cardsCollection, where('cardID', '==', cardId));
      const cardSnapshot = await getDocs(cardQuery);
      
      if (cardSnapshot.empty) {
        throw new Error('Card not found');
      }

      const cardDoc = cardSnapshot.docs[0];
      const cardRef = doc(db, this.collectionName, cardDoc.id);
      
      // Delete associated images from Firebase Storage
      try {
        await CardImageService.deleteAllVariants(cardId);
      } catch (imageError) {
        console.warn('Error deleting card images (continuing with card deletion):', imageError);
        // Continue with card deletion even if image deletion fails
      }
      
      // Delete the card document
      await deleteDoc(cardRef);
      notifySuccess('delete', 'Card');
    } catch (error) {
      console.error('Error deleting card:', error);
      notifyError('delete', 'Card', error);
      throw error;
    }
  }

  // Search cards by name or description
  async searchCards(searchTerm: string): Promise<Card[]> {
    try {
      const cardsCollection = collection(db, this.collectionName);
      const cardsSnapshot = await getDocs(cardsCollection);
      
      const allCards = cardsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          cardID: data.cardID,
          description: data.description,
          imageUrl: data.imageUrl, // Legacy support
          images: data.images, // New 5-image variants
          name: data.name,
          points: data.points,
          isLocked: data.isLocked ?? false
        } as Card;
      });

      // Filter cards that match the search term
      return allCards.filter(card => 
        card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.cardID.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching cards:', error);
      throw new Error('Failed to search cards');
    }
  }
}

// Export singleton instance
export const firebaseCardService = new FirebaseCardService();