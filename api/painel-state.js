import { list, put } from '@vercel/blob';

const STATE_PATH = 'atrix/painel-state.json';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readState() {
  const found = await list({ prefix: STATE_PATH, limit: 1 });
  const blob = found.blobs.find((item) => item.pathname === STATE_PATH);
  if (!blob) return null;
  const response = await fetch(`${blob.url}?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Falha ao ler Blob: ${response.status}`);
  return response.json();
}

export default async function handler(req, res) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return json(res, 503, {
        ok: false,
        error: 'BLOB_READ_WRITE_TOKEN nao configurado no Vercel.',
      });
    }

    if (req.method === 'GET') {
      const state = await readState();
      return json(res, 200, { ok: true, state });
    }

    if (req.method === 'POST') {
      const state = req.body && typeof req.body === 'object' ? req.body : {};
      await put(STATE_PATH, JSON.stringify(state), {
        access: 'public',
        allowOverwrite: true,
        contentType: 'application/json; charset=utf-8',
      });
      return json(res, 200, { ok: true, savedAt: state.savedAt || new Date().toISOString() });
    }

    res.setHeader('allow', 'GET, POST');
    return json(res, 405, { ok: false, error: 'Metodo nao permitido.' });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || 'Erro interno.' });
  }
}
