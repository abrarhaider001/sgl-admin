# Firebase Implementation Guide

## Overview

This guide provides comprehensive instructions for implementing Firebase in your admin panel project. It includes practical examples, best practices, and step-by-step implementation details.

## Table of Contents

1. [Project Setup](#project-setup)
2. [Firebase Configuration](#firebase-configuration)
3. [Service Layer Implementation](#service-layer-implementation)
4. [Authentication Integration](#authentication-integration)
5. [Data Migration](#data-migration)
6. [Real-time Features](#real-time-features)
7. [Security Implementation](#security-implementation)
8. [Performance Optimization](#performance-optimization)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Guide](#deployment-guide)

## Project Setup

### 1. Install Firebase Dependencies

```bash
npm install firebase
npm install @firebase/app @firebase/firestore @firebase/auth @firebase/storage
npm install --save-dev @firebase/rules-unit-testing
```

### 2. Firebase Project Configuration

Create `src/lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (error) {
    console.log('Emulators already connected');
  }
}

export default app;
```

### 3. Environment Variables

Update `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Service Layer Implementation

### 1. Base Service Class

Create `src/services/baseService.ts`:

```typescript
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  DocumentSnapshot,
  QueryConstraint,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export abstract class BaseService<T> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected getCollection() {
    return collection(db, this.collectionName);
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Timestamp.now();
    const docData = {
      ...data,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(this.getCollection(), docData);
    return docRef.id;
  }

  async getById(id: string): Promise<T | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(this.getCollection(), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
  }

  async getPaginated(
    pageSize: number = 10,
    lastDoc?: DocumentSnapshot,
    constraints: QueryConstraint[] = []
  ): Promise<{ data: T[], lastDoc: DocumentSnapshot | null }> {
    const queryConstraints = [...constraints, limit(pageSize)];
    
    if (lastDoc) {
      queryConstraints.push(startAfter(lastDoc));
    }

    const q = query(this.getCollection(), ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];

    const lastDocument = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

    return { data, lastDoc: lastDocument };
  }
}
```

### 2. User Service Implementation

Update `src/services/userService.ts`:

```typescript
import { where, orderBy } from 'firebase/firestore';
import { BaseService } from './baseService';
import { User } from '@/types/user';

export class UserService extends BaseService<User> {
  constructor() {
    super('users');
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = await this.getAll([where('email', '==', email)]);
    return users[0] || null;
  }

  async getUsersByCountry(country: string): Promise<User[]> {
    return this.getAll([
      where('country', '==', country),
      orderBy('registrationDate', 'desc')
    ]);
  }

  async getActiveUsers(): Promise<User[]> {
    return this.getAll([
      where('status', '==', 'active'),
      orderBy('lastLogin', 'desc')
    ]);
  }

  async getUsersByPointsRange(minPoints: number, maxPoints: number): Promise<User[]> {
    return this.getAll([
      where('points', '>=', minPoints),
      where('points', '<=', maxPoints),
      orderBy('points', 'desc')
    ]);
  }

  async updateUserPoints(userId: string, points: number): Promise<void> {
    await this.update(userId, { points });
  }

  async addCardToUser(userId: string, cardId: string): Promise<void> {
    const user = await this.getById(userId);
    if (user) {
      const updatedCardsOwned = { ...user.cardsOwned, [cardId]: true };
      await this.update(userId, { cardsOwned: updatedCardsOwned });
    }
  }
}

export const userService = new UserService();
```

### 3. Album Service Implementation

Update `src/services/albumService.ts`:

```typescript
import { where, orderBy } from 'firebase/firestore';
import { BaseService } from './baseService';
import { Album } from '@/types/album';

export class AlbumService extends BaseService<Album> {
  constructor() {
    super('albums');
  }

  async getAlbumsByCategory(category: string): Promise<Album[]> {
    return this.getAll([
      where('category', '==', category),
      where('status', '==', 'active'),
      orderBy('name', 'asc')
    ]);
  }

  async getActiveAlbums(): Promise<Album[]> {
    return this.getAll([
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    ]);
  }

  async getAlbumsByCreator(creatorId: string): Promise<Album[]> {
    return this.getAll([
      where('createdBy', '==', creatorId),
      orderBy('createdAt', 'desc')
    ]);
  }

  async updateAlbumCardCount(albumId: string): Promise<void> {
    // This would typically involve counting cards in the album
    // Implementation depends on your card counting strategy
    const album = await this.getById(albumId);
    if (album) {
      // Count cards logic here
      // await this.update(albumId, { currentCount: newCount });
    }
  }
}

export const albumService = new AlbumService();
```

## Authentication Integration

### 1. Firebase Auth Service

Create `src/services/firebaseAuthService.ts`:

```typescript
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Admin } from '@/types/admin';

export class FirebaseAuthService {
  private currentAdmin: Admin | null = null;

  async login(email: string, password: string): Promise<{ admin: Admin; token: string }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get admin data from Firestore
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      
      if (!adminDoc.exists()) {
        throw new Error('Admin not found');
      }

      const adminData = { id: adminDoc.id, ...adminDoc.data() } as Admin;
      
      if (adminData.status !== 'active') {
        throw new Error('Admin account is not active');
      }

      // Get Firebase token
      const token = await user.getIdToken();
      
      this.currentAdmin = adminData;
      
      // Update last login
      await this.updateLastLogin(user.uid);
      
      return { admin: adminData, token };
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);
    this.currentAdmin = null;
  }

  getCurrentAdmin(): Admin | null {
    return this.currentAdmin;
  }

  onAuthStateChange(callback: (admin: Admin | null) => void): () => void {
    return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          if (adminDoc.exists()) {
            const adminData = { id: adminDoc.id, ...adminDoc.data() } as Admin;
            this.currentAdmin = adminData;
            callback(adminData);
          } else {
            this.currentAdmin = null;
            callback(null);
          }
        } catch (error) {
          this.currentAdmin = null;
          callback(null);
        }
      } else {
        this.currentAdmin = null;
        callback(null);
      }
    });
  }

  hasPermission(resource: string, action: string): boolean {
    if (!this.currentAdmin) return false;
    
    const permission = this.currentAdmin.permissions?.[resource];
    
    if (this.currentAdmin.role === 'super_admin') return true;
    
    switch (action) {
      case 'read':
        return ['read', 'write', 'delete'].includes(permission);
      case 'write':
        return ['write', 'delete'].includes(permission);
      case 'delete':
        return permission === 'delete';
      default:
        return false;
    }
  }

  private async updateLastLogin(adminId: string): Promise<void> {
    try {
      const adminRef = doc(db, 'admins', adminId);
      await updateDoc(adminRef, {
        lastLogin: Timestamp.now()
      });
    } catch (error) {
      console.error('Failed to update last login:', error);
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService();
```

### 2. Auth Context Update

Update `src/contexts/AuthContext.tsx`:

```typescript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { firebaseAuthService } from '@/services/firebaseAuthService';
import { Admin } from '@/types/admin';

interface AuthContextType {
  admin: Admin | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  hasPermission: (resource: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChange((admin) => {
      setAdmin(admin);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { admin } = await firebaseAuthService.login(email, password);
      setAdmin(admin);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await firebaseAuthService.logout();
    setAdmin(null);
  };

  const hasPermission = (resource: string, action: string): boolean => {
    return firebaseAuthService.hasPermission(resource, action);
  };

  return (
    <AuthContext.Provider value={{
      admin,
      login,
      logout,
      loading,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

## Real-time Features

### 1. Real-time Data Hook

Create `src/hooks/useRealtimeData.ts`:

```typescript
import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  QueryConstraint,
  DocumentData 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useRealtimeData<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, collectionName), ...constraints);
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [collectionName, constraints]);

  return { data, loading, error };
}
```

### 2. Real-time Stats Component

Create `src/components/RealtimeStats.tsx`:

```typescript
'use client';

import { useRealtimeData } from '@/hooks/useRealtimeData';
import { where } from 'firebase/firestore';
import { User } from '@/types/user';
import { Sale } from '@/types/sale';

export function RealtimeStats() {
  const { data: activeUsers } = useRealtimeData<User>('users', [
    where('status', '==', 'active')
  ]);

  const { data: todaySales } = useRealtimeData<Sale>('sales', [
    where('createdAt', '>=', new Date().setHours(0, 0, 0, 0))
  ]);

  const totalRevenue = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900">Active Users</h3>
        <p className="text-3xl font-bold text-blue-600">{activeUsers.length}</p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900">Today's Sales</h3>
        <p className="text-3xl font-bold text-green-600">{todaySales.length}</p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900">Today's Revenue</h3>
        <p className="text-3xl font-bold text-purple-600">${totalRevenue.toFixed(2)}</p>
      </div>
    </div>
  );
}
```

## Data Migration

### 1. Migration Script

Create `scripts/migrate-to-firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { users as mockUsers } from '../src/data/users';
import { albums as mockAlbums } from '../src/data/albums';
import { cards as mockCards } from '../src/data/cards';

// Initialize Firebase (use your config)
const app = initializeApp({
  // Your Firebase config
});

const db = getFirestore(app);

async function migrateUsers() {
  console.log('Migrating users...');
  
  for (const user of mockUsers) {
    try {
      const userData = {
        ...user,
        createdAt: Timestamp.fromDate(new Date(user.registrationDate)),
        updatedAt: Timestamp.now(),
        lastLogin: user.lastLogin ? Timestamp.fromDate(new Date(user.lastLogin)) : null
      };
      
      await addDoc(collection(db, 'users'), userData);
      console.log(`Migrated user: ${user.email}`);
    } catch (error) {
      console.error(`Failed to migrate user ${user.email}:`, error);
    }
  }
}

async function migrateAlbums() {
  console.log('Migrating albums...');
  
  for (const album of mockAlbums) {
    try {
      const albumData = {
        ...album,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      await addDoc(collection(db, 'albums'), albumData);
      console.log(`Migrated album: ${album.name}`);
    } catch (error) {
      console.error(`Failed to migrate album ${album.name}:`, error);
    }
  }
}

async function migrateCards() {
  console.log('Migrating cards...');
  
  for (const card of mockCards) {
    try {
      const cardData = {
        ...card,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      await addDoc(collection(db, 'cards'), cardData);
      console.log(`Migrated card: ${card.name}`);
    } catch (error) {
      console.error(`Failed to migrate card ${card.name}:`, error);
    }
  }
}

async function runMigration() {
  try {
    await migrateUsers();
    await migrateAlbums();
    await migrateCards();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
```

## Performance Optimization

### 1. Pagination Hook

Create `src/hooks/usePagination.ts`:

```typescript
import { useState, useCallback } from 'react';
import { DocumentSnapshot, QueryConstraint } from 'firebase/firestore';
import { BaseService } from '@/services/baseService';

export function usePagination<T>(
  service: BaseService<T>,
  pageSize: number = 10,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const result = await service.getPaginated(pageSize, lastDoc || undefined, constraints);
      
      if (result.data.length < pageSize) {
        setHasMore(false);
      }
      
      setData(prev => [...prev, ...result.data]);
      setLastDoc(result.lastDoc);
    } catch (error) {
      console.error('Failed to load more data:', error);
    } finally {
      setLoading(false);
    }
  }, [service, pageSize, lastDoc, constraints, loading, hasMore]);

  const reset = useCallback(() => {
    setData([]);
    setLastDoc(null);
    setHasMore(true);
  }, []);

  return {
    data,
    loading,
    hasMore,
    loadMore,
    reset
  };
}
```

### 2. Optimized List Component

Create `src/components/OptimizedUserList.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { userService } from '@/services/userService';
import { User } from '@/types/user';
import { orderBy } from 'firebase/firestore';

export function OptimizedUserList() {
  const { data: users, loading, hasMore, loadMore, reset } = usePagination(
    userService,
    20,
    [orderBy('registrationDate', 'desc')]
  );

  useEffect(() => {
    loadMore();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {users.map((user) => (
          <div key={user.id} className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold">{user.firstName} {user.lastName}</h3>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-500">Points: {user.points}</p>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## Testing Strategy

### 1. Firebase Emulator Setup

Create `firebase.json`:

```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### 2. Test Utilities

Create `src/utils/testUtils.ts`:

```typescript
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';

let testEnv: RulesTestEnvironment;

export async function setupTestEnvironment() {
  testEnv = await initializeTestEnvironment({
    projectId: 'test-project',
    firestore: {
      rules: `
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read, write: if true;
            }
          }
        }
      `
    }
  });

  return testEnv;
}

export function getTestFirestore(auth?: { uid: string; [key: string]: any }) {
  return testEnv.authenticatedContext(auth?.uid || 'test-user', auth).firestore();
}

export async function cleanupTestEnvironment() {
  await testEnv.cleanup();
}
```

## Deployment Guide

### 1. Production Configuration

Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  },
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
}

module.exports = nextConfig
```

### 2. Deployment Script

Create `scripts/deploy.sh`:

```bash
#!/bin/bash

# Build the application
npm run build

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy to your hosting platform
# Example for Vercel:
# vercel --prod

echo "Deployment completed!"
```

## Best Practices Summary

### 1. Data Structure
- Use flat, denormalized structures when possible
- Implement proper indexing for all query patterns
- Use subcollections for one-to-many relationships
- Keep document sizes under 1MB

### 2. Security
- Implement granular security rules
- Validate all data on the client and server
- Use Firebase Auth for authentication
- Implement role-based access control

### 3. Performance
- Use pagination for large datasets
- Implement proper caching strategies
- Optimize queries with composite indexes
- Use real-time listeners judiciously

### 4. Error Handling
- Implement comprehensive error handling
- Use try-catch blocks for all Firebase operations
- Provide meaningful error messages to users
- Log errors for debugging

### 5. Testing
- Use Firebase emulators for development
- Write unit tests for all services
- Test security rules thoroughly
- Implement integration tests

This implementation guide provides a solid foundation for integrating Firebase into your admin panel project while following best practices for scalability, security, and performance.