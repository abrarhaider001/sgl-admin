// Simple in-memory database layer
// Updated to match reference schema structure
// This can be easily replaced with a real database (SQLite, PostgreSQL, etc.) later

import { Album, Card, Banner, User, Pack, RedeemCode } from '@/types';

export interface DatabaseSchema {
  albums: Album[];
  cards: Card[];
  banners: Banner[];
  users: User[];
  packs: Pack[];
  redeemCodes: RedeemCode[];
  images: ImageRecord[];
}

export interface ImageRecord {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  url: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  uploadedAt: Date;
  entityType: 'album' | 'card' | 'banner' | 'user' | 'pack';
  entityId?: string;
}

class InMemoryDatabase {
  private data: DatabaseSchema = {
    albums: [],
    cards: [],
    banners: [],
    users: [],
    packs: [],
    redeemCodes: [],
    images: []
  };

  private initialized = false;

  // Initialize with default data
  init() {
    if (this.initialized) return;
    
    this.data = {
      albums: this.getDefaultAlbums(),
      cards: this.getDefaultCards(),
      banners: this.getDefaultBanners(),
      users: this.getDefaultUsers(),
      packs: this.getDefaultPacks(),
      redeemCodes: this.getDefaultRedeemCodes(),
      images: []
    };
    
    this.initialized = true;
  }

  // Generic CRUD operations
  create<T extends keyof DatabaseSchema>(table: T, item: DatabaseSchema[T][0]): DatabaseSchema[T][0] {
    this.init();
(this.data[table] as any[]).push(item);
    return item;
  }

  findById<T extends keyof DatabaseSchema>(table: T, id: string): DatabaseSchema[T][0] | null {
    this.init();
    return (this.data[table] as DatabaseSchema[T]).find((item: DatabaseSchema[T][0]) => (item as { id: string }).id === id) || null;
  }

  findAll<T extends keyof DatabaseSchema>(table: T): DatabaseSchema[T] {
    this.init();
    return [...this.data[table]] as DatabaseSchema[T];
  }

  update<T extends keyof DatabaseSchema>(table: T, id: string, updates: Partial<DatabaseSchema[T][0]>): DatabaseSchema[T][0] | null {
    this.init();
    const index = (this.data[table] as DatabaseSchema[T]).findIndex((item: DatabaseSchema[T][0]) => (item as { id: string }).id === id);
    if (index === -1) return null;
    
    this.data[table][index] = { ...this.data[table][index], ...updates } as DatabaseSchema[T][0];
    return this.data[table][index];
  }

  delete<T extends keyof DatabaseSchema>(table: T, id: string): boolean {
    this.init();
    const index = (this.data[table] as DatabaseSchema[T]).findIndex((item: DatabaseSchema[T][0]) => (item as { id: string }).id === id);
    if (index === -1) return false;
    
    this.data[table].splice(index, 1);
    return true;
  }

  // Specialized queries
  findWhere<T extends keyof DatabaseSchema>(
    table: T, 
    predicate: (item: DatabaseSchema[T][0]) => boolean
  ): DatabaseSchema[T] {
    this.init();
    return this.data[table].filter(predicate) as DatabaseSchema[T];
  }

  // Image-specific operations
  saveImage(imageData: Omit<ImageRecord, 'id' | 'uploadedAt'>): ImageRecord {
    const image: ImageRecord = {
      ...imageData,
      id: this.generateId(),
      uploadedAt: new Date()
    };
    return this.create('images', image);
  }

  findImagesByEntity(entityType: string, entityId: string): ImageRecord[] {
    return this.findWhere('images', (img) => 
      img.entityType === entityType && img.entityId === entityId
    );
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // Default data methods
  private getDefaultAlbums(): Album[] {
    return [
      {
        albumId: '1',
        cardIds: ['CARD001', 'CARD002'],
        image: '/images/placeholder-album.svg',
        name: 'Legendary Collection'
      },
      {
        albumId: '2',
        cardIds: ['CARD003'],
        image: '/images/placeholder-album.svg',
        name: 'Rare Finds'
      }
    ];
  }

  private getDefaultCards(): Card[] {
    return [
      {
        cardId: 'CARD001',
        description: 'A powerful dragon card with fire abilities',
        image: '/images/placeholder-card.svg',
        name: 'Dragon Master',
        points: 150
      },
      {
        cardId: 'CARD002',
        description: 'Fast attack card with electric powers',
        image: '/images/placeholder-card.svg',
        name: 'Lightning Bolt',
        points: 100
      },
      {
        cardId: 'CARD003',
        description: 'Mystical card with healing powers',
        image: '/images/placeholder-card.svg',
        name: 'Healing Potion',
        points: 75
      }
    ];
  }

  private getDefaultBanners(): Banner[] {
    return [
      {
        bannerId: '1',
        image: '/images/placeholder-banner.svg',
        url: '/albums'
      }
    ];
  }

  private getDefaultUsers(): User[] {
    return [
      {
        id: '1',
        city: 'New York',
        country: 'USA',
        dateOfBirth: '1990-01-15',
        email: 'john@example.com',
        firstName: 'John',
        gender: 'male',
        lastName: 'Doe',
        name: 'John Doe',
        points: 1250,
        profileImagePath: '/images/default-avatar.svg',
        state: 'NY'
      }
    ];
  }

  private getDefaultPacks(): Pack[] {
    return [
      {
        packId: '1',
        description: 'A starter pack with basic cards',
        image: '/images/placeholder-pack.svg',
        isFeatured: true,
        name: 'Starter Pack',
        price: 9.99,
        rarity: 'common',
        stockNo: 'PACK001'
      },
      {
        packId: '2',
        description: 'Premium pack with rare cards',
        image: '/images/placeholder-pack.svg',
        isFeatured: false,
        name: 'Premium Pack',
        price: 24.99,
        rarity: 'rare',
        stockNo: 'PACK002'
      }
    ];
  }

  private getDefaultRedeemCodes(): RedeemCode[] {
    return [
      {
        codeId: '1',
        qrCode: 'QR123456',
        cardId: 'CARD001'
      }
    ];
  }
}

// Export singleton instance
export const database = new InMemoryDatabase();
export default database;