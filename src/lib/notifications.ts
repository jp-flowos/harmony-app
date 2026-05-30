// Push notification infrastructure
// Uses lazy init pattern — builds without environment variables

export type NotificationType = "meeting_reminder" | "new_chat" | "review_request" | "announcement";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
}

export interface PushSubscription {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
}

// Lazy-initialized web-push wrapper
let webPushInitialized = false;

function initWebPush(): boolean {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
    console.warn("[notifications] VAPID keys not configured — push disabled");
    return false;
  }
  webPushInitialized = true;
  return true;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<boolean> {
  if (!webPushInitialized && !initWebPush()) {
    console.warn("[notifications] Push not available — skipping send");
    return false;
  }

  // In production, this would use web-push or FCM SDK
  console.log(`[notifications] Sending to ${subscription.userId}:`, payload.title);
  return true;
}

export async function sendBulkNotification(
  subscriptions: PushSubscription[],
  payload: NotificationPayload
): Promise<number> {
  let sent = 0;
  for (const sub of subscriptions) {
    const ok = await sendPushNotification(sub, payload);
    if (ok) sent++;
  }
  return sent;
}

// Notification message templates
export function createMeetingReminder(meetingName: string, startTime: string): NotificationPayload {
  return {
    type: "meeting_reminder",
    title: "모임 시작 1시간 전",
    body: `${meetingName}이(가) ${startTime}에 시작됩니다`,
    url: "/club",
  };
}

export function createNewChatNotification(senderName: string): NotificationPayload {
  return {
    type: "new_chat",
    title: "새 메시지",
    body: `${senderName}님이 메시지를 보냈습니다`,
    url: "/chat",
  };
}

export function createReviewRequestNotification(meetingName: string): NotificationPayload {
  return {
    type: "review_request",
    title: "후기를 남겨주세요",
    body: `${meetingName} 모임은 어떠셨나요?`,
    url: "/mypage",
  };
}

export function createAnnouncementNotification(title: string, body: string): NotificationPayload {
  return {
    type: "announcement",
    title,
    body,
    url: "/",
  };
}

// User notification preferences
export interface NotificationSettings {
  meetingReminder: boolean;
  newChat: boolean;
  reviewRequest: boolean;
  announcement: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  meetingReminder: true,
  newChat: true,
  reviewRequest: true,
  announcement: true,
};

// --- Client-side push subscription ---
// Invoked only in the browser (from NotificationOptInCard). The browser globals
// are touched lazily, so importing this module on the server stays safe.

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/**
 * Subscribes the current browser to Web Push and registers the subscription
 * with the API. Returns false (without throwing) when push is unavailable —
 * no VAPID key, no service worker support, or no active registration.
 */
export async function subscribeUser(): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const json = subscription.toJSON();
  const res = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "subscribe", endpoint: json.endpoint, keys: json.keys }),
  });
  return res.ok;
}
