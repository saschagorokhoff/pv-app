// POST /api/auth/login
// Validates password against stored hash, returns session token.

import { hashPassword, generateToken, jsonResponse, errorResponse, corsHeaders, constantTimeEqual } from '../_lib/crypto.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return errorResponse('Password required', 400);
    }

    const raw = await env.SOVEREIGN_KV.get('user:auth');
    if (!raw) {
      return errorResponse('No account found — setup required', 404);
    }

    const auth = JSON.parse(raw);
    const salt = new Uint8Array(auth.salt);
    const expectedHash = new Uint8Array(auth.hash);
    const actualHash = new Uint8Array(await hashPassword(password, salt));

    if (!constantTimeEqual(expectedHash, actualHash)) {
      // Small artificial delay to prevent brute-force timing attacks
      await new Promise(r => setTimeout(r, 200));
      return errorResponse('Incorrect password', 401);
    }

    // Generate fresh session token
    const token = generateToken();
    const session = {
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 365
    };
    await env.SOVEREIGN_KV.put(`session:${token}`, JSON.stringify(session), {
      expirationTtl: 60 * 60 * 24 * 365
    });

    return jsonResponse({ ok: true, token });
  } catch (err) {
    return errorResponse('Login failed: ' + err.message, 500);
  }
}
