// Vercel Serverless Function: LiveKit Webhook Handler for Sol Reception
// Receives room and participant lifecycle events from LiveKit Cloud,
// validates the cryptographic signature, and enforces automatic room cleanup.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { WebhookReceiver, RoomServiceClient } from "livekit-server-sdk";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf-8");
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.LIVEKIT_API_KEY || process.env.SOL_RECEPTION_LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET || process.env.SOL_RECEPTION_LIVEKIT_API_SECRET;
  const serverUrl =
    process.env.LIVEKIT_URL ||
    process.env.SOL_RECEPTION_LIVEKIT_URL ||
    "wss://sol-reception-jf7xerwe.livekit.cloud";

  if (!apiKey || !apiSecret || !serverUrl) {
    const missing: string[] = [];
    if (!apiKey) missing.push("LIVEKIT_API_KEY");
    if (!apiSecret) missing.push("LIVEKIT_API_SECRET");
    if (!serverUrl) missing.push("LIVEKIT_URL");
    console.error("[livekit-webhook] Missing LIVEKIT credentials:", missing);
    return res.status(500).json({ error: "LiveKit server credentials missing", missing });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.warn("[livekit-webhook] Missing Authorization header.");
    return res.status(401).json({ error: "Missing authorization header" });
  }

  let event;
  try {
    const rawBody = await getRawBody(req);
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    event = await receiver.receive(rawBody, authHeader);
  } catch (err) {
    console.error("[livekit-webhook] Signature verification failed:", err);
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  const eventName = event.event;
  const room = event.room;
  const participant = event.participant;

  console.log(`[livekit-webhook] Received event '${eventName}' for room '${room?.name}'`);

  try {
    const roomService = new RoomServiceClient(serverUrl, apiKey, apiSecret);

    switch (eventName) {
      case "room_started":
        console.log(`[livekit-webhook] Room started: ${room?.name} (sid: ${room?.sid})`);
        break;

      case "participant_joined":
        console.log(
          `[livekit-webhook] Participant joined room '${room?.name}': ${participant?.identity} (${participant?.name || "unnamed"})`
        );
        break;

      case "participant_left": {
        console.log(
          `[livekit-webhook] Participant left room '${room?.name}': ${participant?.identity} (reason: ${participant?.disconnectReason})`
        );

        // Guard against abandoned rooms: if the user left, check remaining participants
        if (room?.name) {
          try {
            const activeParticipants = await roomService.listParticipants(room.name);
            // Count human participants (exclude agent if named sol-reception or agent_*)
            const nonAgents = activeParticipants.filter(
              (p) => !p.identity.startsWith("agent-") && p.identity !== "sol-reception"
            );

            if (nonAgents.length === 0) {
              console.log(
                `[livekit-webhook] No caller participants remain in room '${room.name}'. Deleting room to prevent dead air.`
              );
              await roomService.deleteRoom(room.name);
            }
          } catch (deleteErr: any) {
            // Room may have already been closed or deleted
            console.log(`[livekit-webhook] Room cleanup note for '${room.name}': ${deleteErr?.message || deleteErr}`);
          }
        }
        break;
      }

      case "room_finished":
        console.log(
          `[livekit-webhook] Room finished: ${room?.name} (duration: ${room?.numParticipants} participants logged)`
        );
        break;

      default:
        console.log(`[livekit-webhook] Unhandled event: ${eventName}`);
        break;
    }
  } catch (handlerErr) {
    console.error("[livekit-webhook] Error processing webhook event:", handlerErr);
  }

  // Always return 200 OK so LiveKit does not retry
  return res.status(200).json({ received: true, event: eventName });
}
