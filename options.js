document.getElementById('save').onclick=()=>{
    chrome.storage.local.set({githubToken:document.getElementById('token').value.trim()},()=>alert('Saved!'));
   };
   