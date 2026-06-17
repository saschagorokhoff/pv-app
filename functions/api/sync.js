// /api/sync
// GET  — retrieve all synced data for the authenticated user
// POST — write/update data (full document replacement, last-write-wins)

import { jsonResponse, errorResponse, corsHeaders, verifySession } from './_lib/crypto.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet({ request, env }) {
  const session = await verifySession(request, env);
  if (!session) return errorResponse('Unauthorized', 401);

  const raw = await env.SOVEREIGN_KV.get('user:data');
  const data = raw ? JSON.parse(raw) : {};

  return jsonResponse({ ok: true, data, updatedAt: data.__updatedAt || 0 });
}

export async function onRequestPost({ request, env }) {
  const session = await verifySession(request, env);
  if (!session) return errorResponse('Unauthorized', 401);

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid payload', 400);
    }

    // Last-write-wins. Add a server timestamp.
    const record = { ...body, __updatedAt: Date.now() };
    await env.SOVEREIGN_KV.put('user:data', JSON.stringify(record));

    return jsonResponse({ ok: true, updatedAt: record.__updatedAt });
  } catch (err) {
    return errorResponse('Sync failed: ' + err.message, 500);
  }
}
