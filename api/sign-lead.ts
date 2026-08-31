// Vercel Node.js function: receives a waitlist form POST from the browser,
// signs the body with HMAC-SHA256 using the shared secret, and forwards
// to the LNL CRM generic leads webhook. Returns the CRM response so the
// front-end can react to success/failure.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

const CRM_URL = "https://lnlcrm.com/api/webhooks/leads";

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

function hmacSha256Hex(secret: string, message: string): string {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.LEAD_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(503).json({ error: "Signing proxy is not configured" });
  }

  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  const signature = hmacSha256Hex(secret, rawBody);

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
    res.setHeader("Content-Type", crmResponse.headers.get("content-type") ?? "application/json");
    return res.status(crmResponse.status).send(text);
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "CRM did not respond in time"
        : "Failed to reach CRM";
    return res.status(502).json({ error: message });
  }
}
