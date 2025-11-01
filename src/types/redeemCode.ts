// Redeem Code Management System Types
// Based on reference schema structure

export interface RedeemCode {
  codeId: string; // Unique code identifier
  qrCode: string; // QR code data/URL
  cardId: string; // ID of the card this code redeems
}

// CRUD operation interfaces
export interface CreateRedeemCodeRequest {
  codeId?: string; // Optional - will be auto-generated if not provided
  qrCode: string;
  cardId: string;
}

export interface UpdateRedeemCodeRequest {
  codeId: string;
  qrCode?: string;
  cardId?: string;
}

// API Response interfaces
export interface RedeemCodeResponse {
  success: boolean;
  data: RedeemCode;
  message?: string;
}

export interface RedeemCodesResponse {
  success: boolean;
  data: RedeemCode[];
  message?: string;
}

// Redeem operation interface
export interface RedeemRequest {
  codeId: string;
  userId: string; // User attempting to redeem
}

export interface RedeemResponse {
  success: boolean;
  cardId?: string; // Card that was redeemed
  message: string;
}