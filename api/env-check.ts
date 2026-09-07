import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const lkKeys = Object.keys(process.env).filter(
    (k) => k.toUpperCase().includes("LIVEKIT") || k.toUpperCase().includes("SOL")
  );
  return res.status(200).json({
    LIVEKIT_URL_configured: Boolean(process.env.LIVEKIT_URL),
    LIVEKIT_API_KEY_configured: Boolean(process.env.LIVEKIT_API_KEY),
    LIVEKIT_API_SECRET_configured: Boolean(process.env.LIVEKIT_API_SECRET),
    detected_key_names: lkKeys,
  });
}
