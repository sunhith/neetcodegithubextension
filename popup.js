document.addEventListener('DOMContentLoaded', async function() {
    console.log("Popup loaded");
    const authButton = document.getElementById('auth-button');
    const syncButton = document.getElementById('sync-button');
    const authStatus = document.getElementById('auth-status');
    const authSection = document.getElementById('auth-section');
    const actionSection = document.getElementById('action-section');
    const statusMessage = document.getElementById('status-message');
    const repoNameInput = document.getElementById('repo-name');
  
    // Check if user is already authenticated
    console.log("Checking authentication status...");
    const { githubToken, username } = await chrome.storage.local.get(['githubToken', 'username']);
    console.log("Auth status:", !!githubToken, "Username:", username);
    updateUI(!!githubToken, username);
  
    // Auth button click handler
    authButton.addEventListener('click', async () => {
      console.log("Auth button clicked");
      
      // Get the current token state to ensure we have the latest value
      const { githubToken } = await chrome.storage.local.get(['githubToken']);
      console.log("Current token:", githubToken ? "exists" : "not found");
      
      if (githubToken) {
        // Sign out
        console.log("Attempting to sign out...");
        try {
          await chrome.storage.local.clear();
          console.log("Storage cleared successfully");
          updateUI(false);
        } catch (error) {
          console.error("Error clearing storage:", error);
        }
      } else {
        // Sign in
        try {
          console.log("Attempting to sign in...");
          authButton.textContent = "Signing in...";
          authButton.disabled = false;
          const response = await chrome.runtime.sendMessage({ action: "authenticate" });
          console.log("Auth response:", response);
          if (response.success) {
            updateUI(true, response.username);
          } else {
            showStatus(`Authentication failed: ${response.error}`, 'error');
            updateUI(false);
          }
        } catch (error) {
          console.error("Auth error:", error);
          showStatus(`Authentication error: ${error.message}`, 'error');
          updateUI(false);
        }
      }
    });
  
    // Sync button click handler
    syncButton.addEventListener('click', async () => {
      console.log("Sync button clicked");
      try {
        statusMessage.className = 'hidden';
        syncButton.textContent = "Syncing...";
        syncButton.disabled = true;
        
        const repoName = repoNameInput.value.trim();
        console.log("Repository name:", repoName);
        if (!repoName) {
          console.log("No repository name provided");
          showStatus("Please enter a repository name", 'error');
          syncButton.textContent = "Sync Solution to GitHub";
          syncButton.disabled = false;
          return;
        }
  
        console.log("Getting active tab...");
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log("Active tab:", tab.id, tab.url);
        
        // First try to send a message to see if content.js is already injected
        let contentScriptInjected = false;
        try {
          console.log("Checking if content script is already injected...");
          await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
          contentScriptInjected = true;
          console.log("Content script is already injected");
        } catch (error) {
          // Content script not injected yet
          contentScriptInjected = false;
          console.log("Content script not yet injected:", error.message);
        }
        
        if (!contentScriptInjected) {
          console.log("Injecting content script...");
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          console.log("Content script injected successfully");
        }
  
        console.log("Sending sync message to content script...");
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'sync',
          repoName: repoName
        });
        console.log("Sync response:", response);
  
        if (response.success) {
          showStatus(response.message, 'success');
        } else {
          showStatus(response.message || "Failed to sync solution", 'error');
        }
      } catch (error) {
        console.error("Sync error:", error);
        showStatus(`Error: ${error.message}`, 'error');
      } finally {
        syncButton.textContent = "Sync Solution to GitHub";
        syncButton.disabled = false;
      }
    });
  
    function updateUI(isAuthenticated, user) {
      console.log("Updating UI:", isAuthenticated, user);
      if (isAuthenticated) {
        authStatus.textContent = `Signed in as ${user}`;
        authStatus.style.backgroundColor = '#dcffe4';
        authButton.textContent = "Sign out";
        authSection.classList.remove('hidden');
        actionSection.classList.remove('hidden');
      } else {
        authStatus.textContent = "Not signed in to GitHub";
        authStatus.style.backgroundColor = '#f6f8fa';
        authButton.textContent = "Sign in with GitHub";
        authButton.disabled = false;
        authSection.classList.remove('hidden');
        actionSection.classList.add('hidden');
      }
    }
  
    function showStatus(message, type) {
      console.log("Showing status:", message, type);
      statusMessage.textContent = message;
      statusMessage.className = type === 'error' ? 'error-message' : 'success-message';
      statusMessage.classList.remove('hidden');
    }
  });
  