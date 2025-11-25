import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;
const SESSION_TOKEN_KEY = 'next-auth.session-token';
const SESSION_COOKIE_NAME = 'next-auth.session-token';

// Web fallback for SecureStore (which only works on native)
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
};

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

  // On web, use httpOnly cookies (sent automatically by browser)
  // On mobile, manually attach token as cookie header
  if (Platform.OS === 'web') {
    // Cookies are sent automatically by browser with credentials: "include"
    // No need to manually set Cookie header
    return fetch(resolveUrl(path), {
      ...init,
      headers,
      credentials: 'include', // Important: Include cookies automatically
    });
  } else {
    // Mobile: Manually attach token as cookie header
    const sessionToken = await storage.getItem(SESSION_TOKEN_KEY);
    if (sessionToken) {
      const cookie = `${SESSION_COOKIE_NAME}=${sessionToken}`;
      const existingCookie = headers.get('Cookie');
      headers.set('Cookie', existingCookie ? `${existingCookie}; ${cookie}` : cookie);
    }

    return fetch(resolveUrl(path), {
      ...init,
      headers,
      credentials: 'omit',
    });
  }
}

// API Client wrapper for easier usage
export const apiClient = {
  async get(path: string, config?: RequestInit) {
    const response = await apiFetch(path, {
      ...config,
      method: 'GET',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }
    
    return {
      data: await response.json(),
      status: response.status,
    };
  },

  async post(path: string, data?: any, config?: RequestInit) {
    const response = await apiFetch(path, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }
    
    return {
      data: await response.json(),
      status: response.status,
    };
  },

  async put(path: string, data?: any, config?: RequestInit) {
    const response = await apiFetch(path, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }
    
    return {
      data: await response.json(),
      status: response.status,
    };
  },

  async delete(path: string, config?: RequestInit) {
    const response = await apiFetch(path, {
      ...config,
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }
    
    return {
      data: await response.json(),
      status: response.status,
    };
  },
};
