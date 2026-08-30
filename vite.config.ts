import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function localTokenApi(): PluginOption {
  return {
    name: 'local-livekit-token',
    apply: 'serve',
    configureServer(server) {
      // Load .env.local if present
      try {
        const envPath = path.resolve(__dirname, '.env.local');
        if (fs.existsSync(envPath)) {
          const txt = fs.readFileSync(envPath, 'utf8');
          for (const line of txt.split('\n')) {
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
            if (m && process.env[m[1]] === undefined) {
              process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
            }
          }
        }
      } catch (err) {
        console.warn('Could not read .env.local:', err);
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || (!req.url.startsWith('/api/token') && !req.url.startsWith('/api/livekit-token'))) {
          return next();
        }
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          return res.end();
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method not allowed');
        }
        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const mod = await server.ssrLoadModule('/api/token.ts');
          const webReq = new Request('http://localhost/api/token', {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
            body: Buffer.concat(chunks).toString() || '{}',
          });
          const webRes: Response = await mod.POST(webReq);
          res.statusCode = webRes.status;
          webRes.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(await webRes.text());
        } catch (e) {
          console.error('[localTokenApi] Error:', e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String((e as Error)?.message ?? e) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localTokenApi()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
