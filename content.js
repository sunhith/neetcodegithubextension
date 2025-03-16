chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sync') {
    extractCode()
      .then(code => {
        if (!code) {
          sendResponse({ success: false, message: "No code found to sync" });
          return;
        }
        return syncWithGitHub(code, request.repoName);
      })
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error("Error:", error);
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
      console.log("No editor found");
      return resolve(null);
    }

    // Create and inject the script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    document.head.appendChild(script);

    // Listen for the message from inject.js
    function handleMessage(event) {
      if (event.data && event.data.action === 'code') {
        window.removeEventListener('message', handleMessage);
        resolve(event.data.code);
      }
    }

    window.addEventListener('message', handleMessage);
    script.onload = () => script.remove();
  });
}

function getProblemSlug() {
  const url = window.location.href;
  const urlParts = url.split('/');
  return urlParts[urlParts.length - 1].split('?')[0];
}

async function syncWithGitHub(code, repoName) {
  console.log("Syncing with GitHub...");
  
  if (!code) {
    return { success: false, message: "No code found to sync" };
  }

  try {
    const { githubToken, username } = await chrome.storage.local.get(['githubToken', 'username']);
    
    if (!githubToken) {
      return { success: false, message: "Please sign in with GitHub first" };
    }

    const problemSlug = getProblemSlug();
    const filePath = `${problemSlug}.py`;
    const apiUrl = `https://api.github.com/repos/${username}/${repoName}/contents/${filePath}`;

    // Check if file exists
    let sha;
    try {
      const checkResponse = await fetch(apiUrl, {
        headers: { 
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (checkResponse.status === 200) {
        const fileData = await checkResponse.json();
        sha = fileData.sha;
      }
    } catch (error) {
      console.error("Error checking file existence:", error);
    }

    // Create or update file
    const encodedContent = btoa(unescape(encodeURIComponent(code)));
    
    const bodyData = {
      message: sha ? "Update solution from NeetCode" : "Add solution from NeetCode",
      content: encodedContent
    };
    
    if (sha) {
      bodyData.sha = sha;
    }
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(bodyData)
    });

    const result = await response.json();
    
    if (response.ok) {
      return { 
        success: true, 
        message: `Successfully synced to ${username}/${repoName}/${filePath}`,
        url: result.html_url
      };
    } else {
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
