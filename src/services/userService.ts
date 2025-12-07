import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  DocumentSnapshot,
  QueryConstraint,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Enhanced User interface with cardsOwned subcollection
export interface UserCard {
  cardId: string;
  quantity: number;
  timestamp: string; // Changed from acquiredAt to match Firebase structure
}

export interface UserWithCards {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  dateOfBirth: string;
  country: string;
  state: string;
  city: string;
  points: number;
  gender: string;
  profileImagePath: string;
  isInfluencer?: boolean;
  commissionPercent?: number;
  cardsOwned: UserCard[];
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  country: string;
  state: string;
  city: string;
  gender: string;
  points?: number;
  profileImagePath?: string;
  isInfluencer?: boolean;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string;
  country?: string;
  state?: string;
  city?: string;
  gender?: string;
  points?: number;
  profileImagePath?: string;
  isInfluencer?: boolean;
  commissionPercent?: number;
}

export interface UserFilters {
  country?: string;
  state?: string;
  city?: string;
  gender?: string;
  minPoints?: number;
  maxPoints?: number;
}

export interface PaginationOptions {
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
}

class UserService {
  private readonly COLLECTION_NAME = 'users';
  private readonly CARDS_SUBCOLLECTION = 'cardsOwned';

  private isNonEmptyString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isValidEmail(email: any): boolean {
    if (typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  private validateCreate(input: CreateUserRequest): string[] {
    const errors: string[] = [];
    if (!this.isNonEmptyString(input.firstName)) errors.push('firstName is required');
    if (!this.isNonEmptyString(input.lastName)) errors.push('lastName is required');
    if (!this.isValidEmail(input.email)) errors.push('email is invalid');
    if (!this.isNonEmptyString(input.dateOfBirth)) errors.push('dateOfBirth is required');
    if (!this.isNonEmptyString(input.country)) errors.push('country is required');
    if (!this.isNonEmptyString(input.state)) errors.push('state is required');
    if (!this.isNonEmptyString(input.city)) errors.push('city is required');
    if (!this.isNonEmptyString(input.gender)) errors.push('gender is required');
    if (input.points !== undefined && (typeof input.points !== 'number' || input.points < 0)) errors.push('points must be a non-negative number');
    if (input.isInfluencer !== undefined && typeof input.isInfluencer !== 'boolean') errors.push('isInfluencer must be boolean');
    return errors;
  }

  private validateUpdate(input: UpdateUserRequest): string[] {
    const errors: string[] = [];
    if (input.email !== undefined && !this.isValidEmail(input.email)) errors.push('email is invalid');
    if (input.points !== undefined && (typeof input.points !== 'number' || input.points < 0)) errors.push('points must be a non-negative number');
    if (input.isInfluencer !== undefined && typeof input.isInfluencer !== 'boolean') errors.push('isInfluencer must be boolean');
    if (input.commissionPercent !== undefined && (typeof input.commissionPercent !== 'number' || input.commissionPercent < 0)) errors.push('commissionPercent must be a non-negative number');
    return errors;
  }

  /**
   * Fetch all users with their cardsOwned subcollection
   */
  async getUsers(filters?: UserFilters, pagination?: PaginationOptions): Promise<UserWithCards[]> {
    try {
      console.log('Fetching users from Firebase...');
      
      // Build constraints without server-side ordering to avoid composite index requirements
      const constraints: QueryConstraint[] = [];
      
      // Add filters
      if (filters?.country) {
        constraints.push(where('country', '==', filters.country));
      }
      if (filters?.state) {
        constraints.push(where('state', '==', filters.state));
      }
      if (filters?.city) {
        constraints.push(where('city', '==', filters.city));
      }
      if (filters?.gender) {
        constraints.push(where('gender', '==', filters.gender));
      }
      if (filters?.minPoints !== undefined) {
        constraints.push(where('points', '>=', filters.minPoints));
      }
      if (filters?.maxPoints !== undefined) {
        constraints.push(where('points', '<=', filters.maxPoints));
      }

      // Add pagination
      if (pagination?.pageSize) {
        constraints.push(limit(pagination.pageSize));
      }
      if (pagination?.lastDoc) {
        constraints.push(startAfter(pagination.lastDoc));
      }

      const usersQuery = query(collection(db, this.COLLECTION_NAME), ...constraints);
      const usersSnapshot = await getDocs(usersQuery);
      
      console.log(`Found ${usersSnapshot.docs.length} users`);

      const usersWithCards: UserWithCards[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        console.log(`Processing user: ${userData.firstName} ${userData.lastName}`);
        
        // Fetch cardsOwned subcollection
        const cardsQuery = collection(db, this.COLLECTION_NAME, userDoc.id, this.CARDS_SUBCOLLECTION);
        const cardsSnapshot = await getDocs(cardsQuery);
        
        const cardsOwned: UserCard[] = cardsSnapshot.docs.map(cardDoc => {
          const cardData = cardDoc.data();
          return {
            cardId: cardData.cardId || cardDoc.id,
            quantity: cardData.quantity || 1,
            timestamp: cardData.timestamp || new Date().toISOString()
          };
        });

        console.log(`User ${userData.firstName} has ${cardsOwned.length} cards`);

        // Convert Firebase timestamp to ISO string if it's a timestamp object
        const dateOfBirth = userData.dateOfBirth 
          ? (userData.dateOfBirth.seconds 
              ? new Date(userData.dateOfBirth.seconds * 1000).toISOString().split('T')[0]
              : userData.dateOfBirth)
          : '';

        usersWithCards.push({
          id: userDoc.id,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          email: userData.email || '',
          dateOfBirth,
          country: userData.country || '',
          state: userData.state || '',
          city: userData.city || '',
          points: userData.points || 0,
          gender: userData.gender || '',
          profileImagePath: userData.profileImagePath || null,
          isInfluencer: !!userData.isInfluencer,
          commissionPercent: Number(userData.commissionPercent ?? 0),
          cardsOwned
        });
      }

      // Sort client-side by firstName for consistent UX
      usersWithCards.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
      console.log(`Returning ${usersWithCards.length} users with cards data`);
      return usersWithCards;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  /**
   * Get a single user by ID with their cardsOwned
   */
  async getUserById(userId: string): Promise<UserWithCards | null> {
    try {
      const userDoc = await getDoc(doc(db, this.COLLECTION_NAME, userId));
      
      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();
      
      // Fetch cardsOwned subcollection
      const cardsQuery = collection(db, this.COLLECTION_NAME, userId, this.CARDS_SUBCOLLECTION);
      const cardsSnapshot = await getDocs(cardsQuery);
      
      const cardsOwned: UserCard[] = cardsSnapshot.docs.map(cardDoc => {
        const cardData = cardDoc.data();
        return {
          cardId: cardData.cardId || cardDoc.id,
          quantity: cardData.quantity || 1,
          timestamp: cardData.timestamp || new Date().toISOString()
        };
      });

      // Convert Firebase timestamp to ISO string if it's a timestamp object
      const dateOfBirth = userData.dateOfBirth 
        ? (userData.dateOfBirth.seconds 
            ? new Date(userData.dateOfBirth.seconds * 1000).toISOString().split('T')[0]
            : userData.dateOfBirth)
        : '';

      return {
        id: userDoc.id,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        email: userData.email || '',
        dateOfBirth,
        country: userData.country || '',
        state: userData.state || '',
        city: userData.city || '',
        points: userData.points || 0,
        gender: userData.gender || '',
        profileImagePath: userData.profileImagePath || null,
        isInfluencer: !!userData.isInfluencer,
        commissionPercent: Number(userData.commissionPercent ?? 0),
        cardsOwned
      };
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  /**
   * Create a new user with cardsOwned subcollection
   */
  async createUser(userData: CreateUserRequest): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      console.log('Creating new user in Firebase...');
      const errors = this.validateCreate(userData);
      if (errors.length > 0) {
        return { success: false, error: errors.join('; ') };
      }
      
      // Prepare user data for Firebase
      const userDoc = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        name: `${userData.firstName} ${userData.lastName}`.trim(),
        email: userData.email,
        dateOfBirth: userData.dateOfBirth,
        country: userData.country,
        state: userData.state,
        city: userData.city,
        gender: userData.gender,
        points: userData.points || 0,
        profileImagePath: userData.profileImagePath || '',
        isInfluencer: userData.isInfluencer === true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create user document
      const userRef = await addDoc(collection(db, this.COLLECTION_NAME), userDoc);
      console.log('User created with ID:', userRef.id);

      // Create empty cardsOwned subcollection (Firebase will create it when first document is added)
      // For now, we'll just log that the user was created successfully
      console.log('User created successfully with cardsOwned subcollection ready');

      return {
        success: true,
        userId: userRef.id
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(userId: string, userData: UpdateUserRequest): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Updating user in Firebase:', userId);
      if (!this.isNonEmptyString(userId)) {
        return { success: false, error: 'User ID is required' };
      }
      const errors = this.validateUpdate(userData);
      if (errors.length > 0) {
        return { success: false, error: errors.join('; ') };
      }
      
      // Prepare update data
      const updateData: Partial<{
        firstName: string;
        lastName: string;
        name: string;
        email: string;
        dateOfBirth: string;
        country: string;
        state: string;
        city: string;
        gender: string;
        points: number;
        profileImagePath: string;
        updatedAt: string;
        commissionPercent: number;
      }> = {
        updatedAt: new Date().toISOString()
      };

      // Only include fields that are provided
      if (userData.firstName !== undefined) {
        updateData.firstName = userData.firstName;
      }
      if (userData.lastName !== undefined) {
        updateData.lastName = userData.lastName;
      }
      if (userData.firstName !== undefined || userData.lastName !== undefined) {
        // Update name field if either first or last name is being updated
        const currentUser = await this.getUserById(userId);
        if (currentUser) {
          const firstName = userData.firstName !== undefined ? userData.firstName : currentUser.firstName;
          const lastName = userData.lastName !== undefined ? userData.lastName : currentUser.lastName;
          updateData.name = `${firstName} ${lastName}`.trim();
        }
      }
      if (userData.email !== undefined) {
        updateData.email = userData.email;
      }
      if (userData.dateOfBirth !== undefined) {
        updateData.dateOfBirth = userData.dateOfBirth;
      }
      if (userData.country !== undefined) {
        updateData.country = userData.country;
      }
      if (userData.state !== undefined) {
        updateData.state = userData.state;
      }
      if (userData.city !== undefined) {
        updateData.city = userData.city;
      }
      if (userData.gender !== undefined) {
        updateData.gender = userData.gender;
      }
      if (userData.points !== undefined) {
        updateData.points = userData.points;
      }
      if (userData.profileImagePath !== undefined) {
        updateData.profileImagePath = userData.profileImagePath;
      }
      if (userData.isInfluencer !== undefined) {
        (updateData as any).isInfluencer = userData.isInfluencer;
      }
      if (userData.commissionPercent !== undefined) {
        updateData.commissionPercent = Number(userData.commissionPercent) || 0;
      }

      // Update user document with existence guard
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      const existing = await getDoc(userRef);
      if (!existing.exists()) {
        return { success: false, error: 'User not found' };
      }
      await updateDoc(userRef, updateData);
      
      console.log('User updated successfully');
      return {
        success: true
      };
    } catch (error) {
      console.error('Error updating user:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error occurred';
      // Map Firestore "No document to update" message to a friendly error
      if (typeof msg === 'string' && msg.toLowerCase().includes('no document to update')) {
        return { success: false, error: 'User not found' };
      }
      return { success: false, error: msg };
    }
  }

  /**
   * Add a card to user's cardsOwned subcollection
   */
  async addCardToUser(userId: string, cardId: string, quantity: number = 1): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Adding card ${cardId} to user ${userId}`);
      
      const cardData = {
        cardId,
        quantity,
        timestamp: new Date().toISOString()
      };

      // Add card to cardsOwned subcollection
      const cardsRef = collection(db, this.COLLECTION_NAME, userId, this.CARDS_SUBCOLLECTION);
      await addDoc(cardsRef, cardData);
      
      console.log('Card added to user successfully');
      return {
        success: true
      };
    } catch (error) {
      console.error('Error adding card to user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a user document from Firebase
   */
  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Deleting user ${userId}`);
      if (!this.isNonEmptyString(userId)) {
        return { success: false, error: 'User ID is required' };
      }
      
      // Delete the user document
      const userRef = doc(db, this.COLLECTION_NAME, userId);
      await deleteDoc(userRef);
      
      console.log('User deleted successfully');
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Subscribe to users collection with optional filters and emit full users with cardsOwned.
   * Returns an unsubscribe function.
   */
  subscribeToUsers(
    filters: UserFilters | undefined,
    onUpdate: (users: UserWithCards[]) => void
  ): () => void {
    const constraints: QueryConstraint[] = [];
    if (filters?.country) constraints.push(where('country', '==', filters.country));
    if (filters?.state) constraints.push(where('state', '==', filters.state));
    if (filters?.city) constraints.push(where('city', '==', filters.city));
    if (filters?.gender) constraints.push(where('gender', '==', filters.gender));
    if (filters?.minPoints !== undefined) constraints.push(where('points', '>=', filters.minPoints));
    if (filters?.maxPoints !== undefined) constraints.push(where('points', '<=', filters.maxPoints));

    const usersQuery = query(collection(db, this.COLLECTION_NAME), ...constraints);
    const unsubscribe = onSnapshot(usersQuery, async (snapshot) => {
      try {
        const usersWithCards: UserWithCards[] = [];
        for (const docSnap of snapshot.docs) {
          const base = docSnap.data() as any;
          const cardsRef = collection(db, this.COLLECTION_NAME, docSnap.id, this.CARDS_SUBCOLLECTION);
          const cardsSnap = await getDocs(cardsRef);
          console.log('cardsSnap.docs:', cardsSnap.docs);
          const cardsOwned: UserCard[] = cardsSnap.docs.map(d => ({
            cardId: String(d.data().cardId || d.id),
            quantity: Number(d.data().quantity || 1),
            timestamp: String(d.data().timestamp || new Date().toISOString()),
          }));
          usersWithCards.push({
            id: docSnap.id,
            firstName: String(base.firstName || ''),
            lastName: String(base.lastName || ''),
            name: String(base.name || ''),
            email: String(base.email || ''),
            dateOfBirth: String(base.dateOfBirth || ''),
            country: String(base.country || ''),
            state: String(base.state || ''),
            city: String(base.city || ''),
            points: Number(base.points || 0),
            gender: String(base.gender || ''),
            profileImagePath: String(base.profileImagePath || ''),
            isInfluencer: !!base.isInfluencer,
            commissionPercent: Number(base.commissionPercent ?? 0),
            cardsOwned,
          });
        }
        // Sort by firstName for consistent UX
        usersWithCards.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
        onUpdate(usersWithCards);
      } catch (e) {
        console.error('Error in users subscription update:', e);
      }
    });
    return unsubscribe;
  }

  /**
   * Search users by name or email
   */
  async searchUsers(searchTerm: string): Promise<UserWithCards[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a basic implementation that searches by exact matches
      const users = await this.getUsers();
      
      const searchLower = searchTerm.toLowerCase();
      return users.filter(user => 
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Get mock users data as fallback
   */
  private getMockUsers(): UserWithCards[] {
    return [
      {
        id: 'mock-1',
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        email: 'john.doe@example.com',
        dateOfBirth: '1990-01-15',
        country: 'United States',
        state: 'California',
        city: 'Los Angeles',
        points: 1250,
        gender: 'Male',
        profileImagePath: '',
        isInfluencer: false,
        cardsOwned: [
          { cardId: 'CARD001', quantity: 2, timestamp: '2024-01-16T00:00:00.000Z' },
          { cardId: 'CARD003', quantity: 1, timestamp: '2024-01-18T00:00:00.000Z' }
        ]
      },
      {
        id: 'mock-2',
        firstName: 'Jane',
        lastName: 'Smith',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        dateOfBirth: '1985-03-22',
        country: 'Canada',
        state: 'Ontario',
        city: 'Toronto',
        points: 2100,
        gender: 'Female',
        profileImagePath: '',
        isInfluencer: true,
        cardsOwned: [
          { cardId: 'CARD002', quantity: 3, timestamp: '2024-01-12T00:00:00.000Z' },
          { cardId: 'CARD004', quantity: 1, timestamp: '2024-01-20T00:00:00.000Z' },
          { cardId: 'CARD001', quantity: 1, timestamp: '2024-01-22T00:00:00.000Z' }
        ]
      },
      {
        id: 'mock-3',
        firstName: 'Mike',
        lastName: 'Johnson',
        name: 'Mike Johnson',
        email: 'mike.johnson@example.com',
        dateOfBirth: '1992-07-08',
        country: 'United Kingdom',
        state: 'England',
        city: 'London',
        points: 850,
        gender: 'Male',
        profileImagePath: '',
        isInfluencer: false,
        cardsOwned: [
          { cardId: 'CARD005', quantity: 1, timestamp: '2024-01-21T00:00:00.000Z' }
        ]
      }
    ];
  }
}

export const userService = new UserService();
