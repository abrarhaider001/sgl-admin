export interface CardImages {
  bronze: string;
  silver: string;
  gold: string;
  titanium: string;
  diamond: string;
}

export interface Card {
  id?: string; // Firebase document ID
  cardID: string;
  description: string;
  imageUrl?: string; // Legacy single image (for backward compatibility)
  images?: CardImages; // New 5-image variants
  name: string;
  points: number;
  isLocked?: boolean;
}

export interface CreateCardRequest {
  cardID: string;
  description: string;
  imageUrl?: string; // Legacy support
  images?: Partial<CardImages>; // New 5-image variants (partial for flexibility during creation)
  name: string;
  points: number;
  isLocked?: boolean;
}

export interface UpdateCardRequest {
  cardID?: string;
  description?: string;
  imageUrl?: string; // Legacy support
  images?: Partial<CardImages>; // Allow updating individual image variants
  name?: string;
  points?: number;
  isLocked?: boolean;
}