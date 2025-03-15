const injectContentScript = async (tabId) => {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      console.log("Content script injected successfully.");
    } catch (error) {
      console.error("Error injecting content script:", error);
    }
  };
  
  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('viewNeetCodeButton').addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
        await injectContentScript(tab.id);
        chrome.tabs.sendMessage(tab.id, { action: 'viewNeetCode' }, response => {
          if (response && response.solution) {
            alert(response.solution);
            console.log("Solution:", response.solution);
          } else {
            alert('No solution found.');
          }
        });
      });
    });
  
    document.getElementById('syncButton').addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
        await injectContentScript(tab.id);
        chrome.tabs.sendMessage(tab.id, { action: 'sync' }, response => {
          if (response && response.message) {
            alert(response.message);
          }
        });
      });
    });
  });
  