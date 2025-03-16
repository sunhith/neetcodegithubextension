chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "authenticate") {
      authenticateWithGitHub()
        .then(result => {
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
      const authURL = new URL(AUTH_URL);
      authURL.searchParams.set("client_id", CLIENT_ID);
      authURL.searchParams.set("redirect_uri", REDIRECT_URL);
      authURL.searchParams.set("scope", "repo");
      
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authURL.toString(),
        interactive: true
      });
      
      if (!responseUrl) {
        throw new Error("Authorization failed");
      }
      
      // Step 2: Extract the code from the response
      const url = new URL(responseUrl);
      const code = url.searchParams.get("code");
      
      if (!code) {
        throw new Error("No authorization code received");
      }
      
      // Step 3: Exchange the code for an access token
      // Note: This is a simplified version. In production, you should use a backend service
      // to exchange the code for a token to keep your client secret secure.
      const tokenData = await exchangeCodeForToken(code);
      
      if (!tokenData.access_token) {
        throw new Error("Failed to obtain access token");
      }
      
      // Step 4: Get user info to verify the token
      const userInfo = await fetchUserInfo(tokenData.access_token);
      
      // Step 5: Save the token and username
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
    // In production, replace this with a call to your backend service
    const CLIENT_ID = "Ov23li4V4m5TWEiLOOxb";
    const CLIENT_SECRET = "7066db70b932ebf7e04ab8a40db51543ab1f6158"; // This should be kept secure on a server
    
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
    
    return await response.json();
  }
  
  async function fetchUserInfo(token) {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });
    
    return await response.json();
  }
  