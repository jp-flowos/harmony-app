import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-utils";
import type { NotificationPayload, PushSubscription } from "@/lib/notifications";
import { DEFAULT_NOTIFICATION_SETTINGS, sendBulkNotification } from "@/lib/notifications";

// In-memory store (would use DB)
const subscriptions: PushSubscription[] = [];

export async function GET() {
  return jsonResponse({
    subscriptionCount: subscriptions.length,
    defaultSettings: DEFAULT_NOTIFICATION_SETTINGS,
  });
}

// Subscribe to push notifications
export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const action = body.action as string | undefined;

  if (action === "subscribe") {
    const endpoint = body.endpoint as string | undefined;
    const keys = body.keys as { p256dh: string; auth: string } | undefined;
    if (!endpoint || !keys) {
      return errorResponse("endpoint and keys are required");
    }
    const sub: PushSubscription = {
      userId: (body.userId as string | undefined) ?? "anonymous",
      endpoint,
      keys,
      createdAt: new Date().toISOString(),
    };
    subscriptions.push(sub);
    return jsonResponse({ subscribed: true }, 201);
  }

  if (action === "send") {
    const payload = body.payload as NotificationPayload | undefined;
    if (!payload) return errorResponse("payload is required");
    const sent = await sendBulkNotification(subscriptions, payload);
    return jsonResponse({ sent });
  }

  return errorResponse("Invalid action. Use 'subscribe' or 'send'");
}
