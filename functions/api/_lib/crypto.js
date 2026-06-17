// Shared crypto and HTTP utilities for the API.
// Runs on the Cloudflare Workers runtime (V8 isolate).

// --- CORS ---
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

// --- Response helpers ---
export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ ok: false, error: message }, status);
}

// --- PBKDF2 password hashing ---
// 100,000 iterations of SHA-256. Tuned for ~100ms on edge runtime.
export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    256
  );
}

// --- Constant-time comparison to prevent timing attacks ---
export function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// --- Session token generation (256-bit random) ---
export function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Session verification ---
// Reads the Authorization: Bearer <token> header and validates against KV.
export async function verifySession(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+([a-f0-9]{64})$/i);
  if (!match) return null;

  const token = match[1];
  const raw = await env.SOVEREIGN_KV.get(`session:${token}`);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    if (session.expiresAt && session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
