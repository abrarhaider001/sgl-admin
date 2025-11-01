// Stock Service - Real API Implementation
// Handles all stock-related API calls

import { 
  Stock,
  CreateStockRequest, 
  UpdateStockRequest, 
  StockStats, 
  StockFilters,
  CardSelectionItem
} from '../types/stock';
import { Card } from '../types/album';

class StockService {
  private baseUrl = '/api/stocks';

  // Get all stocks with optional filtering
  async getStocks(filters?: StockFilters): Promise<{ data: Stock[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.rarity) params.append('rarity', filters.rarity);
      if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch stocks');
      }

      const result = await response.json();
      return {
        data: result.stocks || result.data,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error fetching stocks:', error);
      throw error;
    }
  }

  // Get a specific stock
  async getStock(id: string): Promise<Stock> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch stock');
      }

      const result = await response.json();
      return result.stock || result.data;
    } catch (error) {
      console.error('Error fetching stock:', error);
      throw error;
    }
  }

  // Create a new stock
  async createStock(stockData: CreateStockRequest): Promise<Stock> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create stock');
      }

      const result = await response.json();
      return result.stock || result.data;
    } catch (error) {
      console.error('Error creating stock:', error);
      throw error;
    }
  }

  // Update an existing stock
  async updateStock(id: string, stockData: UpdateStockRequest): Promise<Stock> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update stock');
      }

      const result = await response.json();
      return result.stock || result.data;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  // Delete a stock
  async deleteStock(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete stock');
      }
    } catch (error) {
      console.error('Error deleting stock:', error);
      throw error;
    }
  }

  // Get stock statistics
  async getStockStats(): Promise<StockStats> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch stock statistics');
      }

      const result = await response.json();
      return result.stats || result.data;
    } catch (error) {
      console.error('Error fetching stock statistics:', error);
      throw error;
    }
  }

  // Get available cards for stock creation
  async getAvailableCards(): Promise<CardSelectionItem[]> {
    try {
      const response = await fetch('/api/cards?limit=1000'); // Get all cards
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch available cards');
      }

      const result = await response.json();
      const cards = result.cards || result.data || [];

      // Transform cards to CardSelectionItem format
      return cards.map((card: Card & { albumName?: string; rarity?: string; type?: string; albumId?: string; album?: { _id?: string } }) => ({
        cardId: card.cardId, // Use cardId instead of _id
        name: card.name,
        image: card.image,
        rarity: card.rarity || 'common', // Provide default value
        type: card.type || 'standard', // Provide default value
        points: card.points,
        albumId: card.albumId || card.album?._id || '',
        albumName: card.albumName || 'Unknown Album',
        selected: false,
        quantity: 0
      }));
    } catch (error) {
      console.error('Error fetching available cards:', error);
      throw error;
    }
  }

  // Upload stock image
  async uploadStockImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'stock');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const result = await response.json();
      return result.url || result.path;
    } catch (error) {
      console.error('Error uploading stock image:', error);
      throw error;
    }
  }

  // Validate stock number uniqueness
  async validateStockNumber(stockNumber: string, excludeId?: string): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      params.append('stockNumber', stockNumber);
      if (excludeId) params.append('excludeId', excludeId);

      const response = await fetch(`${this.baseUrl}/validate-stock-number?${params.toString()}`);
      
      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.isValid || false;
    } catch (error) {
      console.error('Error validating stock number:', error);
      return false;
    }
  }

  // Get stocks by rarity
  async getStocksByRarity(rarity: 'common' | 'rare' | 'epic' | 'legendary'): Promise<Stock[]> {
    try {
      const { data } = await this.getStocks({ rarity, limit: 100 });
      return data;
    } catch (error) {
      console.error('Error fetching stocks by rarity:', error);
      throw error;
    }
  }

  // Search stocks
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      const { data } = await this.getStocks({ search: query, limit: 50 });
      return data;
    } catch (error) {
      console.error('Error searching stocks:', error);
      throw error;
    }
  }

  // Toggle stock active status
  async toggleStockStatus(id: string, isActive: boolean): Promise<Stock> {
    try {
      return await this.updateStock(id, { isActive });
    } catch (error) {
      console.error('Error toggling stock status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const stockService = new StockService();
export default stockService;