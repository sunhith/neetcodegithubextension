console.log("Content script loaded");

// Flag to track if the script has already been injected
if (!window.contentScriptInjected) {
  console.log("Setting up content script (first time)");
  window.contentScriptInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request);
    
    if (request.action === 'ping') {
      console.log("Received ping, responding");
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'sync') {
      console.log("Received sync request for repo:", request.repoName);
      extractCode()
        .then(code => {
          console.log("Code extraction result:", code ? "Success" : "Failed");
          if (!code) {
            sendResponse({ success: false, message: "No code found to sync" });
            return;
          }
          return syncWithGitHub(code, request.repoName);
        })
        .then(result => {
          console.log("Sync result:", result);
          sendResponse(result);
        })
        .catch(error => {
          console.error("Error in sync process:", error);
          sendResponse({ success: false, message: `Error: ${error.message}` });
        });
      return true; // Keep the message channel open for async response
    }
  });

  function extractCode() {
    return new Promise(resolve => {
      console.log("Extracting code...");
      const editor = document.querySelector('.monaco-editor');
      if (!editor) {
        console.log("No editor found on page");
        return resolve(null);
      }

      // Create and inject the script
      console.log("Injecting code extraction script");
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('inject.js');
      document.head.appendChild(script);
      
      // Listen for the message from inject.js
      function handleMessage(event) {
        if (event.data && event.data.action === 'code') {
          console.log("Received code from inject.js:", event.data.code ? "Success" : "Failed");
          window.removeEventListener('message', handleMessage);
          resolve(event.data.code);
        }
      }
      window.addEventListener('message', handleMessage);
      script.onload = () => {
        console.log("Injection script loaded");
        script.remove();
      };
    });
  }

  function getProblemSlug() {
    const url = window.location.href;
    const urlParts = url.split('/');
    const slug = urlParts[urlParts.length - 1].split('?')[0];
    console.log("Problem slug:", slug);
    return slug;
  }

  async function syncWithGitHub(code, repoName) {
    console.log("Syncing with GitHub for repo:", repoName);
    if (!code) {
      console.log("No code to sync");
      return { success: false, message: "No code found to sync" };
    }

    try {
      console.log("Getting GitHub credentials from storage");
      const { githubToken, username } = await chrome.storage.local.get(['githubToken', 'username']);
      console.log("Credentials retrieved:", username, "Token:", githubToken ? "exists" : "missing");
      
      if (!githubToken) {
        return { success: false, message: "Please sign in with GitHub first" };
      }

      const problemSlug = getProblemSlug();
      const filePath = `${problemSlug}.py`;
      const apiUrl = `https://api.github.com/repos/${username}/${repoName}/contents/${filePath}`;
      console.log("API URL:", apiUrl);
      
      // Check if file exists
      let sha;
      try {
        console.log("Checking if file already exists");
        const checkResponse = await fetch(apiUrl, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        console.log("File check response status:", checkResponse.status);
        
        if (checkResponse.status === 200) {
          const fileData = await checkResponse.json();
          sha = fileData.sha;
          console.log("File exists, SHA:", sha);
        } else {
          console.log("File does not exist yet");
        }
      } catch (error) {
        console.error("Error checking file existence:", error);
      }

      // Create or update file
      console.log("Preparing file content");
      const encodedContent = btoa(unescape(encodeURIComponent(code)));
      const bodyData = {
        message: sha ? "Update solution from NeetCode" : "Add solution from NeetCode",
        content: encodedContent
      };
      if (sha) {
        bodyData.sha = sha;
      }

      console.log("Sending GitHub API request");
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(bodyData)
      });

      console.log("GitHub API response status:", response.status);
      const result = await response.json();
      
      if (response.ok) {
        console.log("GitHub sync successful");
        return {
          success: true,
          message: `Successfully synced to ${username}/${repoName}/${filePath}`,
          url: result.html_url
        };
      } else {
        console.error("GitHub API error:", result);
        return {
          success: false,
          message: `GitHub API Error: ${result.message || 'Unknown error'}`
        };
      }
    } catch (error) {
      console.error("Error syncing with GitHub:", error);
      return { success: false, message: `Error: ${error.message}` };
    }
  }
} else {
  console.log("Content script already injected, skipping initialization");
}
