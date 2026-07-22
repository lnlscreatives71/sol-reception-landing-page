// Vercel Edge function: receives a waitlist form POST from the browser,
// signs the body with HMAC-SHA256 using the shared secret, and forwards
// to the LNL CRM generic leads webhook. Returns the CRM response so the
// front-end can react to success/failure.
//
// The secret lives in Vercel env vars only (LEAD_WEBHOOK_SECRET),
// never in the page. Same value lives on the CRM VPS at
// /var/www/lnl-crm/.env.

export const config = { runtime: "edge" };

const CRM_URL = "https://lnlcrm.com/api/webhooks/leads";

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

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

  const secret = process.env.LEAD_WEBHOOK_SECRET;
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "Signing proxy is not configured" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json", ...cors },
      },
    );
  }

  const rawBody = await req.text();
  const signature = await hmacSha256Hex(secret, rawBody);

  try {
    const crmResponse = await fetch(CRM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await crmResponse.text();
    return new Response(text, {
      status: crmResponse.status,
      headers: {
        "Content-Type":
          crmResponse.headers.get("content-type") ?? "application/json",
        ...cors,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "CRM did not respond in time"
        : "Failed to reach CRM";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
}
