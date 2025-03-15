(function() {
    try {
      // Wait for Monaco to be available
      if (typeof monaco !== 'undefined') {
        // Get all available models
        const models = monaco.editor.getModels();
        
        if (models && models.length > 0) {
          // Get the first model which contains the code
          const model = models[0];
          const code = model.getValue();
          window.postMessage({ action: 'code', code: code }, '*');
        } else {
          console.error("No models found in Monaco editor");
          window.postMessage({ action: 'code', code: null }, '*');
        }
      } else {
        // If monaco is not defined, try to extract code directly from DOM
        const codeElements = document.querySelectorAll('.view-line .mtk1, .view-line .mtk8, .view-line .mtk9');
        if (codeElements.length > 0) {
          let code = '';
          let currentLine = '';
          let prevLineTop = -1;
          
          Array.from(codeElements).forEach(el => {
            const lineTop = parseInt(el.parentElement.style.top);
            if (prevLineTop !== lineTop) {
              if (prevLineTop !== -1) code += currentLine + '\n';
              currentLine = '';
              prevLineTop = lineTop;
            }
            currentLine += el.textContent;
          });
          code += currentLine;
          
          window.postMessage({ action: 'code', code: code }, '*');
        } else {
          window.postMessage({ action: 'code', code: null }, '*');
        }
      }
    } catch (error) {
      console.error("Error in inject.js:", error);
      window.postMessage({ action: 'code', code: null }, '*');
    }
  })();
  