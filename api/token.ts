// Vercel Edge function: mints a LiveKit access token for Sol reception agent calls.
// Accepts POST requests from TokenSource.endpoint('/api/token').

export const config = { runtime: "edge" };

import { AccessToken, RoomConfiguration } from "livekit-server-sdk";

const ORIGIN_ALLOWLIST = [
  /^https:\/\/solreception\.com$/,
  /^https:\/\/www\.solreception\.com$/,
  /^https:\/\/[a-z0-9-]*sol-reception[a-z0-9-]*\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && ORIGIN_ALLOWLIST.some((re) => re.test(origin)) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

interface TokenRequestBody {
  room_name?: string;
  participant_identity?: string;
  participant_name?: string;
  participant_metadata?: string;
  participant_attributes?: Record<string, string>;
  room_config?: Record<string, unknown>;
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !serverUrl) {
    return new Response(JSON.stringify({ error: "LiveKit is not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  let body: TokenRequestBody = {};
  try {
    body = (await req.json()) as TokenRequestBody;
  } catch {
    // default empty body
  }

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

  return new Response(
    JSON.stringify({ server_url: serverUrl, participant_token: participantToken }),
    { status: 201, headers: { "Content-Type": "application/json", ...cors } },
  );
}
