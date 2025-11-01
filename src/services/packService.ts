// Pack Service - Real API Implementation
// Handles all pack-related API calls

import { Pack } from '@/types';

export interface PackResponse {
  packs: Pack[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PackStats {
  totalPacks: number;
  averagePrice: number;
  packsByRarity: Record<string, number>;
  featuredPacks: number;
}

export interface CreatePackRequest {
  packId?: string;
  name: string;
  description: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  stockNo: string;
  image?: string;
  isFeatured?: boolean;
}

export interface UpdatePackRequest {
  packId?: string;
  name?: string;
  description?: string;
  price?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  stockNo?: string;
  image?: string;
  isFeatured?: boolean;
}

export interface PackFilters {
  search?: string;
  rarity?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

class PackService {
  private baseUrl = '/api/packs';

  // Get all packs with optional filtering
  async getPacks(filters?: PackFilters): Promise<{ data: Pack[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.rarity) params.append('rarity', filters.rarity);
      if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters?.isFeatured !== undefined) params.append('isFeatured', filters.isFeatured.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch packs');
      }

      const result = await response.json();
      return {
        data: result.packs,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error fetching packs:', error);
      throw error;
    }
  }

  // Get a specific pack
  async getPack(id: string): Promise<Pack> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pack');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching pack:', error);
      throw error;
    }
  }

  // Create a new pack
  async createPack(data: CreatePackRequest): Promise<Pack> {
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
        throw new Error(errorData.error || 'Failed to create pack');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating pack:', error);
      throw error;
    }
  }

  // Update a pack
  async updatePack(id: string, data: UpdatePackRequest): Promise<Pack> {
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
        throw new Error(errorData.error || 'Failed to update pack');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating pack:', error);
      throw error;
    }
  }

  // Delete a pack
  async deletePack(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete pack');
      }
    } catch (error) {
      console.error('Error deleting pack:', error);
      throw error;
    }
  }

  // Get pack statistics
  async getPackStats(): Promise<PackStats> {
    try {
      // Get all packs to calculate stats
      const { data: packs } = await this.getPacks({ limit: 1000 });
      
      const totalPacks = packs.length;
      const totalPrice = packs.reduce((sum, pack) => sum + pack.price, 0);
      const averagePrice = totalPacks > 0 ? totalPrice / totalPacks : 0;
      const featuredPacks = packs.filter(pack => pack.isFeatured).length;

      // Group by rarity
      const packsByRarity = packs.reduce((acc, pack) => {
        acc[pack.rarity] = (acc[pack.rarity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalPacks,
        averagePrice,
        packsByRarity,
        featuredPacks
      };
    } catch (error) {
      console.error('Error calculating pack stats:', error);
      throw error;
    }
  }

  // Search packs
  async searchPacks(query: string, filters?: Omit<PackFilters, 'search'>): Promise<{ data: Pack[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.getPacks({ ...filters, search: query });
  }

  // Get packs by rarity
  async getPacksByRarity(rarity: string, filters?: Omit<PackFilters, 'rarity'>): Promise<{ data: Pack[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.getPacks({ ...filters, rarity });
  }

  // Get featured packs
  async getFeaturedPacks(filters?: Omit<PackFilters, 'isFeatured'>): Promise<{ data: Pack[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.getPacks({ ...filters, isFeatured: true });
  }

  // Bulk operations
  async bulkUpdatePacks(ids: string[], updates: UpdatePackRequest): Promise<Pack[]> {
    try {
      const promises = ids.map(id => this.updatePack(id, updates));
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  }

  async bulkDeletePacks(ids: string[]): Promise<void> {
    try {
      const promises = ids.map(id => this.deletePack(id));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const packService = new PackService();
export default packService;