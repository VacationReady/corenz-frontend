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
    const response = await fetch(`${API_BASE_URL}/api/auth/callback/credentials?json=true`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email, password, redirect: "false" }).toString(),
      credentials: "include",
      redirect: "manual", // Don't auto-follow redirects
    });

    console.log("📡 Response status:", response.status);
    console.log("📡 Response ok:", response.ok);

    // 302 redirects indicate successful auth in NextAuth
    // Also accept 2xx status codes
    if (!response.ok && response.status !== 302) {
      console.error("❌ Login failed with status:", response.status);
      const text = await response.text();
      console.error("❌ Response body:", text);
      throw new Error("Login failed");
    }

    const cookie = response.headers.get("set-cookie");
    console.log("🍪 Cookie received:", cookie ? "YES" : "NO");
    
    if (cookie) {
      await SecureStore.setItemAsync("next-auth.session-token", cookie);
      console.log("✅ Session token stored");
    }

    // For redirects, we need to fetch the actual session
    if (response.status === 302) {
      console.log("✅ Login successful (302 redirect), fetching session...");
      
      try {
        // Get the actual session after successful redirect
        const sessionResponse = await fetch(`${API_BASE_URL}/api/auth/session`, {
          credentials: "include",
          headers: cookie ? { "Cookie": cookie } : {},
        });
        
        console.log("📡 Session response status:", sessionResponse.status);
        
        if (!sessionResponse.ok) {
          console.warn("⚠️ Session fetch failed, but login was successful");
          // Return a minimal session object since login succeeded
          return { 
            user: { 
              email: email,
              // Add other user fields as needed
            },
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
          };
        }
        
        const session = await sessionResponse.json();
        console.log("✅ Session retrieved:", JSON.stringify(session, null, 2));
        return session;
      } catch (sessionError) {
        console.warn("⚠️ Session fetch error, but login was successful:", sessionError);
        // Return a minimal session object since login succeeded
        return { 
          user: { 
            email: email,
            // Add other user fields as needed
          },
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        };
      }
    }

    console.log("✅ Login successful (2xx)");
    return response.json();
  } catch (error) {
    console.error("❌ Network error during login:", error);
    console.error("❌ Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      apiUrl: `${API_BASE_URL}/api/auth/callback/credentials`
    });
    
    // Provide more specific error messages
    if (error.message.includes("Network request failed")) {
      throw new Error("Unable to connect to server. Please check your internet connection and try again.");
    } else if (error.message.includes("fetch")) {
      throw new Error("Connection error. Please ensure the server is running and accessible.");
    } else {
      throw new Error(`Login failed: ${error.message}`);
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
