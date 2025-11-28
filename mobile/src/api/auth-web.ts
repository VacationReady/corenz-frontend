import { Platform } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

/**
 * Web-specific authentication using httpOnly cookies.
 * This is more secure than localStorage as cookies are not accessible to JavaScript.
 * 
 * Note: This only works on web platform. For native mobile, use auth.ts instead.
 */
export async function signInWithCredentials(email: string, password: string) {
  if (!API_BASE_URL) {
    console.error("❌ API_BASE_URL is not configured!");
    throw new Error("API configuration missing");
  }

  if (Platform.OS !== "web") {
    throw new Error("This function is only for web platform. Use signInWithCredentials from auth.ts for mobile.");
  }

  console.log("🔄 Attempting web login to:", `${API_BASE_URL}/api/auth/web-login`);
  console.log("📧 Email:", email);
  console.log("🌐 API Base URL:", API_BASE_URL);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/web-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
      credentials: "include", // Important: Include cookies
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

    // Cookie is automatically set by browser (httpOnly, not accessible to JS)
    console.log("✅ Login successful - session cookie set");

    return {
      user: data.user,
      expires: data.expires,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("❌ Login error:", error);

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

  if (Platform.OS !== "web") {
    throw new Error("This function is only for web platform.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Cookie is automatically sent by browser
    const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
      method: "GET",
      credentials: "include", // Important: Include cookies
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log("📱 Session validation failed");
      return null;
    }

    const session = await response.json();
    
    if (!session || !session.user) {
      console.log("📱 Empty session response");
      return null;
    }

    return session;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Error validating session:", error);
    return null;
  }
}

export async function signOut() {
  if (!API_BASE_URL) {
    return;
  }

  try {
    // Clear cookie by calling signout endpoint
    await fetch(`${API_BASE_URL}/api/auth/signout`, {
      method: "POST",
      credentials: "include",
    });
    console.log("✅ Session cookie cleared");
  } catch (error) {
    console.error("Sign out error:", error);
  }
}









