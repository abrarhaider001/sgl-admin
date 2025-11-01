// Stock Management System Types
// Note: Stock collection not present in reference schema
// This file is kept for backward compatibility but may need review

export interface Stock {
  id: string;
  stockNumber: string; // Unique identifier for the stock (UUID)
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: number;
  currency: 'USD' | 'EUR' | 'GBP'; // Currency selection
  image?: string;
  
  createdAt: Date;
  updatedAt: Date;

  // Firebase compatibility
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

// CRUD operation interfaces
export interface CreateStockRequest {
  stockNumber?: string; // Optional - will auto-generate UUID if not provided
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: number;
  currency: 'USD' | 'EUR' | 'GBP';
  image?: string;
}

export interface UpdateStockRequest {
  stockNumber?: string;
  name?: string;
  description?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  price?: number;
  currency?: 'USD' | 'EUR' | 'GBP';
  image?: string;
  isActive?: boolean; // Add isActive property
}

// API Response interfaces
export interface StockResponse {
  success: boolean;
  data: Stock;
  message?: string;
}

export interface StocksResponse {
  success: boolean;
  data: Stock[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

export interface StockStats {
  totalStocks: number;
  totalValue: number;
  averagePrice: number;
  stocksByRarity: {
    common: number;
    rare: number;
    epic: number;
    legendary: number;
  };
  recentlyAdded: Stock[];
}

// Filter and search interfaces
export interface StockFilters {
  search?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  minPrice?: number;
  maxPrice?: number;
  currency?: 'USD' | 'EUR' | 'GBP';
  sortBy?: 'name' | 'price' | 'createdAt' | 'stockNumber';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Form validation interfaces
export interface StockFormErrors {
  stockNumber?: string;
  name?: string;
  description?: string;
  rarity?: string;
  price?: string;
  currency?: string;
  image?: string;
}

export interface StockFormData {
  stockNumber: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: string;
  currency: string;
  image?: File;
  quantity?: number;
  lowStockThreshold?: number;
  maxStock?: number;
  reservedQuantity?: number;
}

// Card selection interface for stock management
export interface CardSelectionItem {
  cardId: string;
  name: string;
  image?: string;
  rarity?: string;
  type?: string;
  points?: number;
  albumId?: string;
  albumName?: string;
  selected: boolean;
  quantity: number;
}