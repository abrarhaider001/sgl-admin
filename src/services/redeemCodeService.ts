// Redeem Code Service - Real API Implementation
// Handles all redeem code-related API calls

import { RedeemCode } from '@/types';

export interface RedeemCodeResponse {
  redeemCodes: RedeemCode[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RedeemCodeStats {
  totalCodes: number;
  codesByCard: Record<string, number>;
}

export interface CreateRedeemCodeRequest {
  codeId?: string;
  qrCode: string;
  cardId: string;
}

export interface UpdateRedeemCodeRequest {
  codeId?: string;
  qrCode?: string;
  cardId?: string;
}

export interface RedeemRequest {
  qrCode: string;
  userId: string;
}

export interface RedeemResponse {
  success: boolean;
  message: string;
  cardId?: string;
  redeemCode?: RedeemCode;
}

export interface RedeemCodeFilters {
  search?: string;
  cardId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

class RedeemCodeService {
  private baseUrl = '/api/redeem-codes';

  // Get all redeem codes with optional filtering
  async getRedeemCodes(filters?: RedeemCodeFilters): Promise<{ data: RedeemCode[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.cardId) params.append('cardId', filters.cardId);
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch redeem codes');
      }

      const result = await response.json();
      return {
        data: result.redeemCodes,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error fetching redeem codes:', error);
      throw error;
    }
  }

  // Get a specific redeem code
  async getRedeemCode(id: string): Promise<RedeemCode> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch redeem code');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching redeem code:', error);
      throw error;
    }
  }

  // Get redeem code by QR code
  async getRedeemCodeByQR(qrCode: string): Promise<RedeemCode> {
    try {
      const response = await fetch(`${this.baseUrl}/qr/${encodeURIComponent(qrCode)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch redeem code');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching redeem code by QR:', error);
      throw error;
    }
  }

  // Create a new redeem code
  async createRedeemCode(data: CreateRedeemCodeRequest): Promise<RedeemCode> {
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
        throw new Error(errorData.error || 'Failed to create redeem code');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating redeem code:', error);
      throw error;
    }
  }

  // Update a redeem code
  async updateRedeemCode(id: string, data: UpdateRedeemCodeRequest): Promise<RedeemCode> {
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
        throw new Error(errorData.error || 'Failed to update redeem code');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating redeem code:', error);
      throw error;
    }
  }

  // Delete a redeem code
  async deleteRedeemCode(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete redeem code');
      }
    } catch (error) {
      console.error('Error deleting redeem code:', error);
      throw error;
    }
  }

  // Redeem a code
  async redeemCode(data: RedeemRequest): Promise<RedeemResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to redeem code');
      }

      return await response.json();
    } catch (error) {
      console.error('Error redeeming code:', error);
      throw error;
    }
  }

  // Get redeem code statistics
  async getRedeemCodeStats(): Promise<RedeemCodeStats> {
    try {
      // Get all redeem codes to calculate stats
      const { data: codes } = await this.getRedeemCodes({ limit: 1000 });
      
      const totalCodes = codes.length;

      // Group by card
      const codesByCard = codes.reduce((acc, code) => {
        acc[code.cardId] = (acc[code.cardId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalCodes,
        codesByCard
      };
    } catch (error) {
      console.error('Error calculating redeem code stats:', error);
      throw error;
    }
  }

  // Search redeem codes
  async searchRedeemCodes(query: string, filters?: Omit<RedeemCodeFilters, 'search'>): Promise<{ data: RedeemCode[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.getRedeemCodes({ ...filters, search: query });
  }

  // Get redeem codes by card
  async getRedeemCodesByCard(cardId: string, filters?: Omit<RedeemCodeFilters, 'cardId'>): Promise<{ data: RedeemCode[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.getRedeemCodes({ ...filters, cardId });
  }

  // Bulk operations
  async bulkUpdateRedeemCodes(ids: string[], updates: UpdateRedeemCodeRequest): Promise<RedeemCode[]> {
    try {
      const promises = ids.map(id => this.updateRedeemCode(id, updates));
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  }

  async bulkDeleteRedeemCodes(ids: string[]): Promise<void> {
    try {
      const promises = ids.map(id => this.deleteRedeemCode(id));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      throw error;
    }
  }

  // Generate redeem codes for a card
  async generateCodesForCard(cardId: string, count: number): Promise<RedeemCode[]> {
    try {
      const promises = Array.from({ length: count }, (_, index) => {
        const qrCode = `QR_${cardId}_${Date.now()}_${index}`;
        return this.createRedeemCode({
          qrCode,
          cardId
        });
      });

      return await Promise.all(promises);
    } catch (error) {
      console.error('Error generating codes for card:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const redeemCodeService = new RedeemCodeService();
export default redeemCodeService;