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
          const rawBody = Buffer.concat(chunks).toString() || '{}';
          let parsedBody = {};
          try { parsedBody = JSON.parse(rawBody); } catch { /* ignore */ }
          const mockReq: any = {
            method: 'POST',
            headers: req.headers,
            body: parsedBody,
          };
          const mockRes: any = {
            statusCode: 200,
            setHeader(k: string, v: string) { res.setHeader(k, v); },
            status(code: number) { this.statusCode = code; res.statusCode = code; return this; },
            json(data: any) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(data)); },
            end(data?: any) { res.end(data); }
          };
          await mod.default(mockReq, mockRes);
        } catch (e) {
          console.error('[localTokenApi] Error:', e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String((e as Error)?.message ?? e) }));
        }
      });
    },
  };
}

function getHtmlEntries(dir: string, baseDir = dir): Record<string, string> {
  const entries: Record<string, string> = {};
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name === 'node_modules' || item.name === 'dist' || item.name === '.git' || item.name === '.vercel') continue;
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        Object.assign(entries, getHtmlEntries(fullPath, baseDir));
      } else if (item.isFile() && item.name.endsWith('.html')) {
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        const name = relPath === 'index.html' ? 'main' : relPath.replace(/\.html$/, '').replace(/\//g, '_');
        entries[name] = fullPath;
      }
    }
  } catch (e) {
    console.warn('Error reading HTML entries:', e);
  }
  return entries;
}

export default defineConfig({
  plugins: [react(), localTokenApi()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: getHtmlEntries(__dirname),
    },
  },
});
