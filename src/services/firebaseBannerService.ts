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
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export interface Banner {
  id: string;
  bannerId: string;
  image: string;
  url: string;
  createdAt: string;
}

export interface CreateBannerRequest {
  bannerId?: string;
  image: string;
  url: string;
}

export interface UpdateBannerRequest {
  bannerId?: string;
  image?: string;
  url?: string;
}

export interface BannerResponse {
  success: boolean;
  banner?: Banner;
  error?: string;
}

export interface BannersResponse {
  success: boolean;
  banners?: Banner[];
  error?: string;
}

class FirebaseBannerService {
  private readonly COLLECTION_NAME = 'banners';

  /**
   * Check if user is authenticated
   */
  private checkAuth(): Promise<boolean> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        console.log('Auth state:', user ? 'authenticated' : 'not authenticated');
        console.log('User:', user?.email, user?.uid);
        resolve(!!user);
      });
    });
  }

  /**
   * Get all banners from Firebase
   */
  async getBanners(): Promise<BannersResponse> {
    try {
      console.log('Fetching banners from Firebase...');
      console.log('Firebase db instance:', db);
      console.log('Collection name:', this.COLLECTION_NAME);
      
      // First try to get all documents without ordering to see if there are any
      const bannersCollection = collection(db, this.COLLECTION_NAME);
      
      const querySnapshot = await getDocs(bannersCollection);
      console.log('Query snapshot size:', querySnapshot.size);
      console.log('Query snapshot empty:', querySnapshot.empty);
      
      const banners: Banner[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        banners.push({
          id: doc.id,
          bannerId: data.bannerId || doc.id,
          image: data.image || '',
          url: data.url || '',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      
      console.log(`Fetched ${banners.length} banners`);
      console.log('Banners data:', banners);
      
      return {
        success: true,
        banners
      };
      
    } catch (error: unknown) {
      console.error('Error fetching banners:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch banners'
      };
    }
  }

  /**
   * Get a specific banner by ID
   */
  async getBannerById(id: string): Promise<BannerResponse> {
    try {
      console.log('Fetching banner by ID:', id);
      
      const bannerDoc = await getDoc(doc(db, this.COLLECTION_NAME, id));
      
      if (!bannerDoc.exists()) {
        return {
          success: false,
          error: 'Banner not found'
        };
      }
      
      const data = bannerDoc.data();
      const banner: Banner = {
        id: bannerDoc.id,
        bannerId: data.bannerId || bannerDoc.id,
        image: data.image,
        url: data.url,
        createdAt: data.createdAt
      };
      
      return {
        success: true,
        banner
      };
      
    } catch (error: unknown) {
      console.error('Error fetching banner:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch banner'
      };
    }
  }

  /**
   * Create a new banner
   */
  async createBanner(bannerData: CreateBannerRequest): Promise<BannerResponse> {
    try {
      console.log('Creating new banner...');
      console.log('Banner data:', bannerData);
      console.log('Firebase db instance:', db);
      console.log('Collection name:', this.COLLECTION_NAME);
      
      const now = new Date().toISOString();
      const bannerDoc = {
        bannerId: bannerData.bannerId || `banner_${Date.now()}`,
        image: bannerData.image,
        url: bannerData.url,
        createdAt: now
      };

      console.log('Document to create:', bannerDoc);
      
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), bannerDoc);
      console.log('Banner created with ID:', docRef.id);

      const banner: Banner = {
        id: docRef.id,
        ...bannerDoc
      };

      console.log('Created banner object:', banner);

      return {
        success: true,
        banner
      };
      
    } catch (error: unknown) {
      console.error('Error creating banner:', error);
      console.error('Error details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create banner'
      };
    }
  }

  /**
   * Update an existing banner
   */
  async updateBanner(id: string, bannerData: UpdateBannerRequest): Promise<BannerResponse> {
    try {
      console.log('Updating banner:', id);
      
      const updateData: Partial<Banner> = {};

      if (bannerData.bannerId !== undefined) {
        updateData.bannerId = bannerData.bannerId;
      }
      if (bannerData.image !== undefined) {
        updateData.image = bannerData.image;
      }
      if (bannerData.url !== undefined) {
        updateData.url = bannerData.url;
      }

      await updateDoc(doc(db, this.COLLECTION_NAME, id), updateData);
      
      // Fetch the updated banner
      const updatedBannerResponse = await this.getBannerById(id);
      
      if (updatedBannerResponse.success && updatedBannerResponse.banner) {
        console.log('Banner updated successfully');
        return {
          success: true,
          banner: updatedBannerResponse.banner
        };
      }
      
      return {
        success: false,
        error: 'Failed to fetch updated banner'
      };
      
    } catch (error: unknown) {
      console.error('Error updating banner:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update banner'
      };
    }
  }

  /**
   * Delete a banner
   */
  async deleteBanner(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Deleting banner:', id);
      
      await deleteDoc(doc(db, this.COLLECTION_NAME, id));
      console.log('Banner deleted successfully');
      
      return {
        success: true
      };
      
    } catch (error: unknown) {
      console.error('Error deleting banner:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete banner'
      };
    }
  }
}

// Export singleton instance
export const firebaseBannerService = new FirebaseBannerService();