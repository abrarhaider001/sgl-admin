import { collection, getDocs, doc, getDoc, query, orderBy, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Pack, CreatePackRequest, UpdatePackRequest } from '@/types/pack';

export interface PackStats {
  totalPacks: number;
  totalValue: number;
  averagePrice: number;
  packsByRarity: Record<string, number>;
  featuredPacks: number;
  lowStockAlerts: Array<{ packId: string; name: string }>;
}

export interface PackFilters {
  search?: string;
  rarity?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  sortBy?: 'name' | 'price' | 'rarity';
  sortOrder?: 'asc' | 'desc';
}

class FirebasePackService {
  private collectionName = 'packs';
  private mapDataToPack(id: string, data: any): Pack {
    return {
      description: data.description || '',
      image: data.image || '',
      isFeatured: !!data.isFeatured,
      name: data.name || '',
      packId: data.packId || data.packID || id,
      price: Number(data.price ?? 0),
      rarity: (typeof data.rarity === 'string' ? data.rarity : 'common').toLowerCase(),
      stockNo: data.stockNo || data.stockNO || '',
      linkedAlbum: data.linkedAlbum || '',
    } as Pack;
  }

  async getPacks(): Promise<Pack[]> {
    const packsRef = collection(db, this.collectionName);
    const snapshot = await getDocs(query(packsRef, orderBy('name')));
    const packs: Pack[] = snapshot.docs.map((d) => {
      const data = d.data() as any;
      return this.mapDataToPack(d.id, data);
    });
    return packs;
  }

  async getPack(id: string): Promise<Pack | null> {
    const packDoc = await getDoc(doc(db, this.collectionName, id));
    if (!packDoc.exists()) return null;
    const data = packDoc.data() as any;
    return this.mapDataToPack(packDoc.id, data);
  }

  subscribePacks(callback: (packs: Pack[]) => void): () => void {
    const packsRef = collection(db, this.collectionName);
    const q = query(packsRef, orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const packs = snapshot.docs.map((d) => this.mapDataToPack(d.id, d.data()));
      callback(packs);
    });
    return unsubscribe;
  }

  async createPack(request: CreatePackRequest): Promise<Pack> {
    const packsRef = collection(db, this.collectionName);
    const basePayload = {
      description: request.description || '',
      image: request.image || '',
      isFeatured: !!request.isFeatured,
      name: request.name,
      price: Number(request.price ?? 0),
      rarity: (typeof request.rarity === 'string' ? request.rarity : 'common').toLowerCase(),
      stockNo: request.stockNo,
      linkedAlbum: request.linkedAlbum || '',
    } as any;

    if (request.packId) {
      const docRef = doc(db, this.collectionName, request.packId);
      await setDoc(docRef, { ...basePayload, packId: request.packId }, { merge: true });
      const saved = await getDoc(docRef);
      return this.mapDataToPack(saved.id, saved.data());
    } else {
      // Do NOT include undefined fields in Firestore writes
      const added = await addDoc(packsRef, basePayload);
      // set packId field to match document id for consistency
      await updateDoc(doc(db, this.collectionName, added.id), { packId: added.id });
      const saved = await getDoc(doc(db, this.collectionName, added.id));
      return this.mapDataToPack(saved.id, saved.data());
    }
  }

  private async getDocRefByPackId(packId: string) {
    const directRef = doc(db, this.collectionName, packId);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) return directRef;

    // Try querying by field 'packId'
    const packsRef = collection(db, this.collectionName);
    const byPackId = await getDocs(query(packsRef, where('packId', '==', packId)));
    if (!byPackId.empty) return doc(db, this.collectionName, byPackId.docs[0].id);

    // Try querying by legacy field 'packID'
    const byPackID = await getDocs(query(packsRef, where('packID', '==', packId)));
    if (!byPackID.empty) return doc(db, this.collectionName, byPackID.docs[0].id);

    throw new Error('Pack document not found for packId: ' + packId);
  }

  async updatePack(packId: string, update: UpdatePackRequest): Promise<void> {
    const docRef = await this.getDocRefByPackId(packId);
    const payload: any = { ...update };
    // Never update the identifier fields through this method
    delete payload.packId;
    delete payload.packID;
    await updateDoc(docRef, payload);
  }

  async deletePack(packId: string): Promise<void> {
    const docRef = await this.getDocRefByPackId(packId);
    await deleteDoc(docRef);
  }

  computeStats(packs: Pack[]): PackStats {
    const totalPacks = packs.length;
    const totalValue = packs.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const averagePrice = totalPacks ? totalValue / totalPacks : 0;
    const packsByRarity: Record<string, number> = {};
    let featuredPacks = 0;

    for (const p of packs) {
      packsByRarity[p.rarity] = (packsByRarity[p.rarity] || 0) + 1;
      if (p.isFeatured) featuredPacks += 1;
    }

    return {
      totalPacks,
      totalValue,
      averagePrice,
      packsByRarity,
      featuredPacks,
      lowStockAlerts: [],
    };
  }

  filterPacks(packs: Pack[], filters: PackFilters): Pack[] {
    let result = packs.filter((p) => {
      const q = (filters.search || '').toLowerCase();
      const matchesSearch = filters.search
        ? (
            (p.name || '').toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q) ||
            (p.stockNo || '').toLowerCase().includes(q)
          )
        : true;

      const matchesRarity = filters.rarity ? p.rarity === filters.rarity : true;
      const matchesMinPrice = filters.minPrice !== undefined ? Number(p.price) >= (filters.minPrice || 0) : true;
      const matchesMaxPrice = filters.maxPrice !== undefined ? Number(p.price) <= (filters.maxPrice || Number.MAX_SAFE_INTEGER) : true;
      const matchesFeatured = filters.isFeatured !== undefined ? p.isFeatured === filters.isFeatured : true;

      return matchesSearch && matchesRarity && matchesMinPrice && matchesMaxPrice && matchesFeatured;
    });

    // Sorting
    if (filters.sortBy) {
      const order = filters.sortOrder === 'desc' ? -1 : 1;
      const key = filters.sortBy;
      result.sort((a, b) => {
        let av: any = (a as any)[key];
        let bv: any = (b as any)[key];
        if (key === 'name' || key === 'rarity') {
          av = String(av || '').toLowerCase();
          bv = String(bv || '').toLowerCase();
        } else if (key === 'price') {
          av = Number(av || 0);
          bv = Number(bv || 0);
        }
        if (av < bv) return -1 * order;
        if (av > bv) return 1 * order;
        return 0;
      });
    }

    return result;
  }
}

export const firebasePackService = new FirebasePackService();
export default firebasePackService;