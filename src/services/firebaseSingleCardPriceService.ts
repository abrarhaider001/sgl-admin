import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type SingleCardPriceDoc = {
  id?: string;
  pricePerCard?: string;
};

class FirebaseSingleCardPriceService {
  private collectionName = 'singleCardPrice';

  async getCurrentPrice(): Promise<SingleCardPriceDoc | null> {
    try {
      const colRef = collection(db, this.collectionName);
      const snap = await getDocs(colRef);
      if (snap.empty) return null;
      const first = snap.docs[0];
      const data = first.data() as any;
      return { id: first.id, pricePerCard: data.pricePerCard };
    } catch (e) {
      console.error('Failed to load single card price:', e);
      throw e;
    }
  }

  async updatePrice(pricePerCard: string, id?: string): Promise<string> {
    try {
      if (id) {
        const ref = doc(db, this.collectionName, id);
        await updateDoc(ref, { pricePerCard });
        return id;
      }
      const colRef = collection(db, this.collectionName);
      const added = await addDoc(colRef, { pricePerCard });
      return added.id;
    } catch (e) {
      console.error('Failed to update single card price:', e);
      throw e;
    }
  }
}

const firebaseSingleCardPriceService = new FirebaseSingleCardPriceService();
export default firebaseSingleCardPriceService;