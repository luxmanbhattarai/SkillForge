// app/api/webhooks/clerk/route.ts
import { verifyWebhook } from "@clerk/backend/webhooks";

export async function POST(request: Request) {
  let event;
  try {
    // verifyWebhook reads the signing secret from
    // CLERK_WEBHOOK_SIGNING_SECRET; it throws on a bad signature.
    event = await verifyWebhook(request);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  // event.type is e.g. "user.created"; upsert by event.data.id and
  // dedupe on the Svix message id — deliveries are at-least-once.
  return new Response("ok");
}
