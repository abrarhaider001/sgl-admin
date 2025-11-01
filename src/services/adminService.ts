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
  orderBy
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { db, auth } from '../lib/firebase';

export interface Admin {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
  firebaseUid: string;
}

export interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
}

export interface CreateAdminResponse {
  success: boolean;
  adminId?: string;
  error?: string;
}

class AdminService {
  private readonly COLLECTION_NAME = 'admins';

  /**
   * Admin login with email and password
   */
  async loginAdmin(email: string, password: string): Promise<{ success: boolean; admin?: Admin; error?: string }> {
    try {
      console.log('Attempting admin login for:', email);
      
      // Step 1: Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Step 2: Skip email verification check - allow login with email and password only
      // Email verification is not required for admin login
      
      // Step 3: Get admin data from Firestore
      const adminDoc = await getDoc(doc(db, this.COLLECTION_NAME, firebaseUser.uid));
      
      if (!adminDoc.exists()) {
        await signOut(auth); // Sign out if no admin record found
        return {
          success: false,
          error: 'Admin account not found. Please contact your administrator.'
        };
      }
      
      const adminData = adminDoc.data();
      const admin: Admin = {
        id: adminDoc.id,
        username: adminData.username,
        email: adminData.email,
        createdAt: adminData.createdAt,
        emailVerified: firebaseUser.emailVerified,
        firebaseUid: adminData.firebaseUid
      };
      
      // Update emailVerified status in Firestore if it changed
      if (adminData.emailVerified !== firebaseUser.emailVerified) {
        await updateDoc(doc(db, this.COLLECTION_NAME, firebaseUser.uid), {
          emailVerified: firebaseUser.emailVerified
        });
      }
      
      console.log('Admin login successful:', admin.username);
      return {
        success: true,
        admin
      };
      
    } catch (error: any) {
      console.error('Admin login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact your administrator.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Admin logout
   */
  async logoutAdmin(): Promise<{ success: boolean; error?: string }> {
    try {
      await signOut(auth);
      console.log('Admin logged out successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: error.message || 'Logout failed'
      };
    }
  }

  /**
   * Get current logged-in admin
   */
  getCurrentAdmin(): User | null {
    return auth.currentUser;
  }

  /**
   * Create a new admin account with Firebase Authentication and Firestore document
   */
  async createAdmin(adminData: CreateAdminRequest): Promise<CreateAdminResponse> {
    try {
      console.log('Creating new admin account...');
      
      // Step 1: Create Firebase Authentication account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        adminData.email, 
        adminData.password
      );
      
      const firebaseUser = userCredential.user;
      console.log('Firebase Auth account created:', firebaseUser.uid);

      // Step 2: Create Firestore document for the admin (no email verification required)
      const adminDoc = {
        username: adminData.username,
        email: adminData.email,
        createdAt: new Date().toISOString(),
        emailVerified: true, // Set to true since we don't require email verification for admin creation
        firebaseUid: firebaseUser.uid // Link to Firebase Auth user
      };

      // Use the Firebase Auth UID as the document ID for consistency
      await setDoc(doc(db, this.COLLECTION_NAME, firebaseUser.uid), adminDoc);
      console.log('Admin document created in Firestore');

      return {
        success: true,
        adminId: firebaseUser.uid
      };
    } catch (error: any) {
      console.error('Error creating admin:', error);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Failed to create admin account';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get all admins from Firestore
   */
  async getAdmins(): Promise<{ success: boolean; admins?: Admin[]; error?: string }> {
    try {
      console.log('Fetching admins from Firestore...');
      const adminsQuery = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
      
      const adminsSnapshot = await getDocs(adminsQuery);
      const admins: Admin[] = [];

      adminsSnapshot.forEach((doc) => {
        const data = doc.data();
        admins.push({
          id: doc.id,
          username: data.username || '',
          email: data.email || '',
          createdAt: data.createdAt || '',
          emailVerified: data.emailVerified || false,
          firebaseUid: data.firebaseUid
        });
      });

      console.log(`Retrieved ${admins.length} admins`);
      return {
        success: true,
        admins: admins
      };
    } catch (error) {
      console.error('Error fetching admins:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch admins'
      };
    }
  }

  /**
   * Get a single admin by ID
   */
  async getAdminById(adminId: string): Promise<Admin | null> {
    try {
      const adminDoc = await getDoc(doc(db, this.COLLECTION_NAME, adminId));
      
      if (!adminDoc.exists()) {
        return null;
      }

      const data = adminDoc.data();
      return {
        id: adminDoc.id,
        username: data.username || '',
        email: data.email || '',
        createdAt: data.createdAt || '',
        emailVerified: data.emailVerified || false,
        firebaseUid: data.firebaseUid
      };
    } catch (error) {
      console.error('Error fetching admin:', error);
      return null;
    }
  }

  /**
   * Update admin information
   */
  async updateAdmin(adminId: string, updateData: Partial<Admin>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Updating admin:', adminId);
      
      const adminRef = doc(db, this.COLLECTION_NAME, adminId);
      const updatePayload: any = {
        updatedAt: new Date().toISOString()
      };

      // Only include fields that are provided
      if (updateData.username !== undefined) {
        updatePayload.username = updateData.username;
      }
      if (updateData.email !== undefined) {
        updatePayload.email = updateData.email;
      }

      await updateDoc(adminRef, updatePayload);
      console.log('Admin updated successfully');

      return { success: true };
    } catch (error) {
      console.error('Error updating admin:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete admin account from Firestore
   * 
   * IMPORTANT: This function only deletes the admin document from Firestore.
   * To completely remove the admin, you also need to delete the Firebase Authentication user.
   * This requires Firebase Admin SDK and should be done server-side.
   * 
   * For complete deletion, consider:
   * 1. Using Firebase Admin SDK on the server
   * 2. Creating a Cloud Function to handle user deletion
   * 3. Using the Firebase Admin Console to manually delete users
   */
  async deleteAdmin(adminId: string): Promise<{ success: boolean; error?: string; warning?: string }> {
    try {
      console.log('Deleting admin from Firestore:', adminId);
      
      const adminRef = doc(db, this.COLLECTION_NAME, adminId);
      await deleteDoc(adminRef);
      
      console.log('Admin deleted successfully from Firestore');
      return { 
        success: true,
        warning: 'Admin removed from database. Firebase Authentication user still exists and should be deleted manually from Firebase Console or using Firebase Admin SDK.'
      };
    } catch (error) {
      console.error('Error deleting admin:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send password reset email to admin
   */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Sending password reset email to:', email);
      
      await sendPasswordResetEmail(auth, email);
      
      console.log('Password reset email sent successfully');
      return { success: true };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send password reset email'
      };
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();
export default adminService;