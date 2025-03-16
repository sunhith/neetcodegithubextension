**NeetCode GitHub Sync Chrome Extension**<br>
A Chrome extension that allows you to sync your NeetCode coding solutions directly to your GitHub repositories.

**Features:**<br>
1. Authenticate with GitHub using OAuth 2.0

2. Extract code from NeetCode's Monaco editor

3. Sync solutions to your specified GitHub repository

4. Automatically detect existing solutions and update them

**Installation:**<br>
1. Clone this repository or download the source code

2. Open Chrome and navigate to chrome://extensions/

3. Enable "Developer mode" in the top-right corner

4. Click "Load unpacked" and select the extension directory

5. The NeetCode GitHub Sync extension should now appear in your extensions list

**Usage:**<br>
1. Navigate to a NeetCode problem page

2. Click the extension icon to open the popup

3. Sign in with your GitHub account

4. Enter the name of the repository where you want to store your solutions

5. Click "Sync Solution to GitHub"

6. Your solution will be uploaded to your GitHub repository as a Python file

**Technical Details**<br>
The extension uses:<br>

1. Chrome Extension APIs (identity, storage, scripting)

2. GitHub OAuth for authentication

3. GitHub REST API for repository operations

4. Monaco Editor API for code extraction

**Security Note**<br>
This extension requires the "repo" scope to access your GitHub repositories. The authentication is handled securely through Chrome's identity API, but for production use, the token exchange should be handled by a backend service rather than directly in the extension.

**File Structure**<br>
|File|operation|
|----------|-------------|
| manifest.json | Extension configuration |
| popup.html/js | User interface |
| background.js | Handles GitHub authentication |
| content.js | Extracts code from NeetCode |
| inject.js | Accesses Monaco editor |
| styles.css | Styling for the popup |
