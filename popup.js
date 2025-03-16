document.addEventListener('DOMContentLoaded', async function() {
    const authButton = document.getElementById('auth-button');
    const syncButton = document.getElementById('sync-button');
    const authStatus = document.getElementById('auth-status');
    const authSection = document.getElementById('auth-section');
    const actionSection = document.getElementById('action-section');
    const statusMessage = document.getElementById('status-message');
    const repoNameInput = document.getElementById('repo-name');
    
    // Check if user is already authenticated
    const { githubToken, username } = await chrome.storage.local.get(['githubToken', 'username']);
    updateUI(!!githubToken, username);
    
    // Auth button click handler
    authButton.addEventListener('click', async () => {
        console.log("auth button clicked")
        console.log(githubToken)
      if (githubToken) {
        // Sign out
        await chrome.storage.local.remove(['githubToken', 'username']);
        updateUI(false);
      } else {
        // Sign in
        try {
          authButton.textContent = "Signing in...";
          authButton.disabled = true;
          
          const response = await chrome.runtime.sendMessage({ action: "authenticate" });
          
          if (response.success) {
            updateUI(true, response.username);
          } else {
            showStatus(`Authentication failed: ${response.error}`, 'error');
            updateUI(false);
          }
        } catch (error) {
          showStatus(`Authentication error: ${error.message}`, 'error');
          updateUI(false);
        }
      }
    });
    
    // Sync button click handler
    syncButton.addEventListener('click', async () => {
      try {
        statusMessage.className = 'hidden';
        syncButton.textContent = "Syncing...";
        syncButton.disabled = true;
        
        const repoName = repoNameInput.value.trim();
        
        if (!repoName) {
          showStatus("Please enter a repository name", 'error');
          syncButton.textContent = "Sync Solution to GitHub";
          syncButton.disabled = false;
          return;
        }
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        const response = await chrome.tabs.sendMessage(tab.id, { 
          action: 'sync',
          repoName: repoName
        });
        
        if (response.success) {
          showStatus(response.message, 'success');
        } else {
          showStatus(response.message || "Failed to sync solution", 'error');
        }
      } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
      } finally {
        syncButton.textContent = "Sync Solution to GitHub";
        syncButton.disabled = false;
      }
    });
    
    function updateUI(isAuthenticated, user) {
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
      statusMessage.textContent = message;
      statusMessage.className = type === 'error' ? 'error-message' : 'success-message';
      statusMessage.classList.remove('hidden');
    }
  });
  