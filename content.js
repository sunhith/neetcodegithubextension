console.log("Content script loaded");

function extractCode() {
  return new Promise(resolve => {
    console.log("Extracting code...");
    const editor = document.querySelector('.monaco-editor');
    if (!editor) {
      console.log("No editor found");
      return resolve(null);
    }

    // Create and inject the external script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    document.head.appendChild(script);

    // Listen for messages from inject.js
    function handleMessage(event) {
      if (event.data && event.data.action === 'code') {
        window.removeEventListener('message', handleMessage);
        resolve(event.data.code);
      }
    }

    window.addEventListener('message', handleMessage);
    
    // Clean up
    script.onload = () => script.remove();
  });
}

function getProblemSlug() {
  const url = window.location.href;
  const urlParts = url.split('/');
  const slug = urlParts[urlParts.length - 1].split('?')[0];
  console.log("Problem slug:", slug);
  return slug;
}

async function getNeetCodeSolution() {
  console.log("Getting NeetCode solution...");
  const slug = getProblemSlug();
  const url = `https://neetcode.io/problems/${slug}`;
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const solutionElement = doc.querySelector('.solution-code');
    
    if (solutionElement) {
      const solution = solutionElement.textContent.trim();
      console.log("Solution found:", solution.substring(0, 50) + "...");
      return solution;
    } else {
      console.log("No solution element found");
      return null;
    }
  } catch (error) {
    console.error("Error fetching NeetCode solution:", error);
    return null;
  }
}

async function syncSolutionWithGitHub(solution) {
  console.log("Syncing solution with GitHub...");
  
  if (!solution) {
    console.error("No solution to sync");
    return { message: "No solution found to sync!" };
  }

  try {
    const result1 = await chrome.storage.local.get('githubToken');
    const githubToken = result1.githubToken;
    
    if (!githubToken) {
      console.error("GitHub token not set");
      return { message: "GitHub token not set! Please set it in the extension options." };
    }

    const repoOwner = 'sunhith';
    const repoName = 'neetcodesolutions';
    const problemSlug = getProblemSlug();
    const filePath = `${problemSlug}.py`;
    
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

    // Check if file exists
    console.log("Checking if file exists:", apiUrl);
    let sha;
    try {
      const checkResponse = await fetch(apiUrl, {
        headers: { 
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (checkResponse.status === 200) {
        const fileData = await checkResponse.json();
        sha = fileData.sha;
        console.log("File exists, will update. SHA:", sha);
      } else if (checkResponse.status === 404) {
        console.log("File does not exist, will create new file");
      } else {
        throw new Error(`Unexpected status: ${checkResponse.status}`);
      }
    } catch (error) {
      console.error("Error checking file existence:", error);
    }

    // Create or update file
    console.log("Creating/updating file...");
    const encodedContent = btoa(unescape(encodeURIComponent(solution)));
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
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(bodyData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log("GitHub sync successful:", result);
      return { message: "Successfully synced solution with GitHub!" };
    } else {
      console.error("GitHub sync failed:", result);
      return { message: `Error: ${result.message || 'Unknown error'}` };
    }
  } catch (error) {
    console.error("Error in syncSolutionWithGitHub:", error);
    return { message: `Error: ${error.message}` };
  }
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received:", request.action);
  
  if (request.action === 'sync') {
    extractCode()
      .then(code => syncSolutionWithGitHub(code))
      .then(result => {
        console.log("Sync result:", result);
        sendResponse(result);
      })
      .catch(error => {
        console.error("Sync error:", error);
        sendResponse({ message: `Error: ${error.message}` });
      });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'viewNeetCode') {
    getNeetCodeSolution()
      .then(solution => {
        sendResponse({ solution });
      })
      .catch(error => {
        console.error("Error getting solution:", error);
        sendResponse({ solution: null });
      });
    return true; // Keep the message channel open for async response
  }
});
