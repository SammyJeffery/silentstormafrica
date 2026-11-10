/* ---------------------------------------------------------------
   Auth — single-author login backed by Netlify Database (/api/auth).
   Only the first person to sign up becomes the author; after that,
   sign-up is closed and everyone else can only log in.
   The server keeps the session in an HttpOnly cookie. The account's
   name/email are cached in sessionStorage so pages can check
   "logged in?" synchronously; Auth.verify() confirms with the server.
   --------------------------------------------------------------- */
const Auth = (() => {
  const SESSION_KEY = 'ss:session';
  const ACCOUNT_KEY = 'ss:account';

  function remember(author) {
    sessionStorage.setItem(SESSION_KEY, '1');
    sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify({ name: author.name, email: author.email }));
  }
  function forget() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ACCOUNT_KEY);
  }
  function post(path, body) {
    return fetch('/api/auth/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      credentials: 'same-origin'
    }).then(res => res.json().catch(() => ({})).then(data => {
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      return data;
    }));
  }

  return {
    getAccount() {
      try { return JSON.parse(sessionStorage.getItem(ACCOUNT_KEY)); } catch (e) { return null; }
    },

    // Resolves to { hasAuthor, author } straight from the server, and refreshes the local cache.
    verify() {
      return fetch('/api/auth', { credentials: 'same-origin' }).then(res => res.json()).then(data => {
        if (data.author) remember(data.author); else forget();
        return data;
      });
    },

    // Only succeeds when no author exists yet. Rejects with a readable message otherwise.
    signup(name, email, password) {
      return post('signup', { name, email, password }).then(d => remember(d.author));
    },

    login(email, password) {
      return post('login', { email, password }).then(d => remember(d.author));
    },

    logout() {
      forget();
      return post('logout').catch(() => {});
    },

    isLoggedIn() { return sessionStorage.getItem(SESSION_KEY) === '1'; }
  };
})();
