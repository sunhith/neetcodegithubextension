console.log("Background service worker started");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);

  if (request.action === "authenticate") {
    console.log("Starting GitHub authentication");
    authenticateWithGitHub()
      .then(result => {
        console.log("Authentication result:", result);
        sendResponse(result);
      })
      .catch(error => {
        console.error("Authentication error:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

async function authenticateWithGitHub() {
  const CLIENT_ID = "Ov23li4V4m5TWEiLOOxb"; // Replace with your GitHub OAuth App client ID
  const REDIRECT_URL = chrome.identity.getRedirectURL();
  const AUTH_URL = "https://github.com/login/oauth/authorize";
  const TOKEN_URL = "https://github.com/login/oauth/access_token";

  try {
    // Step 1: Get the authorization code
    console.log("Building auth URL with redirect:", REDIRECT_URL);
    const authURL = new URL(AUTH_URL);
    authURL.searchParams.set("client_id", CLIENT_ID);
    authURL.searchParams.set("redirect_uri", REDIRECT_URL);
    authURL.searchParams.set("scope", "repo");
    
    console.log("Launching web auth flow");
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authURL.toString(),
      interactive: true
    });
    
    if (!responseUrl) {
      console.error("No response URL received");
      throw new Error("Authorization failed");
    }
    console.log("Received response URL");

    // Step 2: Extract the code from the response
    const url = new URL(responseUrl);
    const code = url.searchParams.get("code");
    if (!code) {
      console.error("No authorization code in response");
      throw new Error("No authorization code received");
    }
    console.log("Extracted authorization code");

    // Step 3: Exchange the code for an access token
    console.log("Exchanging code for token");
    const tokenData = await exchangeCodeForToken(code);
    if (!tokenData.access_token) {
      console.error("No access token in response:", tokenData);
      throw new Error("Failed to obtain access token");
    }
    console.log("Received access token");

    // Step 4: Get user info to verify the token
    console.log("Fetching user info");
    const userInfo = await fetchUserInfo(tokenData.access_token);
    console.log("User info retrieved for:", userInfo.login);

    // Step 5: Save the token and username
    console.log("Saving token and username to storage");
    await chrome.storage.local.set({
      githubToken: tokenData.access_token,
      username: userInfo.login
    });
    
    return {
      success: true,
      token: tokenData.access_token,
      username: userInfo.login
    };
  } catch (error) {
    console.error("GitHub authentication error:", error);
    return { success: false, error: error.message };
  }
}

// This function would typically call your backend service
// For demo purposes, we're implementing a direct exchange which is NOT secure for production
async function exchangeCodeForToken(code) {
  console.log("Exchanging code for token");
  // In production, replace this with a call to your backend service
  const CLIENT_ID = "Ov23li4V4m5TWEiLOOxb";
  const CLIENT_SECRET = "7066db70b932ebf7e04ab8a40db51543ab1f6158"; // This should be kept secure on a server
  
  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code
      })
    });
    
    const data = await response.json();
    console.log("Token exchange response:", data.access_token ? "Success" : "Failed");
    return data;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw error;
  }
}

async function fetchUserInfo(token) {
  console.log("Fetching user info with token");
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });
    
    const data = await response.json();
    console.log("User info response:", data.login ? "Success" : "Failed");
    return data;
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw error;
  }
}
