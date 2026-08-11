/**
 * GitHub OAuth relay for the notes CMS.
 *
 * Why this exists: the admin page (Sveltia CMS) is static files with no
 * server, but GitHub's OAuth login requires a server-side secret to finish
 * the handshake — a browser page can never hold the client secret. This
 * Worker is that server. It does exactly two things:
 *
 *   GET /auth      → send the visitor to GitHub's login page
 *   GET /callback  → trade GitHub's one-time code for an access token and
 *                    hand the token back to the CMS popup window
 *
 * The token never touches this Worker's storage — it goes straight to the
 * CMS in the browser, which uses it to commit Markdown to the repo. Who may
 * publish is decided by GitHub (write access to the repo), not by anything
 * here.
 *
 * Speaks the Decap/Netlify OAuth popup protocol, which Sveltia implements.
 */

/** Only these sites may receive a token from the popup handshake. */
const ALLOWED_ORIGINS = ['https://notes.theoazriel.com'];

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
    if (url.pathname === '/auth') return startLogin(url, env);
    if (url.pathname === '/callback') return finishLogin(request, url, env);
    return new Response('CMS OAuth relay — nothing to browse here.', { status: 404 });
  },
};

/** Step 1: bounce the visitor to GitHub, carrying an anti-forgery state. */
function startLogin(url, env) {
  if (!env.GITHUB_CLIENT_ID) {
    return popupError('The relay is not configured yet: GITHUB_CLIENT_ID is empty.');
  }
  // random state ties the /callback to this /auth — a forged callback
  // without the matching cookie is rejected
  const state = crypto.randomUUID();
  const to = new URL(GITHUB_AUTHORIZE);
  to.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  to.searchParams.set('scope', 'repo');
  to.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: to.toString(),
      'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=600`,
    },
  });
}

/** Step 2: verify state, swap the code for a token, hand it to the popup. */
async function finishLogin(request, url, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = (request.headers.get('Cookie') ?? '')
    .match(/(?:^|;\s*)oauth_state=([^;]+)/)?.[1];

  if (!code) return popupError('GitHub sent no code.');
  if (!state || state !== cookieState) {
    return popupError('State mismatch — start the login again from the CMS.');
  }
  if (!env.GITHUB_CLIENT_SECRET) {
    return popupError('The relay is not configured yet: GITHUB_CLIENT_SECRET is not set.');
  }

  const res = await fetch(GITHUB_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) {
    return popupError(`GitHub refused the exchange: ${data.error_description ?? 'no token returned'}`);
  }
  return popupResult('success', { token: data.access_token, provider: 'github' });
}

/**
 * The Decap popup handshake, verbatim:
 *  1. this popup posts "authorizing:github" to the window that opened it
 *  2. the CMS replies with any message, revealing its origin
 *  3. if that origin is allowed, the popup posts the result and closes
 */
function popupResult(status, payload) {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const body = `<!doctype html><meta charset="utf-8"><title>Signing in…</title><script>
    (function () {
      var allowed = ${JSON.stringify(ALLOWED_ORIGINS)};
      if (!window.opener) { document.body.textContent = 'Open this from the CMS.'; return; }
      window.addEventListener('message', function reply(e) {
        if (!allowed.includes(e.origin)) return;
        window.removeEventListener('message', reply);
        window.opener.postMessage(${JSON.stringify(message)}, e.origin);
        window.close();
      });
      window.opener.postMessage('authorizing:github', '*');
    })();
  </script>`;
  return new Response(body, {
    // the one-time state cookie is spent either way
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': 'oauth_state=; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=0',
    },
  });
}

function popupError(reason) {
  return popupResult('error', { error: reason });
}
