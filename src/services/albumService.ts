// Album Service - Real API Implementation
// Handles all album-related API calls

import { Album, AlbumFilters, CreateAlbumRequest, UpdateAlbumRequest, AlbumStats } from '@/types/album';
import cardService, { Card } from './cardService';

export interface AlbumResponse {
  albums: Album[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AlbumWithCardsResponse {
  album: Album;
  cards: Card[];
}

class AlbumService {
  private baseUrl = '/api/albums';

  // Get all albums with optional filtering
  async getAlbums(filters?: AlbumFilters): Promise<{ data: Album[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch albums');
      }

      const result = await response.json();
      return {
        data: result.albums,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error fetching albums:', error);
      throw error;
    }
  }

  // Get a specific album with its cards
  async getAlbum(id: string): Promise<AlbumWithCardsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch album');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching album:', error);
      throw error;
    }
  }

  // Alias for getAlbum - for backward compatibility
  async getAlbumWithCards(id: string): Promise<AlbumWithCardsResponse> {
    return this.getAlbum(id);
  }

  // Delegate card operations to cardService
  async getCards(filters?: import('./cardService').CardFilters): Promise<{ data: Card[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    return cardService.getCards(filters);
  }

  // Create a new card
  async createCard(data: import('./cardService').CreateCardRequest): Promise<Card> {
    return cardService.createCard(data);
  }

  // Update a card
  async updateCard(id: string, data: import('./cardService').UpdateCardRequest): Promise<Card> {
    return cardService.updateCard(id, data);
  }

  // Delete a card - delegate to cardService
  async deleteCard(id: string): Promise<void> {
    return cardService.deleteCard(id);
  }

  // Create a new album
  async createAlbum(data: CreateAlbumRequest): Promise<Album> {
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
        throw new Error(errorData.error || 'Failed to create album');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating album:', error);
      throw error;
    }
  }

  // Update an album
  async updateAlbum(id: string, data: UpdateAlbumRequest): Promise<Album> {
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
        throw new Error(errorData.error || 'Failed to update album');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating album:', error);
      throw error;
    }
  }

  // Delete an album
  async deleteAlbum(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete album');
      }
    } catch (error) {
      console.error('Error deleting album:', error);
      throw error;
    }
  }

  // Get album statistics
  async getAlbumStats(): Promise<AlbumStats> {
    try {
      // Get all albums to calculate stats
      const { data: albums } = await this.getAlbums({ limit: 1000 });
      
      const totalAlbums = albums.length;
      const totalCards = albums.reduce((sum, album) => sum + (album.cardIds?.length || 0), 0);

      return {
        totalAlbums,
        totalCards
      };
    } catch (error) {
      console.error('Error calculating album stats:', error);
      throw error;
    }
  }

  // Search albums
  async searchAlbums(query: string, filters?: Omit<AlbumFilters, 'search'>): Promise<{ data: Album[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.getAlbums({ ...filters, search: query });
  }

  // Bulk operations
  async bulkUpdateAlbums(ids: string[], updates: UpdateAlbumRequest): Promise<Album[]> {
    try {
      const promises = ids.map(id => this.updateAlbum(id, updates));
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  }

  async bulkDeleteAlbums(ids: string[]): Promise<void> {
    try {
      const promises = ids.map(id => this.deleteAlbum(id));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const albumService = new AlbumService();
export default albumService;