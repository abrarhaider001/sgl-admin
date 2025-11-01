// User Management System Types
// Updated to match reference schema structure

export interface User {
  city: string;
  country: string;
  dateOfBirth: string; // ISO date string or timestamp
  email: string;
  firstName: string;
  gender: string;
  id: string; // Changed from number to string to match reference schema
  lastName: string;
  name: string; // Full name field
  profileImagePath: string; // Path to profile image
  points: number;
  state: string;
}

// Subcollection for cards owned by user
export interface UserCardOwned {
  cardId: string; // ID of the owned card
  quantity: number; // Number of this card owned
  timestamp: string; // When the card was acquired (ISO date string or timestamp)
}

// CRUD operation interfaces
export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  dateOfBirth: string;
  country: string;
  state: string;
  city: string;
  gender: string;
  points?: number; // Optional - defaults to 0
  cardsOwned?: string[]; // Optional - defaults to empty array
}

export interface UpdateUserRequest {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  dateOfBirth?: string;
  country?: string;
  state?: string;
  city?: string;
  gender?: string;
  points?: number;
  cardsOwned?: string[];
}

// Filter and search interfaces
export interface UserFilters {
  search?: string;
  country?: string;
  state?: string;
  city?: string;
  gender?: string;
  minCardsOwned?: number;
  maxCardsOwned?: number;
  minPoints?: number;
  maxPoints?: number;
}

// Pagination interfaces
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
export interface UserStats {
  totalUsers: number;
  usersByCountry: Record<string, number>;
  averageCardsOwned: number;
  totalCardsOwned: number;
}

// Error handling
export interface UserError {
  code: string;
  message: string;
  field?: string;
}

export class UserValidationError extends Error {
  constructor(public errors: UserError[]) {
    super('User validation failed');
    this.name = 'UserValidationError';
  }
}

// Constants
export const USER_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 50,
  MAX_EMAIL_LENGTH: 100,
  SUPPORTED_GENDERS: ['Male', 'Female', 'Other'] as const,
} as const;

// Data integrity validation
export interface CardOwnershipValidation {
  userId: number;
  cardId: string;
  isValid: boolean;
  error?: string;
}

export interface DataIntegrityReport {
  totalUsers: number;
  totalValidations: number;
  validCards: number;
  invalidCards: number;
  invalidReferences: CardOwnershipValidation[];
}