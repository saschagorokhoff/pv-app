// POST /api/align
// Proxies requests to the Anthropic API using a server-stored secret key.
// This keeps the API key off the client and out of the bundle.

import { jsonResponse, errorResponse, corsHeaders, verifySession } from './_lib/crypto.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  // Require authenticated session
  const session = await verifySession(request, env);
  if (!session) return errorResponse('Unauthorized', 401);

  // Verify API key is configured
  if (!env.ANTHROPIC_API_KEY) {
    return errorResponse('Frequency Engine not configured — API key missing', 503);
  }

  try {
    const body = await request.json();
    const { input, systemPrompt } = body;

    if (!input || typeof input !== 'string') {
      return errorResponse('Input text required', 400);
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt || 'You are a wise, compassionate, sovereign transmission voice.',
        messages: [{ role: 'user', content: input }]
      })
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      return errorResponse(`Anthropic API error: ${anthropicResponse.status} — ${errText}`, 502);
    }

    const data = await anthropicResponse.json();
    return jsonResponse({ ok: true, content: data.content });
  } catch (err) {
    return errorResponse('Transmission failed: ' + err.message, 500);
  }
}
