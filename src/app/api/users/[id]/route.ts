import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid user id' },
        { status: 400 }
      );
    }

    let deletedDoc = false;
    let deletedAuth = false;

    try {
      const userRef = adminDb.collection('users').doc(id);
      const cardsRef = userRef.collection('cardsOwned');
      const cardDocs = await cardsRef.listDocuments();
      if (cardDocs.length) {
        await Promise.all(cardDocs.map((d) => d.delete()));
      }
      await userRef.delete();
      deletedDoc = true;
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (!msg.toLowerCase().includes('not found')) {
        console.warn('Firestore user delete warning:', msg);
      }
    }

    try {
      await adminAuth.deleteUser(id);
      deletedAuth = true;
    } catch (e: any) {
      const code = String(e?.code || '');
      if (code === 'auth/user-not-found') {
        deletedAuth = false;
      } else {
        const msg = String(e?.message || 'Failed to delete auth user');
        return NextResponse.json(
          { success: false, deletedDoc, deletedAuth, error: msg },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, deletedDoc, deletedAuth });
  } catch (error: any) {
    const msg = String(error?.message || 'Internal server error');
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
