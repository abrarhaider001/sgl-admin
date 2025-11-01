import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  Timestamp,
  setDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  where,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { notifySuccess, notifyError } from '@/utils/snackbarBus';

export interface RedeemCode {
  id: string;
  cardId: string;
  codes: string[];  // Array of code strings
  createdAt: string;
}

export interface CreateRedeemCodeRequest {
  cardId: string;
  codes: string[];  // Array of codes
}

export interface UpdateRedeemCodeRequest {
  cardId?: string;
  codes?: string[];  // Optional array of codes
}

export interface RedeemCodeResponse {
  success: boolean;
  data: RedeemCode[];
  error?: string;
}

export class FirebaseRedeemCodeService {
  private collectionName = process.env.NEXT_PUBLIC_REDEEM_CODES_COLLECTION || 'redeemCodes';

  // Get all redeem codes
  async getAllRedeemCodes(): Promise<RedeemCode[]> {
    try {
      const redeemCodesCollection = collection(db, this.collectionName);
      const redeemCodesSnapshot = await getDocs(query(redeemCodesCollection, orderBy('createdAt')));
      return redeemCodesSnapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          cardId: data.cardId,
          codes: data.codes || [],
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        } as RedeemCode;
      });
    } catch (error) {
      console.error('Error fetching redeem codes:', error);
      throw new Error('Failed to fetch redeem codes');
    }
  }

  // Realtime subscription: all redeem codes
  subscribeToAllRedeemCodes(onUpdate: (codes: RedeemCode[]) => void): () => void {
    const redeemCodesCollection = collection(db, this.collectionName);
    const q = query(redeemCodesCollection, orderBy('createdAt'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          cardId: data.cardId,
          codes: data.codes || [],
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        } as RedeemCode;
      });
      onUpdate(items);
    });
    return unsubscribe;
  }

  // Get redeem codes by cardId (document id is cardId)
  async getRedeemCodesByCardId(cardId: string): Promise<RedeemCodeResponse> {
    try {
      const redeemCodeDoc = await getDoc(doc(db, this.collectionName, cardId));
      if (redeemCodeDoc.exists()) {
        const data = redeemCodeDoc.data() as any;
        const redeemCode = {
          id: redeemCodeDoc.id,
          cardId: data.cardId,
          codes: data.codes || [],
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        } as RedeemCode;
        return { success: true, data: [redeemCode] };
      } else {
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error('Error fetching redeem codes by cardId:', error);
      return { success: false, data: [], error: 'Failed to fetch redeem codes for this card' };
    }
  }

  // Realtime subscription: codes by cardId
  subscribeToRedeemCodesByCardId(cardId: string, onUpdate: (codes: RedeemCode[]) => void): () => void {
    const docRef = doc(db, this.collectionName, cardId);
    const unsubscribe = onSnapshot(docRef, docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const redeemCode: RedeemCode = {
          id: docSnap.id,
          cardId: data.cardId,
          codes: data.codes || [],
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        };
        onUpdate([redeemCode]);
      } else {
        onUpdate([]);
      }
    });
    return unsubscribe;
  }

  // Create new redeem code (document id = cardId)
  async createRedeemCode(redeemCodeData: CreateRedeemCodeRequest): Promise<RedeemCode> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to create redeem codes');
      }
      const docRef = doc(db, this.collectionName, redeemCodeData.cardId);
      const existing = await getDoc(docRef);
      if (existing.exists()) {
        // If doc exists, merge codes atomically
        await updateDoc(docRef, { codes: arrayUnion(...redeemCodeData.codes) });
        const snap = await getDoc(docRef);
        const data = snap.data() as any;
        return {
          id: redeemCodeData.cardId,
          cardId: data.cardId ?? redeemCodeData.cardId,
          codes: data.codes || [],
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        };
      } else {
        const newRedeemCode = {
          cardId: redeemCodeData.cardId,
          codes: redeemCodeData.codes,
          createdAt: Timestamp.now()
        };
        await setDoc(docRef, newRedeemCode);
        return {
          id: redeemCodeData.cardId,
          cardId: redeemCodeData.cardId,
          codes: redeemCodeData.codes,
          createdAt: newRedeemCode.createdAt.toDate().toISOString()
        };
      }
    } catch (error) {
      console.error('Error creating redeem code:', error);
          throw error;
    }
  }

  // Update existing redeem code (non-atomic merges)
  async updateRedeemCode(redeemCodeId: string, updates: UpdateRedeemCodeRequest): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to update redeem codes');
      }
      const redeemCodeRef = doc(db, this.collectionName, redeemCodeId);
      await updateDoc(redeemCodeRef, { ...updates });
    } catch (error) {
      console.error('Error updating redeem code:', error);
          throw error;    
    }
  }

  // Add codes atomically
  async addCodesToRedeemCode(cardId: string, newCodes: string[]): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to add codes');
      }
      const docRef = doc(db, this.collectionName, cardId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, { codes: arrayUnion(...newCodes) });

      } else {
        const newRedeemCode = { cardId, codes: newCodes, createdAt: Timestamp.now() };
        await setDoc(docRef, newRedeemCode);

      }
    } catch (error) {
      console.error('Error adding codes to redeem code:', error);
          throw error;
    }
  }

  // Remove codes atomically
  async removeCodesFromRedeemCode(cardId: string, codesToRemove: string[]): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to remove codes');
      }
      const docRef = doc(db, this.collectionName, cardId);
      await updateDoc(docRef, { codes: arrayRemove(...codesToRemove) });

    } catch (error) {
      console.error('Error removing codes from redeem code:', error);
          throw error;
    }
  }

  // Delete redeem code document
  async deleteRedeemCode(redeemCodeId: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to delete redeem codes');
      }
      const redeemCodeRef = doc(db, this.collectionName, redeemCodeId);
      await deleteDoc(redeemCodeRef);

    } catch (error) {
      console.error('Error deleting redeem code:', error);
          throw error;
    }
  }

  // Search redeem codes by cardId
  async searchRedeemCodes(searchTerm: string): Promise<RedeemCode[]> {
    try {
      const redeemCodesCollection = collection(db, this.collectionName);
      const redeemCodesSnapshot = await getDocs(redeemCodesCollection);
      const allRedeemCodes = redeemCodesSnapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          cardId: data.cardId,
          codes: data.codes || [],
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        } as RedeemCode;
      });
      return allRedeemCodes.filter(code => code.cardId?.toLowerCase?.().includes(searchTerm.toLowerCase()));
    } catch (error) {
      console.error('Error searching redeem codes:', error);
      throw new Error('Failed to search redeem codes');
    }
  }

  // ===== PROMO CODE API =====
  private validatePromoCodeValue(codeValue: string) {
    const autoPattern = /^Promo\d{4}$/;
    const customPattern = /^[A-Za-z][A-Za-z0-9_-]{2,31}$/; // 3–32 chars, start with letter
    return autoPattern.test(codeValue) || customPattern.test(codeValue);
  }

  async createPromoCode(cardId: string, maxUsage: number, customCode?: string): Promise<{ code: string; type: 'promo'; max_usage: number; remaining_uses: number; used_by: string[]; created_at: string; card_id: string; }> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to create promo codes');
      }
      if (!cardId || typeof cardId !== 'string') {
        throw new Error('cardId is required to create a promo code');
      }
      if (!Number.isFinite(maxUsage) || maxUsage < 1) {
        throw new Error('maxUsage must be a positive integer');
      }
      const sequenceRef = doc(db, this.collectionName, '_promo_sequence');
      const result = await runTransaction(db, async (tx) => {
      const now = Timestamp.now();

      // Determine code value (read sequence only if auto-generating)
      let codeValue: string;
      let nextIndex: number | undefined;
      if (customCode && customCode.trim()) {
        codeValue = customCode.trim();
        if (!this.validatePromoCodeValue(codeValue)) {
          throw new Error('Invalid promo code name');
        }
      } else {
        const seqSnap = await tx.get(sequenceRef);
        const lastIndex = seqSnap.exists() ? (seqSnap.data() as any).lastIndex || 0 : 0;
        nextIndex = lastIndex + 1;
        codeValue = `Promo${String(nextIndex).padStart(4, '0')}`;
      }

      // Perform all reads BEFORE any writes
      const promoRef = doc(db, this.collectionName, codeValue);
      const cardRef = doc(db, 'cards', cardId);
      const [promoSnap, cardSnap] = await Promise.all([tx.get(promoRef), tx.get(cardRef)]);
      if (promoSnap.exists()) {
        throw new Error('Promo code already exists');
      }

      // Now do writes
      if (!customCode || !customCode.trim()) {
        // Update promo sequence when auto-generating
        tx.set(sequenceRef, { lastIndex: nextIndex, updated_at: now }, { merge: true });
      }

      // Create promo doc with the required schema (strict fields only)
      const nowTs = Timestamp.now();
      tx.set(promoRef, {
        cardId,
        codes: [codeValue],
        createdAt: nowTs,
        maxUsers: maxUsage,
        usedBy: [],
      });
      
      // Update the card document to reference this promo code
      if (cardSnap.exists()) {
        tx.update(cardRef, {
          promoCodes: arrayUnion(codeValue),
        });
      } else {
        tx.set(cardRef, {
          promoCodes: [codeValue],
        }, { merge: true });
      }
      
      const created = {
        code: codeValue,
        card_id: cardId,
        max_usage: maxUsage,
        remaining_uses: maxUsage,
        created_at: nowTs.toDate().toISOString(),
      };
      return created;
    });
      return {
        ...result,
        type: 'promo',
        used_by: []
      };
    } catch (error) {
       throw error;
    }
  }

  subscribeToPromoCodes(onUpdate: (items: Array<{ id: string; code: string; type: 'promo'; max_usage?: number; remaining_uses?: number; used_by: string[]; created_at: string; card_id?: string; }>) => void): () => void {
    const redeemCodesCollection = collection(db, this.collectionName);
    // Listen to entire collection to support both legacy and new promo doc shapes
    const q = query(redeemCodesCollection);
    const unsubscribe = onSnapshot(q, snapshot => {
      const items = snapshot.docs
        .map(docSnap => {
          const data = docSnap.data() as any;

          // Detect promo-like docs
          const isPromoType = data.type === 'promo';
          const hasPromoFlagFields = data.max_usage !== undefined || data.maxUsers !== undefined || Array.isArray(data.used_by) || Array.isArray(data.usedBy);
          const idLooksPromo = /^promo\d+/i.test(docSnap.id);
          const codesArray: string[] = Array.isArray(data.codes) ? data.codes : [];
          const codesContainPromo = codesArray.some(c => /^promo\d+/i.test(c));
          const isPromoDoc = isPromoType || hasPromoFlagFields || idLooksPromo || codesContainPromo;
          if (!isPromoDoc) return null;

          const codeValue: string = (
            data.code ??
            (codesArray.find(c => /^promo\d+/i.test(c)) || codesArray[0]) ??
            docSnap.id
          );
          const usedBy: string[] = Array.isArray(data.used_by)
            ? data.used_by
            : Array.isArray(data.usedBy)
              ? data.usedBy
              : [];
          const maxUsage: number | undefined =
            typeof data.max_usage === 'number' ? data.max_usage :
            typeof data.maxUsers === 'number' ? data.maxUsers :
            undefined;
          const remainingUses: number | undefined =
            typeof data.remaining_uses === 'number' ? data.remaining_uses :
            maxUsage !== undefined ? Math.max(maxUsage - usedBy.length, 0) : undefined;
          const createdAtIso: string =
            data.created_at?.toDate?.()?.toISOString() ||
            data.createdAt?.toDate?.()?.toISOString() ||
            data.created_at ||
            data.createdAt ||
            new Date().toISOString();
          const cardId: string | undefined = data.cardId;

          return {
            id: docSnap.id,
            code: codeValue,
            type: 'promo' as const,
            max_usage: maxUsage,
            remaining_uses: remainingUses,
            used_by: usedBy,
            created_at: createdAtIso,
            card_id: cardId
          };
        })
        .filter(Boolean) as Array<{ id: string; code: string; type: 'promo'; max_usage?: number; remaining_uses?: number; used_by: string[]; created_at: string; card_id?: string; }>;
      items.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      onUpdate(items);
    });
    return unsubscribe;
  }

  async deletePromoCode(codeValue: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to delete promo codes');
      }
      const promoRef = doc(db, this.collectionName, codeValue);
      await deleteDoc(promoRef);
    } catch (error) {
       throw error;
    }
  }

  async redeemPromoCode(codeValue: string, userId: string): Promise<{ remaining_uses: number; used_by: string[]; }> {
    try {
      if (!this.validatePromoCodeValue(codeValue)) {
        throw new Error('Invalid promo code format.');
      }

      const promoRef = doc(db, this.collectionName, codeValue);

      const result = await runTransaction(db, async (tx) => {
        const snap = await tx.get(promoRef);
        if (!snap.exists()) {
          throw new Error('Promo code not found.');
        }

        const data = snap.data() as any;
        // Normalize fields (support legacy and new schema)
        const usedBy: string[] = Array.isArray(data.usedBy)
          ? data.usedBy
          : Array.isArray(data.used_by)
          ? data.used_by
          : [];
        const maxUsers: number = typeof data.maxUsers === 'number'
          ? data.maxUsers
          : typeof data.max_usage === 'number'
          ? data.max_usage
          : 0;

        if (maxUsers <= 0) {
          throw new Error('Invalid promo code configuration: maxUsers must be positive.');
        }

        if (usedBy.includes(userId)) {
          throw new Error('User already redeemed this promo code.');
        }

        const updatedUsedBy = [...usedBy, userId];
        const remaining = Math.max(0, maxUsers - updatedUsedBy.length);
        if (remaining < 0) {
          throw new Error('Promo code has no remaining uses.');
        }

        // Persist only the required field (do not add extra fields)
        tx.update(promoRef, {
          usedBy: arrayUnion(userId),
        });

        return {
          remaining_uses: remaining,
          used_by: updatedUsedBy,
        };
      });

      return result;
    } catch (error) {
       throw error;
    }
  }
}

// Export singleton instance
export const firebaseRedeemCodeService = new FirebaseRedeemCodeService();