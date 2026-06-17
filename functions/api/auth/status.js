// GET /api/auth/status
// Returns whether the app has been set up yet (so the client knows to show
// the setup flow vs the login flow on first open).

import { jsonResponse, corsHeaders } from '../_lib/crypto.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet({ env }) {
  const existing = await env.SOVEREIGN_KV.get('user:auth');
  return jsonResponse({ setupComplete: !!existing });
}
