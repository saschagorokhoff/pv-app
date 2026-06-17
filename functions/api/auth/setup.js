// POST /api/auth/setup
// First-time password creation. Stores PBKDF2 hash in KV.
// Returns a session token that the client stores for subsequent requests.

import { hashPassword, generateToken, jsonResponse, errorResponse, corsHeaders } from '../_lib/crypto.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string' || password.length < 6) {
      return errorResponse('Password must be at least 6 characters', 400);
    }

    // Check if user already exists
    const existing = await env.SOVEREIGN_KV.get('user:auth');
    if (existing) {
      return errorResponse('Setup already complete. Use /login instead.', 409);
    }

    // Hash the password with PBKDF2
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await hashPassword(password, salt);

    // Store the credentials
    const authRecord = {
      salt: Array.from(salt),
      hash: Array.from(new Uint8Array(hash)),
      createdAt: Date.now()
    };
    await env.SOVEREIGN_KV.put('user:auth', JSON.stringify(authRecord));

    // Generate a session token
    const token = generateToken();
    const session = {
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 365 // 1 year
    };
    await env.SOVEREIGN_KV.put(`session:${token}`, JSON.stringify(session), {
      expirationTtl: 60 * 60 * 24 * 365
    });

    return jsonResponse({ ok: true, token });
  } catch (err) {
    return errorResponse('Setup failed: ' + err.message, 500);
  }
}
