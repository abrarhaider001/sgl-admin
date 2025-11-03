// Album and Card Management System Types
// Updated to match reference schema structure

export interface Album {
  albumId: string; // Changed from id to albumId to match reference schema
  cardIds: string[]; // Array of card IDs in this album
  image: string; // Required image field
  name: string;
}

export interface CardImages {
  bronze: string;
  silver: string;
  gold: string;
  titanium: string;
  diamond: string;
}

export interface Card {
  cardId: string; // Unique card identifier
  description: string;
  image?: string; // Legacy single image URL (for backward compatibility)
  images: CardImages; // New 5-image variants
  name: string;
  points: number; // Card point value
}




export interface AlbumWithCards extends Album {
  cards: Card[];
}

// CRUD operation interfaces
export interface CreateAlbumRequest {
  albumId?: string;
  name: string;
  image?: string;
  cardIds?: string[];
}

export interface UpdateAlbumRequest {
  albumId?: string;
  name?: string;
  image?: string;
  cardIds?: string[];
}

export interface CreateCardRequest {
  cardId?: string;
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

// Filter and search interfaces
export interface AlbumFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
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

// Pagination interface
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Statistics interfaces
export interface AlbumStats {
  totalAlbums: number;
  totalCards: number;
}

export interface CardStats {
  totalCards: number;
  averagePoints: number;
}

// Error handling
export interface AlbumError {
  code: string;
  message: string;
  field?: string;
}

export class AlbumValidationError extends Error {
  constructor(public errors: AlbumError[]) {
    super('Album validation failed');
    this.name = 'AlbumValidationError';
  }
}

export class CardValidationError extends Error {
  constructor(public errors: AlbumError[]) {
    super('Card validation failed');
    this.name = 'CardValidationError';
  }
}

// Constants
export const ALBUM_CONSTANTS = {
  MAX_NAME_LENGTH: 100,
} as const;

export const CARD_CONSTANTS = {
  MIN_POINTS: 0,
  MAX_POINTS: 1000,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
} as const;

// Example albums for the new schema
export const EXAMPLE_ALBUMS: Omit<Album, 'albumId'>[] = [
  {
    name: 'Monster Collection',
    cardIds: [],
    image: '/images/simple/IMG-20250904-WA0018.jpg',
  },
  {
    name: 'Dragon Collection',
    cardIds: [],
    image: '/images/gold/IMG-20250904-WA0038.jpg',
  },
  {
    name: 'Treasure Collection',
    cardIds: [],
    image: '/images/gold/IMG-20250904-WA0039.jpg',
  },
];