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
  orderBy,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { notifySuccess, notifyError } from '@/utils/snackbarBus';
import { imageService } from './imageService';
import { onAuthStateChanged } from 'firebase/auth';
import { Album } from '@/types/album';

export interface CreateAlbumRequest {
  albumId?: string;
  name: string;
  image?: string;
  cardIds?: string[];
}

export interface UpdateAlbumRequest {
  albumId?: string;
  name?: string;
  image?: string;
  cardIds?: string[];
}

export interface AlbumResponse {
  success: boolean;
  album?: Album;
  error?: string;
}

export interface AlbumsResponse {
  success: boolean;
  albums?: Album[];
  error?: string;
}

class FirebaseAlbumService {
  private readonly COLLECTION_NAME = 'albums';

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
   * Get all albums from Firebase
   */
  async getAlbums(): Promise<AlbumsResponse> {
    try {
      console.log('Fetching albums from Firebase...');
      console.log('Firebase db instance:', db);
      console.log('Collection name:', this.COLLECTION_NAME);
      
      const albumsCollection = collection(db, this.COLLECTION_NAME);
      const querySnapshot = await getDocs(albumsCollection);
      
      console.log('Query snapshot size:', querySnapshot.size);
      console.log('Query snapshot empty:', querySnapshot.empty);
      
      const albums: Album[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        albums.push({
          albumId: data.albumId || doc.id,
          name: data.name || '',
          image: data.image || '',
          cardIds: data.cardIds || []
        });
      });
      
      console.log(`Fetched ${albums.length} albums`);
      console.log('Albums data:', albums);
      
      return {
        success: true,
        albums
      };
    } catch (error) {
      console.error('Error fetching albums:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get a single album by ID
   */
  async getAlbum(albumId: string): Promise<AlbumResponse> {
    try {
      console.log('Fetching album:', albumId);
      
      const albumDoc = doc(db, this.COLLECTION_NAME, albumId);
      const docSnap = await getDoc(albumDoc);
      
      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Album not found'
        };
      }
      
      const data = docSnap.data();
      const album: Album = {
        albumId: data.albumId || docSnap.id,
        name: data.name || '',
        image: data.image || '',
        cardIds: data.cardIds || []
      };
      
      console.log('Fetched album:', album);
      
      return {
        success: true,
        album
      };
    } catch (error) {
      console.error('Error fetching album:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create a new album
   */
  async createAlbum(albumData: CreateAlbumRequest): Promise<AlbumResponse> {
    try {
      console.log('Creating album:', albumData);
      
      // Check authentication
      const isAuthenticated = await this.checkAuth();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Validate required fields
      if (!albumData.name || albumData.name.trim() === '') {
        return {
          success: false,
          error: 'Album name is required'
        };
      }

      const albumsCollection = collection(db, this.COLLECTION_NAME);
      
      // Prepare album data
      const newAlbumData = {
        albumId: albumData.albumId || '',
        name: albumData.name.trim(),
        image: albumData.image || '',
        cardIds: albumData.cardIds || [],
        createdAt: new Date().toISOString()
      };

      let docRef;
      if (albumData.albumId) {
        // Use custom albumId as document ID
        docRef = doc(albumsCollection, albumData.albumId);
        await setDoc(docRef, newAlbumData);
      } else {
        // Let Firebase generate the document ID
        docRef = await addDoc(albumsCollection, newAlbumData);
        // Update the albumId field to match the generated document ID
        await updateDoc(docRef, { albumId: docRef.id });
        newAlbumData.albumId = docRef.id;
      }

      const album: Album = {
        albumId: newAlbumData.albumId,
        name: newAlbumData.name,
        image: newAlbumData.image,
        cardIds: newAlbumData.cardIds
      };

      console.log('Album created successfully:', album);
      notifySuccess('create', 'Album');
      
      return {
        success: true,
        album
      };
    } catch (error) {
      console.error('Error creating album:', error);
      notifyError('create', 'Album', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update an existing album
   */
  async updateAlbum(albumId: string, albumData: UpdateAlbumRequest): Promise<AlbumResponse> {
    try {
      console.log('Updating album:', albumId, albumData);
      
      // Check authentication
      const isAuthenticated = await this.checkAuth();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const albumDoc = doc(db, this.COLLECTION_NAME, albumId);
      
      // Check if album exists
      const docSnap = await getDoc(albumDoc);
      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Album not found'
        };
      }

      // Prepare update data (only include defined fields)
      const updateData: Partial<Album> & { updatedAt: string } = {
        updatedAt: new Date().toISOString()
      };

      if (albumData.name !== undefined) updateData.name = albumData.name.trim();
      if (albumData.image !== undefined) updateData.image = albumData.image;
      if (albumData.cardIds !== undefined) updateData.cardIds = albumData.cardIds;
      if (albumData.albumId !== undefined) updateData.albumId = albumData.albumId;

      await updateDoc(albumDoc, updateData);

      // Fetch updated album
      const updatedDocSnap = await getDoc(albumDoc);
      const updatedData = updatedDocSnap.data()!;
      
      const album: Album = {
        albumId: updatedData.albumId || albumId,
        name: updatedData.name || '',
        image: updatedData.image || '',
        cardIds: updatedData.cardIds || []
      };

      console.log('Album updated successfully:', album);
      notifySuccess('update', 'Album');
      
      return {
        success: true,
        album
      };
    } catch (error) {
      console.error('Error updating album:', error);
      notifyError('update', 'Album', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete an album
   */
  async deleteAlbum(albumId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Deleting album:', albumId);
      
      // Check authentication
      const isAuthenticated = await this.checkAuth();
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const albumDocRef = doc(db, this.COLLECTION_NAME, albumId);
      
      // Check if album exists
      const albumSnap = await getDoc(albumDocRef);
      if (!albumSnap.exists()) {
        return {
          success: false,
          error: 'Album not found'
        };
      }

      const albumData = albumSnap.data() as Partial<Album> | undefined;
      const cardIds = Array.isArray(albumData?.cardIds) ? (albumData!.cardIds as string[]) : [];
      const albumImageUrl = albumData?.image;

      // Collect card document refs to delete by querying on cardID in chunks of 10
      const cardsCollection = collection(db, 'cards');
      const cardDocRefs: Array<ReturnType<typeof doc>> = [];
      const cardImageUrls: string[] = [];

      if (cardIds.length > 0) {
        const chunkSize = 10; // Firestore 'in' query limit
        for (let i = 0; i < cardIds.length; i += chunkSize) {
          const chunk = cardIds.slice(i, i + chunkSize);
          const q = query(cardsCollection, where('cardID', 'in', chunk));
          const snapshot = await getDocs(q);
          snapshot.forEach(d => {
            cardDocRefs.push(doc(db, 'cards', d.id));
            const data = d.data() as any;
            if (typeof data?.imageUrl === 'string' && data.imageUrl.length > 0) {
              cardImageUrls.push(data.imageUrl);
            }
          });
        }
      }

      // Perform batched deletes atomically, respecting 500 ops limit per batch
      const refsToDelete = [albumDocRef, ...cardDocRefs];
      const BATCH_LIMIT = 500;

      for (let i = 0; i < refsToDelete.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        const slice = refsToDelete.slice(i, i + BATCH_LIMIT);
        slice.forEach(ref => batch.delete(ref));
        await batch.commit();
      }

      // Best-effort: delete associated images from storage (non-transactional)
      const imageUrlsToDelete = [albumImageUrl, ...cardImageUrls].filter((u): u is string => typeof u === 'string' && u.length > 0);
      if (imageUrlsToDelete.length > 0) {
        const results = await Promise.allSettled(imageUrlsToDelete.map(url => imageService.deleteImage(url)));
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value !== true));
        if (failed.length > 0) {
          console.warn(`Some storage images failed to delete: ${failed.length}/${imageUrlsToDelete.length}`);
        }
      }

      console.log(`Album and ${cardDocRefs.length} associated card(s) deleted successfully`);
      notifySuccess('delete', 'Album');
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting album:', error);
      notifyError('delete', 'Album', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

// Export singleton instance
export const firebaseAlbumService = new FirebaseAlbumService();
export default firebaseAlbumService;