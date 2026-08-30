// Vercel Node.js Serverless Function: mints a LiveKit access token for Sol reception agent calls.
// Accepts POST requests from TokenSource.endpoint('/api/token').

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AccessToken, RoomConfiguration } from "livekit-server-sdk";

const ORIGIN_ALLOWLIST = [
  /^https:\/\/solreception\.com$/,
  /^https:\/\/www\.solreception\.com$/,
  /^https:\/\/[a-z0-9-]*sol-reception[a-z0-9-]*\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
];

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | undefined;
  const allowed = origin && ORIGIN_ALLOWLIST.some((re) => re.test(origin)) ? origin : "";
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
  res.setHeader("Vary", "Origin");
}

interface TokenRequestBody {
  room_name?: string;
  participant_identity?: string;
  participant_name?: string;
  participant_metadata?: string;
  participant_attributes?: Record<string, string>;
  room_config?: Record<string, unknown>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !serverUrl) {
    return res.status(503).json({ error: "LiveKit is not configured" });
  }

  const body: TokenRequestBody = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const stamp = Date.now();
  const roomName = body.room_name || `sol-reception-${stamp}`;
  const identity = body.participant_identity || `web-${stamp}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: body.participant_name || "Web visitor",
    metadata: body.participant_metadata || "",
    attributes: body.participant_attributes || {},
    ttl: "15m",
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  if (body.room_config) {
    at.roomConfig = RoomConfiguration.fromJson(
      body.room_config as Parameters<typeof RoomConfiguration.fromJson>[0],
    );
  } else {
    // Default dispatch to sol-reception agent if room_config wasn't passed explicitly
    at.roomConfig = RoomConfiguration.fromJson({
      agents: [{ agent_name: "sol-reception" }],
    });
  }

  const participantToken = await at.toJwt();

  return res.status(201).json({
    server_url: serverUrl,
    participant_token: participantToken,
  });
}
