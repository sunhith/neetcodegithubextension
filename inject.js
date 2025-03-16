(function() {
    console.log("Inject script running");
    try {
      // Try to use Monaco API first
      if (typeof monaco !== 'undefined') {
        console.log("Monaco editor detected");
        const models = monaco.editor.getModels();
        console.log("Found models:", models ? models.length : 0);
        
        if (models && models.length > 0) {
          const model = models[0];
          const code = model.getValue();
          console.log("Extracted code from Monaco model:", code ? "Success" : "Empty");
          window.postMessage({ action: 'code', code: code }, '*');
        } else {
          console.error("No models found in Monaco editor");
          window.postMessage({ action: 'code', code: null }, '*');
        }
      } else {
        // Fallback to DOM extraction if Monaco API is not available
        console.log("Monaco not found, trying DOM extraction");
        const viewLines = document.querySelectorAll('.view-line');
        console.log("Found view lines:", viewLines.length);
        
        if (viewLines.length > 0) {
          let code = '';
          viewLines.forEach(line => {
            code += line.textContent + '\n';
          });
          // Clean up the code by removing extra whitespace
          code = code.replace(/\n\s*\n/g, '\n\n').trim();
          console.log("Extracted code from DOM:", code ? "Success" : "Empty");
          window.postMessage({ action: 'code', code: code }, '*');
        } else {
          console.error("No view lines found in editor");
          window.postMessage({ action: 'code', code: null }, '*');
        }
      }
    } catch (error) {
      console.error("Error in inject.js:", error);
      window.postMessage({ action: 'code', code: null }, '*');
    }
  })();
  