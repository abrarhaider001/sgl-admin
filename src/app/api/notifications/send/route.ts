import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging, adminAuth } from '@/lib/firebase-admin';
import { SendNotificationRequest, SendNotificationResponse } from '@/types/notifications';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/notifications/send
 * Sends a push notification to a specific user via FCM.
 *
 * Security:
 * - Requires authenticated admin with `NOTIFICATIONS_WRITE` permission.
 *
 * Request body: SendNotificationRequest
 * Response body: SendNotificationResponse
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify Firebase ID token from Authorization header
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    if (!bearerToken) {
      const res: SendNotificationResponse = { ok: false, error: 'Missing Authorization Bearer token' };
      return NextResponse.json(res, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(bearerToken);
    } catch (e) {
      const res: SendNotificationResponse = { ok: false, error: 'Invalid or expired token' };
      return NextResponse.json(res, { status: 401 });
    }

    // Ensure the requester is an admin by checking Firestore admins collection
    const adminDoc = await adminDb.collection('admins').doc(decoded.uid).get();
    if (!adminDoc.exists) {
      const res: SendNotificationResponse = { ok: false, error: 'Forbidden: admin account not found' };
      return NextResponse.json(res, { status: 403 });
    }

    const body = (await request.json()) as Partial<SendNotificationRequest>;
    const { mode, userIds, title, body: msgBody } = body;

    if (!title || !msgBody) {
      const res: SendNotificationResponse = { ok: false, error: 'Missing required fields: title, body' };
      return NextResponse.json(res, { status: 400 });
    }

    // Helper to collect tokens from a user doc
    const collectTokensFromDoc = (docData: any, set: Set<string>) => {
      const d = docData as { fcmToken?: string; fcmTokens?: string[] };
      // Collect from array field, excluding blanks/whitespace-only
      if (Array.isArray(d?.fcmTokens)) {
        for (const t of d.fcmTokens) {
          if (typeof t === 'string') {
            const trimmed = t.trim();
            if (trimmed.length > 0) set.add(trimmed);
          }
        }
      }
      // Collect single token, excluding blanks/whitespace-only
      if (typeof d?.fcmToken === 'string') {
        const trimmed = d.fcmToken.trim();
        if (trimmed.length > 0) set.add(trimmed);
      }
    };

    // Resolve tokens depending on mode
    const tokens = new Set<string>();
    // Track which user a token came from (for pruning in specific mode)
    const tokenOwner = new Map<string, string>();

    // Helper: fetch users by optional filters (cities/states/countries, gender, points)
    const queryUsersByFilters = async (filters?: SendNotificationRequest['filters']) => {
      const col = adminDb.collection('users');
      const docs: any[] = [];
      const chunk = <T>(arr: T[], size: number): T[][] => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };
      const applyCommon = (q: any) => {
        let qq = q;
        if (filters?.gender) qq = qq.where('gender', '==', filters.gender);
        if (filters?.minPoints !== undefined) qq = qq.where('points', '>=', filters.minPoints);
        if (filters?.maxPoints !== undefined) qq = qq.where('points', '<=', filters.maxPoints);
        return qq;
      };
      if (filters?.cities && filters.cities.length) {
        for (const c of chunk(filters.cities, 10)) {
          const snap = await applyCommon(col.where('city', 'in', c)).get();
          snap.forEach((d: any) => docs.push(d));
        }
      } else if (filters?.states && filters.states.length) {
        for (const s of chunk(filters.states, 10)) {
          const snap = await applyCommon(col.where('state', 'in', s)).get();
          snap.forEach((d: any) => docs.push(d));
        }
      } else if (filters?.countries && filters.countries.length) {
        for (const co of chunk(filters.countries, 10)) {
          const snap = await applyCommon(col.where('country', 'in', co)).get();
          snap.forEach((d: any) => docs.push(d));
        }
      } else {
        const snap = await applyCommon(col).get();
        snap.forEach((d: any) => docs.push(d));
      }
      const unique = new Map<string, any>();
      docs.forEach((d: any) => unique.set(d.id, d));
      return Array.from(unique.values());
    };

    let targetUserIds: string[] = [];
    if (mode === 'global') {
      // Fetch users by filters and collect their tokens
      const filteredDocs = await queryUsersByFilters(body.filters);
      targetUserIds = filteredDocs.map((d: any) => d.id);
      for (const doc of filteredDocs) {
        const beforeSize = tokens.size;
        collectTokensFromDoc(doc.data(), tokens);
        const afterTokens = Array.from(tokens);
        if (tokens.size > beforeSize) {
          const newlyAdded = afterTokens.slice(beforeSize);
          for (const t of newlyAdded) {
            tokenOwner.set(t, doc.id);
          }
        }
      }
    } else {
      // Specific mode requires userIds
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        const res: SendNotificationResponse = { ok: false, error: 'Missing required fields: userIds[] for specific mode' };
        return NextResponse.json(res, { status: 400 });
      }
      targetUserIds = userIds;
      for (const uid of userIds) {
        try {
          const userDoc = await adminDb.collection('users').doc(uid).get();
          if (!userDoc.exists) continue;
          const beforeSize = tokens.size;
          collectTokensFromDoc(userDoc.data(), tokens);
          // Record ownership for any newly added tokens
          const afterTokens = Array.from(tokens);
          if (tokens.size > beforeSize) {
            const newlyAdded = afterTokens.slice(beforeSize);
            for (const t of newlyAdded) {
              tokenOwner.set(t, uid);
            }
          }
        } catch {
          continue;
        }
      }
    }

    const tokenList = Array.from(tokens);
    if (tokenList.length === 0) {
      const res: SendNotificationResponse = { ok: false, error: 'No valid FCM tokens found' };
      return NextResponse.json(res, { status: 400 });
    }

    // Chunk tokens to respect FCM limits (500 tokens per multicast)
    const chunkSize = 500;
    const chunks: string[][] = [];
    for (let i = 0; i < tokenList.length; i += chunkSize) {
      chunks.push(tokenList.slice(i, i + chunkSize));
    }

    let successCount = 0;
    let failureCount = 0;
    const failed: { token: string; code?: string; message?: string }[] = [];

    for (const tokensChunk of chunks) {
      const multicastMessage = {
        tokens: tokensChunk,
        notification: {
          title,
          body: msgBody,
        },
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'default',
            icon: 'ic_notification',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              contentAvailable: true,
            },
          },
        },
      };

      const batchResp = await adminMessaging.sendEachForMulticast(multicastMessage);
      successCount += batchResp.successCount;
      failureCount += batchResp.failureCount;

      // Collect detailed errors per token for better diagnostics
      batchResp.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const token = tokensChunk[idx];
          const code = (resp.error as any)?.code;
          const message = (resp.error as any)?.message;
          failed.push({ token, code, message });
        }
      });
    }

    // Optionally prune invalid tokens for both modes where ownership is known
    if (failureCount && tokenOwner.size > 0) {
      const removableCodes = new Set([
        'messaging/registration-token-not-registered',
        'messaging/invalid-argument',
        'messaging/invalid-recipient',
      ]);
      const removalsByUser: Record<string, string[]> = {};
      for (const f of failed) {
        if (f.code && removableCodes.has(f.code)) {
          const uid = tokenOwner.get(f.token);
          if (uid) {
            (removalsByUser[uid] ||= []).push(f.token);
          }
        }
      }
      // Apply removals
      for (const [uid, toks] of Object.entries(removalsByUser)) {
        try {
          const ref = adminDb.collection('users').doc(uid);
          const snap = await ref.get();
          if (snap.exists) {
            const data = snap.data() as { fcmToken?: string; fcmTokens?: string[] };
            let changed = false;
            // Remove from array field
            if (Array.isArray(data.fcmTokens)) {
              const filtered = data.fcmTokens.filter((t) => !toks.includes(t));
              if (filtered.length !== data.fcmTokens.length) {
                await ref.update({ fcmTokens: filtered });
                changed = true;
              }
            }
            // Clear single token if matches
            if (data.fcmToken && toks.includes(data.fcmToken)) {
              await ref.update({ fcmToken: '' });
              changed = true;
            }
            if (changed) {
              console.log(`Pruned ${toks.length} invalid FCM token(s) for user ${uid}`);
            }
          }
        } catch (e) {
          console.warn(`Failed pruning tokens for ${uid}:`, e);
        }
      }
    }

    // Create a more descriptive error summary
    let errorSummary: string | undefined;
    if (failureCount) {
      const byCode: Record<string, number> = {};
      for (const f of failed) {
        const code = f.code || 'unknown';
        byCode[code] = (byCode[code] || 0) + 1;
      }
      const parts = Object.entries(byCode).map(([c, n]) => `${c}: ${n}`);
      errorSummary = `Some tokens failed (${parts.join(', ')})`;
      console.warn('FCM send failures:', failed);
    }

    // Create notification documents in users/{id}/notifications for all targets
    try {
      if (targetUserIds.length > 0) {
        const payload = {
          title,
          body: msgBody,
          createdAt: FieldValue.serverTimestamp(),
          isRead: false,
        };
        const writeChunkSize = 500;
        for (let i = 0; i < targetUserIds.length; i += writeChunkSize) {
          const batch = adminDb.batch();
          const slice = targetUserIds.slice(i, i + writeChunkSize);
          for (const uid of slice) {
            const notifRef = adminDb.collection('users').doc(uid).collection('notifications').doc();
            batch.set(notifRef, payload);
          }
          await batch.commit();
        }
      }
    } catch (e) {
      console.warn('Failed to write notification subcollection documents:', e);
    }

    const res: SendNotificationResponse = {
      // Consider the operation successful if at least one target received the notification
      ok: successCount > 0,
      successCount,
      failureCount,
      error: errorSummary,
    };
    return NextResponse.json(res, { status: 200 });
  } catch (error: any) {
    console.error('Error sending notification:', error);

    // Map common FCM errors
    let message = 'Failed to send notification';
    if (error?.code === 'messaging/registration-token-not-registered') {
      message = 'FCM token is not registered';
    } else if (error?.code === 'messaging/invalid-argument') {
      message = 'Invalid FCM token or message payload';
    } else if (error?.message) {
      message = error.message;
    }

    const res: SendNotificationResponse = { ok: false, error: message };
    return NextResponse.json(res, { status: 500 });
  }
}