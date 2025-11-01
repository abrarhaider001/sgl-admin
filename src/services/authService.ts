// Authentication Service
// Handles secure role-based access and session management

import { adminService } from './adminService';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'super_admin';
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  message?: string;
}

// Role-based permissions
export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  ALBUMS_READ: 'albums:read',
  ALBUMS_WRITE: 'albums:write',
  ALBUMS_DELETE: 'albums:delete',
  CARDS_READ: 'cards:read',
  CARDS_WRITE: 'cards:write',
  CARDS_DELETE: 'cards:delete',
  BANNERS_READ: 'banners:read',
  BANNERS_WRITE: 'banners:write',
  BANNERS_DELETE: 'banners:delete',
  REPORTS_READ: 'reports:read',
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_WRITE: 'notifications:write',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  ADMIN_MANAGEMENT: 'admin:management'
} as const;

// Default permissions by role
export const ROLE_PERMISSIONS = {
  admin: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
    PERMISSIONS.ALBUMS_READ,
    PERMISSIONS.ALBUMS_WRITE,
    PERMISSIONS.CARDS_READ,
    PERMISSIONS.CARDS_WRITE,
    PERMISSIONS.BANNERS_READ,
    PERMISSIONS.BANNERS_WRITE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_WRITE,
    PERMISSIONS.SETTINGS_READ
  ],
  super_admin: [
    ...Object.values(PERMISSIONS)
  ]
};

class AuthService {
  private readonly TOKEN_KEY = 'authToken';
  private readonly USER_KEY = 'authUser';
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Mock users for demo (in production, this would be handled by backend)
  private mockUsers: AuthUser[] = [
    {
      id: '1',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@example.com',
      role: 'super_admin',
      permissions: ROLE_PERMISSIONS.super_admin,
      createdAt: '2023-01-01T00:00:00Z'
    },
    {
      id: '2',
      firstName: 'John',
      lastName: 'Admin',
      email: 'john.admin@example.com',
      role: 'admin',
      permissions: ROLE_PERMISSIONS.admin,
      createdAt: '2023-06-15T00:00:00Z'
    }
  ];

  // Validate user credentials using Firebase Authentication
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Use Firebase Authentication through adminService
      const response = await adminService.loginAdmin(credentials.email, credentials.password);
      
      if (response.success && response.admin) {
        // Convert admin data to AuthUser format
        const authUser: AuthUser = {
          id: response.admin.id,
          firstName: response.admin.username, // Using username as firstName for now
          lastName: '', // Empty for now, can be extended later
          email: response.admin.email,
          role: 'admin', // Default role, can be extended based on admin data
          permissions: ROLE_PERMISSIONS.admin, // Default admin permissions
          createdAt: response.admin.createdAt,
          lastLogin: new Date().toISOString()
        };
        
        // Store session consistently using service helpers
        const token = this.generateSessionToken(authUser.id);
        this.storeSession(authUser, token);

        return {
          success: true,
          user: authUser,
          token
        };
      }
      
      return {
        success: false,
        message: response.error || 'Invalid credentials'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getCurrentUser(): AuthUser | null {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      const token = localStorage.getItem(this.TOKEN_KEY);

      if (!userStr || !token) {
        return null;
      }

      const user = JSON.parse(userStr);
      
      // Check if session is still valid
      if (!this.isSessionValid(token)) {
        this.logout();
        return null;
      }

      return user;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions.includes(permission) || false;
  }

  hasRole(role: 'admin' | 'super_admin'): boolean {
    const user = this.getCurrentUser();
    return user?.role === role || false;
  }

  canAccess(requiredPermissions: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    return requiredPermissions.every(permission => 
      user.permissions.includes(permission)
    );
  }

  private generateSessionToken(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return btoa(`${userId}:${timestamp}:${random}`);
  }

  private storeSession(user: AuthUser, token: string): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private isSessionValid(token: string): boolean {
    try {
      const decoded = atob(token);
      const [, timestamp] = decoded.split(':');
      const sessionTime = parseInt(timestamp);
      const now = Date.now();

      return (now - sessionTime) < this.SESSION_DURATION;
    } catch {
      return false;
    }
  }

  // Get all users (for admin management)
  getAllUsers(): AuthUser[] {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !this.hasPermission(PERMISSIONS.ADMIN_MANAGEMENT)) {
      return [];
    }
    return this.mockUsers;
  }

  // Update user permissions (super admin only)
  async updateUserPermissions(userId: string, permissions: string[]): Promise<AuthResponse> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !this.hasRole('super_admin')) {
      return {
        success: false,
        message: 'Insufficient permissions'
      };
    }

    const userIndex = this.mockUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    this.mockUsers[userIndex].permissions = permissions;

    return {
      success: true,
      user: this.mockUsers[userIndex],
      message: 'Permissions updated successfully'
    };
  }
}

export const authService = new AuthService();
export default authService;