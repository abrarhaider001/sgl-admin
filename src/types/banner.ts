// Banner Management System Types
// Based on reference schema structure

export interface Banner {
  bannerId: string; // Unique banner identifier
  image: string; // Banner image URL
  url: string; // URL that banner links to
}

// CRUD operation interfaces
export interface CreateBannerRequest {
  bannerId?: string; // Optional - will be auto-generated if not provided
  image: string;
  url: string;
}

export interface UpdateBannerRequest {
  bannerId: string;
  image?: string;
  url?: string;
}

// API Response interfaces
export interface BannerResponse {
  success: boolean;
  data: Banner;
  message?: string;
}

export interface BannersResponse {
  success: boolean;
  data: Banner[];
  message?: string;
}