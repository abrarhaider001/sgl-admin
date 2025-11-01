/**
 * Types for FCM notifications API.
 */

export interface NotificationUserFilters {
  countries?: string[];
  states?: string[];
  cities?: string[];
  gender?: string;
  minPoints?: number;
  maxPoints?: number;
}

export interface SendNotificationRequest {
  // Delivery mode: 'specific' uses userIds; 'global' sends to all tokens
  mode: 'global' | 'specific';
  // Optional list of user document IDs to resolve FCM tokens server-side
  userIds?: string[];
  title: string;
  body: string;
  // Optional user filters for global mode (location, demographics)
  filters?: NotificationUserFilters;
}

export interface SendNotificationResponse {
  ok: boolean;
  // For multicast sends, provide batch statistics
  successCount?: number;
  failureCount?: number;
  error?: string;
}