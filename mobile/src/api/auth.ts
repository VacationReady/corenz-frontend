import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;
const SESSION_TOKEN_KEY = "next-auth.session-token";

// Web fallback for SecureStore (which only works on native)
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export async function signInWithCredentials(email: string, password: string) {
  if (!API_BASE_URL) {
    console.error("❌ API_BASE_URL is not configured!");
    throw new Error("API configuration missing");
  }

  console.log("🔄 Attempting mobile login to:", `${API_BASE_URL}/api/auth/mobile-login`);
  console.log("📧 Email:", email);
  console.log("🌐 API Base URL:", API_BASE_URL);
  console.log("📱 Platform:", `${Platform.OS} ${Platform.Version}`);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/mobile-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log("📡 Response status:", response.status);

    const data = await response.json();
    console.log("📡 Response data:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("❌ Login failed:", data.error);
      throw new Error(data.error || "Login failed");
    }

    // Store the session token securely
    if (data.sessionToken) {
      await storage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
      console.log("✅ Session token stored successfully");
    } else {
      console.warn("⚠️ No session token in response");
    }

    console.log("✅ Login successful");
    return {
      user: data.user,
      expires: data.expires,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("❌ Login error:", error);
    console.error("❌ Error details:", {
      name: error?.name,
      message: error?.message,
      platform: `${Platform.OS} ${Platform.Version}`,
    });

    // Provide more specific error messages
    const errorMessage = error?.message || String(error);

    if (error?.name === "AbortError" || errorMessage.includes("timed out")) {
      throw new Error(
        `Request to ${API_BASE_URL} timed out. Make sure the backend is running and accessible.`
      );
    } else if (errorMessage.includes("Network request failed")) {
      throw new Error(
        `Unable to connect to ${API_BASE_URL}. Please check your network connection.`
      );
    } else {
      throw new Error(errorMessage);
    }
  }
}

export async function getSession() {
  if (!API_BASE_URL) {
    console.error("❌ API_BASE_URL is not configured!");
    throw new Error("API configuration missing");
  }

  // First check if we have a stored token
  const storedToken = await storage.getItem(SESSION_TOKEN_KEY);
  if (!storedToken) {
    console.log("📱 No stored session token");
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Validate session with the mobile-session endpoint (not NextAuth's /api/auth/session)
    const response = await fetch(`${API_BASE_URL}/api/auth/mobile-session`, {
      method: "GET",
      headers: {
        Cookie: `next-auth.session-token=${storedToken}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log("📱 Session validation failed, clearing token");
      await storage.deleteItem(SESSION_TOKEN_KEY);
      return null;
    }

    const session = await response.json();
    
    // If session is empty or has no user, clear the token
    if (!session || !session.user) {
      console.log("📱 Empty session response, clearing token");
      await storage.deleteItem(SESSION_TOKEN_KEY);
      return null;
    }

    console.log("✅ Session validated successfully");
    return session;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Error validating session:", error);
    // Don't clear the token on network errors - the token might still be valid
    // Only clear on explicit rejection from the server
    return null;
  }
}

export async function requestPasswordReset(email: string) {
  if (!API_BASE_URL) {
    console.error("❌ API_BASE_URL is not configured!");
    throw new Error("API configuration missing");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || "Unable to send reset email");
    }
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function signOut() {
  try {
    // Clear the stored session token
    await storage.deleteItem(SESSION_TOKEN_KEY);
    console.log("✅ Session token cleared");

    // Optionally notify the server (don't wait for response)
    if (API_BASE_URL) {
      fetch(`${API_BASE_URL}/api/auth/signout`, {
        method: "POST",
      }).catch(() => {
        // Ignore errors - the important thing is clearing local storage
      });
    }
  } catch (error) {
    console.error("Sign out error:", error);
  }
}

export async function getStoredSession(): Promise<string | null> {
  try {
    const token = await storage.getItem(SESSION_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error("Error getting stored session:", error);
    return null;
  }
}

export async function clearStoredSession(): Promise<void> {
  try {
    await storage.deleteItem(SESSION_TOKEN_KEY);
    console.log("✅ Stored session cleared");
  } catch (error) {
    console.error("Error clearing stored session:", error);
  }
}
