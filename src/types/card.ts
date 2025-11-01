export interface Card {
  id?: string; // Firebase document ID
  cardID: string;
  description: string;
  imageUrl: string;
  name: string;
  points: number;
}

export interface CreateCardRequest {
  cardID: string;
  description: string;
  imageUrl?: string;
  name: string;
  points: number;
}

export interface UpdateCardRequest {
  cardID?: string;
  description?: string;
  imageUrl?: string;
  name?: string;
  points?: number;
}