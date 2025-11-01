// Banner Service - Real API Implementation
// Handles all banner-related API calls

export interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  position?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BannerResponse {
  banners: Banner[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BannerStats {
  totalBanners: number;
}

export interface CreateBannerRequest {
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  position?: number;
}

export interface UpdateBannerRequest {
  title?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  position?: number;
}

export interface BannerFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

class BannerService {
  private baseUrl = '/api/banners';

  // Get all banners with optional filters and pagination
  async getBanners(filters: BannerFilters = {}): Promise<{ data: Banner[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch banners: ${response.statusText}`);
      }

      const result: BannerResponse = await response.json();
      return {
        data: result.banners,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error fetching banners:', error);
      throw error;
    }
  }

  // Get banner by ID
  async getBannerById(id: string): Promise<Banner> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Banner not found');
        }
        throw new Error(`Failed to fetch banner: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching banner:', error);
      throw error;
    }
  }

  // Create new banner
  async createBanner(bannerData: CreateBannerRequest): Promise<Banner> {
    try {
      // Map the service interface to API expected fields
      const apiData = {
        title: bannerData.title,
        description: bannerData.description,
        image: bannerData.imageUrl,
        link: bannerData.linkUrl,
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create banner: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating banner:', error);
      throw error;
    }
  }

  // Update banner
  async updateBanner(id: string, bannerData: UpdateBannerRequest): Promise<Banner> {
    try {
      // Map the service interface to API expected fields
      const apiData = {
        ...(bannerData.title && { title: bannerData.title }),
        ...(bannerData.description !== undefined && { description: bannerData.description }),
        ...(bannerData.imageUrl && { image: bannerData.imageUrl }),
        ...(bannerData.linkUrl !== undefined && { link: bannerData.linkUrl }),
      };

      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error('Banner not found');
        }
        throw new Error(errorData.error || `Failed to update banner: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating banner:', error);
      throw error;
    }
  }

  // Delete banner
  async deleteBanner(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Banner not found');
        }
        throw new Error(`Failed to delete banner: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      throw error;
    }
  }

  // Get banner statistics
  async getBannerStats(): Promise<BannerStats> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch banner stats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching banner stats:', error);
      // Return default stats if API fails
      return {
        totalBanners: 0,
      };
    }
  }

  // Search banners
  async searchBanners(query: string, filters?: Omit<BannerFilters, 'search'>): Promise<{ data: Banner[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.getBanners({ ...filters, search: query });
  }

  // Bulk delete banners
  async deleteBanners(ids: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete banners: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error bulk deleting banners:', error);
      throw error;
    }
  }

  // Update banner positions
  async updateBannerPositions(bannerPositions: { id: string; position: number }[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/positions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ positions: bannerPositions }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update banner positions: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating banner positions:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const bannerService = new BannerService();