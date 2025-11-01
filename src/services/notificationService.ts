import { auth } from '@/lib/firebase';
import { SendNotificationRequest, SendNotificationResponse } from '@/types/notifications';

/**
 * Client Notification Service
 * Calls Next.js API route `/api/notifications/send` with a Firebase ID token
 * to send FCM push notifications to a specific user.
 */
export async function sendNotificationApi(
  payload: SendNotificationRequest
): Promise<SendNotificationResponse> {
  const user = auth.currentUser;
  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const idToken = await user.getIdToken();

  const response = await fetch('/api/notifications/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as SendNotificationResponse;
  return json;
}
