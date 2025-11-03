// Card Service - Real API Implementation
// Handles all card-related API calls

export interface CardImages {
  bronze: string;
  silver: string;
  gold: string;
  titanium: string;
  diamond: string;
}

export interface Card {
  id: string;
  cardId: string;
  name: string;
  description: string;
  points: number;
  image?: string; // Legacy single image (for backward compatibility)
  images?: CardImages; // New 5-image variants
  createdAt?: string;
  updatedAt?: string;
}

export interface CardResponse {
  cards: Card[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CardStats {
  totalCards: number;
  averagePoints: number;
}

export interface CreateCardRequest {
  cardId?: string; // Optional - will be auto-generated if not provided
  name: string;
  description: string;
  points: number;
  image?: string; // Legacy support
  images?: Partial<CardImages>; // New 5-image variants (partial for flexibility during creation)
}

export interface UpdateCardRequest {
  cardId?: string;
  name?: string;
  description?: string;
  points?: number;
  image?: string; // Legacy support
  images?: Partial<CardImages>; // Allow updating individual image variants
}

export interface CardFilters {
  search?: string;
  minPoints?: number;
  maxPoints?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

class CardService {
  private baseUrl = '/api/cards';

  // Get all cards with optional filtering
  async getCards(filters?: CardFilters): Promise<{ data: Card[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.minPoints) params.append('minPoints', filters.minPoints.toString());
      if (filters?.maxPoints) params.append('maxPoints', filters.maxPoints.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch cards');
      }

      const result = await response.json();
      return {
        data: result.cards,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error fetching cards:', error);
      throw error;
    }
  }

  // Get a specific card
  async getCard(id: string): Promise<Card> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch card');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching card:', error);
      throw error;
    }
  }

  // Create a new card
  async createCard(data: CreateCardRequest): Promise<Card> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create card');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating card:', error);
      throw error;
    }
  }

  // Update a card
  async updateCard(id: string, data: UpdateCardRequest): Promise<Card> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update card');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating card:', error);
      throw error;
    }
  }

  // Delete a card
  async deleteCard(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete card');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      throw error;
    }
  }

  // Get card statistics
  async getCardStats(): Promise<CardStats> {
    try {
      // Get all cards to calculate stats
      const { data: cards } = await this.getCards({ limit: 1000 });
      
      const totalCards = cards.length;
      const totalPoints = cards.reduce((sum, card) => sum + card.points, 0);
      const averagePoints = totalCards > 0 ? totalPoints / totalCards : 0;

      return {
        totalCards,
        averagePoints
      };
    } catch (error) {
      console.error('Error calculating card stats:', error);
      throw error;
    }
  }

  // Search cards
  async searchCards(query: string, filters?: Omit<CardFilters, 'search'>): Promise<{ data: Card[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.getCards({ ...filters, search: query });
  }

  // Bulk operations
  async bulkUpdateCards(ids: string[], updates: UpdateCardRequest): Promise<Card[]> {
    try {
      const promises = ids.map(id => this.updateCard(id, updates));
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  }

  async bulkDeleteCards(ids: string[]): Promise<void> {
    try {
      const promises = ids.map(id => this.deleteCard(id));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      throw error;
    }
  }

  // Duplicate card
  async duplicateCard(cardId: string, newCardId?: string): Promise<Card> {
    try {
      const originalCard = await this.getCard(cardId);
      
      const duplicateData: CreateCardRequest = {
        cardId: newCardId || `${originalCard.cardId}_COPY_${Date.now()}`,
        name: `${originalCard.name} (Copy)`,
        description: originalCard.description,
        points: originalCard.points,
        image: originalCard.image
      };

      return await this.createCard(duplicateData);
    } catch (error) {
      console.error('Error duplicating card:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const cardService = new CardService();
export default cardService;