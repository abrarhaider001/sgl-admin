import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/services/userService';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// GET /api/users - list users (supports basic filters via query params)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: any = {};
    const allowedFilterKeys = ['country', 'state', 'city', 'gender', 'minPoints', 'maxPoints'];
    for (const k of allowedFilterKeys) {
      const v = searchParams.get(k);
      if (v !== null) {
        filters[k] = k.includes('Points') ? Number(v) : v;
      }
    }
    const isInfluencerParam = searchParams.get('isInfluencer');
    const list = await userService.getUsers(filters);
    const users = isInfluencerParam == null ? list : list.filter(u => !!u.isInfluencer === (isInfluencerParam === 'true'));
    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users - create user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      country,
      state,
      city,
      gender,
      points,
      profileImagePath,
      isInfluencer,
    } = body || {};

    // Basic validation for Auth creation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password is required and must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Create Firebase Auth user (server-side via Admin SDK)
    const authUser = await adminAuth.createUser({
      email,
      password,
      displayName: `${String(firstName || '')} ${String(lastName || '')}`.trim(),
      emailVerified: false,
      disabled: false,
    });

    const uid = authUser.uid;
    const now = new Date().toISOString();

    // Prepare Firestore user document keyed by Auth UID
    const userDoc = {
      firstName: String(firstName || ''),
      lastName: String(lastName || ''),
      name: `${String(firstName || '')} ${String(lastName || '')}`.trim(),
      email: String(email),
      dateOfBirth: String(dateOfBirth || ''),
      country: String(country || ''),
      state: String(state || ''),
      city: String(city || ''),
      gender: String(gender || ''),
      points: Number(points || 0),
      profileImagePath: String(profileImagePath || ''),
      isInfluencer: !!isInfluencer,
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.collection('users').doc(uid).set(userDoc);

    return NextResponse.json({ success: true, userId: uid }, { status: 201 });
  } catch (error: any) {
    // Handle common Firebase Admin auth errors for friendlier messages
    const msg = typeof error?.message === 'string' ? error.message : 'Internal server error';
    const code = typeof error?.code === 'string' ? error.code : '';

    // If auth creation failed, try to map known errors
    if (code === 'auth/email-already-exists') {
      return NextResponse.json(
        { success: false, error: 'Email already in use' },
        { status: 400 }
      );
    }
    if (code === 'auth/invalid-password') {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}