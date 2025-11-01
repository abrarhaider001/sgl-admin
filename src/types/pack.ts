// Pack Management System Types
// Based on reference schema structure

export interface Pack {
  description: string; // Pack description
  image: string; // Pack image URL
  isFeatured: boolean; // Whether pack is featured
  name: string; // Pack name
  packId: string; // Unique pack identifier
  price: number; // Pack price
  rarity: string; // Pack rarity level
  stockNo: string; // Stock number reference
  linkedAlbum?: string; // Album ID linked to this pack
}

// CRUD operation interfaces
export interface CreatePackRequest {
  packId?: string; // Optional - will be auto-generated if not provided
  description: string;
  image: string;
  isFeatured?: boolean; // Optional - defaults to false
  name: string;
  price: number;
  rarity: string;
  stockNo: string;
  linkedAlbum?: string; // Album ID to link at creation
}

export interface UpdatePackRequest {
  packId: string;
  description?: string;
  image?: string;
  isFeatured?: boolean;
  name?: string;
  price?: number;
  rarity?: string;
  stockNo?: string;
  linkedAlbum?: string; // Allow updating linked album if needed
}

// API Response interfaces
export interface PackResponse {
  success: boolean;
  data: Pack;
  message?: string;
}

export interface PacksResponse {
  success: boolean;
  data: Pack[];
  message?: string;
}

// Filter and search interfaces
export interface PackFilters {
  search?: string;
  isFeatured?: boolean;
  rarity?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'price' | 'rarity';
  sortOrder?: 'asc' | 'desc';
}