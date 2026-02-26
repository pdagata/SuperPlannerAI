// ─── Client-side Auth utilities ─────────────────────────────────────────────────────

const TOKEN_KEY = 'agileflow_token';
const USER_KEY  = 'agileflow_user';

export const authStorage = {
  saveSession(token: string, user: object) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser<T>(): T | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

/** Fetch wrapper that automatically injects the Bearer token */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    authStorage.clear();
    window.location.reload();
  }
  return res;
}
