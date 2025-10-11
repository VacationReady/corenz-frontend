import * as SecureStore from "expo-secure-store";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

export async function signInWithCredentials(email: string, password: string) {
  if (!API_BASE_URL) {
    console.error("❌ API_BASE_URL is not configured!");
    throw new Error("API configuration missing");
  }

  console.log("🔄 Attempting login to:", `${API_BASE_URL}/api/auth/callback/credentials`);
  console.log("📧 Email:", email);
  console.log("🌐 API Base URL:", API_BASE_URL);
  console.log("📱 Platform:", typeof navigator !== 'undefined' ? navigator.userAgent : 'React Native');

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ 
        email, 
        password, 
        json: "true",
        redirect: "false" 
      }).toString(),
    });

    console.log("📡 Response status:", response.status);
    console.log("📡 Response headers:", JSON.stringify(Object.fromEntries(response.headers.entries())));

    const responseText = await response.text();
    console.log("📡 Response body:", responseText);

    // NextAuth returns JSON when json=true parameter is used
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("❌ Failed to parse response as JSON");
      throw new Error("Invalid server response");
    }

    // Check if login was successful
    if (data.error) {
      console.error("❌ Login failed:", data.error);
      throw new Error(data.error || "Login failed");
    }

    // Extract and store session token from set-cookie header
    const setCookie = response.headers.get("set-cookie");
    console.log("🍪 Set-Cookie header:", setCookie);
    
    if (setCookie) {
      // Extract the session token from the cookie string
      const match = setCookie.match(/next-auth\.session-token=([^;]+)/);
      if (match) {
        await SecureStore.setItemAsync("next-auth.session-token", match[1]);
        console.log("✅ Session token stored");
      }
    }

    // Return success - the session will be validated on subsequent requests
    console.log("✅ Login successful");
    return { 
      user: { 
        email: email,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  } catch (error) {
    console.error("❌ Network error during login:", error);
    console.error("❌ Error details:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      apiUrl: `${API_BASE_URL}/api/auth/callback/credentials`,
      errorType: typeof error,
      errorKeys: error ? Object.keys(error) : []
    });
    
    // Provide more specific error messages
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("Network request failed")) {
      throw new Error(`Unable to connect to ${API_BASE_URL}. Please check:\n1. Server is running (npm run dev)\n2. IP address ${API_BASE_URL} is correct\n3. Phone and computer are on same WiFi`);
    } else if (errorMessage.includes("fetch")) {
      throw new Error("Connection error. Please ensure the server is running and accessible.");
    } else {
      throw new Error(`Login failed: ${errorMessage}`);
    }
  }
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
