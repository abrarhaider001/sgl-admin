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
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { notifySuccess, notifyError } from '@/utils/snackbarBus';
import { Card, CreateCardRequest, UpdateCardRequest } from '@/types/card';

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
          imageUrl: data.imageUrl,
          name: data.name,
          points: data.points
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
          imageUrl: data.imageUrl,
          name: data.name,
          points: data.points
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
      return {
        id: cardDoc.id,
        cardID: cardDoc.data().cardID,
        description: cardDoc.data().description,
        imageUrl: cardDoc.data().imageUrl,
        name: cardDoc.data().name,
        points: cardDoc.data().points
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
      
      const allCards = cardsSnapshot.docs.map(doc => ({
        id: doc.id,
        cardID: doc.data().cardID,
        description: doc.data().description,
        imageUrl: doc.data().imageUrl,
        name: doc.data().name,
        points: doc.data().points
      })) as Card[];

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