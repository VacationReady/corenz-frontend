import * as SecureStore from "expo-secure-store";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

export async function signInWithCredentials(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/callback/credentials?json=true`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password, redirect: "false" }).toString(),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  const cookie = response.headers.get("set-cookie");
  if (cookie) {
    await SecureStore.setItemAsync("next-auth.session-token", cookie);
  }

  return response.json();
}

export async function getSession() {
  const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Session expired");
  }

  return response.json();
}

export async function signOut() {
  try {
    await SecureStore.deleteItemAsync("next-auth.session-token");
    await fetch(`${API_BASE_URL}/api/auth/signout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Sign out error:", error);
  }
}

export async function getStoredSession() {
  try {
    const token = await SecureStore.getItemAsync("next-auth.session-token");
    return token;
  } catch (error) {
    console.error("Error getting stored session:", error);
    return null;
  }
}
