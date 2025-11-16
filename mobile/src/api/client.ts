import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (!API_BASE_URL) {
    throw new Error(
      'API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL in mobile/.env to point to your backend.'
    );
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function shouldAttachJsonHeader(init?: RequestInit) {
  if (!init || !('body' in init)) {
    return false;
  }

  return !!init.body && !(init.headers && new Headers(init.headers).has('Content-Type'));
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});

  if (shouldAttachJsonHeader(init)) {
    headers.set('Content-Type', 'application/json');
  }

  const sessionToken = await SecureStore.getItemAsync('next-auth.session-token');
  if (sessionToken) {
    const cookie = `next-auth.session-token=${sessionToken}`;
    const existingCookie = headers.get('Cookie');
    headers.set('Cookie', existingCookie ? `${existingCookie}; ${cookie}` : cookie);
  }

  return fetch(resolveUrl(path), {
    ...init,
    headers,
    credentials: 'omit',
  });
}
