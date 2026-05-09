# Add Issue for Backlog

Read this in [日本語](README_ja.md)

This is a Chrome extension that provides API key management and issue creation features for Backlog. By using the side panel, you can efficiently add issues to Backlog without leaving your browser.

## Features Overview

### Main Features
- **Side Panel UI**: Operate comfortably in the browser's side panel.
- **Toggle Operation**: Click the extension icon to open/close the side panel.
- **API Key Management**: Securely encrypt, store, and manage your Backlog API keys.
- **Domain Configuration**: Supports any Backlog domain (e.g., xxx.backlog.jp, yyy.backlog.com).
- **Project Selection**: List and search available Backlog projects.
- **Issue Creation**: Quickly create Backlog issues with minimal input.
- **Template Feature**: Customizable templates for issue descriptions.
- **Auto-Embed URLs**: Automatically inserts the current browser tab's URL and title into the issue description.
- **Auto-Configuration**: Automatically sets the assignee and due date.
- **Dynamic Configuration**: Automatically retrieves issue types and priorities per project.

### Supported Environments
- Google Chrome 114 and later (Supports Manifest V3 and Side Panel API)
- Microsoft Edge (Chromium-based)
- Any domain under Backlog.jp and Backlog.com
- Zendesk / Intercom / Amazon Connect / ServiceDesk Plus / HubSpot / Salesforce / Kintone, etc. (URL auto-embedding supported)

### Configured Allowed Hosts (Domains)

Due to Chrome extension specifications, to automatically retrieve the URL and title of the currently active tab, the target domain must be permitted in advance.

In this extension's `manifest.json`, the following hosts are permitted by default:

- **Backlog**: `https://*.backlog.jp/*`, `https://*.backlog.com/*`, `https://*.backlogtools.com/*`
- **Zendesk**: `https://*.zendesk.com/*`
- **Intercom**: `https://*.intercom.com/*`, `https://*.intercom.io/*`
- **Amazon Connect**: `https://*.my.connect.aws/*`, `https://*.awsapps.com/*`
- **ServiceDesk Plus**: `https://*.manageengine.com/*`, `https://*.manageengine.jp/*`
- **HubSpot**: `https://*.hubspot.com/*`
- **Salesforce**: `https://*.salesforce.com/*`, `https://*.force.com/*`
- **Kintone**: `https://*.cybozu.com/*`, `https://*.kintone.com/*`

**When using other services or custom domains:**
If you wish to use the "URL auto-embedding feature" with SaaS tools or custom internal systems not included above, please add the corresponding domain to the `host_permissions` in `manifest.json` before loading the extension into Chrome.

```json
  "host_permissions": [
    ...
    "https://*.your-custom-domain.com/*"
  ]
```

## Installation Guide

### Installation for Developers

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backlog-add-issue-extention
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Load as a Chrome Extension**
   - Open the Chrome browser
   - Enter `chrome://extensions/` in the address bar
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked"
   - Select the root directory of the project

4. **Verify the extension**
   - Check that the extension icon appears in the browser toolbar
   - Click the icon and verify that the side panel opens

## Usage

### 1. Opening and Closing the Side Panel

- **Open**: Click the extension icon in the browser toolbar
- **Close**: Click the icon again, or click the 'X' button in the side panel

### 2. Setting the API Key

1. **Open the Side Panel**
   - Click the extension icon in the browser toolbar

2. **Select the Settings Tab**
   - Click the "Settings" tab at the top of the side panel

3. **Enter API Key and Domain**
   - Paste your Backlog API key into the input field
   - Enter your Backlog domain (e.g., mycompany.backlog.jp)
   - Click the "Register API Key" button

4. **How to get an API Key**
   - Log in to Backlog
   - Go to Personal Settings → API → Register a new API key
   - Copy the generated API key

### 3. Creating an Issue

1. **Open the Add Issue Tab**
   - Click the "Add Issue" tab at the top of the side panel

2. **Select a Project**
   - Enter the project name or key in the search field
   - Select the target project from the suggestions

3. **Enter Issue Details**
   - Select the issue type
   - Enter a subject (up to 255 characters)
   - The current page's URL and title will be automatically populated in the description field (can be customized via templates)

4. **Create the Issue**
   - Click the "Create Issue" button
   - A success message will appear upon completion

### 4. Customizing Templates

1. **Open the Settings Tab**
   - Click the "Settings" tab at the top of the side panel

2. **Description Template Section**
   - Edit the description template using the template editor
   - Available variables: `{{url}}` (Current page URL), `{{title}}` (Current page title)

3. **Save the Template**
   - Click the "Save" button
   - Click the "Reset" button to revert to the default template

### 5. Managing API Keys

- **Change**: In the Settings tab, click the "Change" button and enter a new API key and domain
- **Delete**: In the Settings tab, click the "Delete" button to remove the API key and related data

## Technical Specifications

### API Call Method
- **Authentication**: The API key is sent as a query parameter
- **Issue Creation**: Uses the POST method, sending parameters as query strings
- **Dynamic Configuration**: Automatically retrieves and applies project-specific issue types and priorities

### Auto-Configuration Features
- **Assignee**: Automatically assigned to the user who registered the API key
- **Due Date**: Automatically set to the issue creation date (today)
- **Issue Type**: Automatically selects the first issue type in the project
- **Priority**: Automatically selects the system's middle priority

## Information for Developers

### Project Structure
```
backlog-add-issue-extention/
├── manifest.json                 # Extension manifest
├── background/
│   └── service-worker.js         # Background processing
├── content/
│   └── url-extractor.js          # URL extraction script
├── sidepanel/
│   ├── sidepanel.html            # Side panel UI
│   ├── sidepanel.js              # Side panel logic
│   └── sidepanel.css             # Stylesheet
├── assets/
│   ├── icon16.png                # 16x16 icon
│   ├── icon48.png                # 48x48 icon
│   └── icon128.png               # 128x128 icon
├── test/                         # Test files
├── .gitignore                    # Git ignore configuration
├── README.md                     # This file
└── package.json                  # Dependency management
```

### Development Commands

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Technology Stack
- **Platform**: Chrome Extensions (Manifest V3)
- **Language**: JavaScript
- **Architecture**: Service Worker-based
- **Test Framework**: Jest + fast-check (property-based testing)

### Distribution Method

#### For Developers
```bash
# Clone the repository
git clone <repository-url>
cd backlog-add-issue-extention

# Install dependencies
npm install

# Run tests
npm test

# Load as a Chrome Extension
# Chrome → Extensions → Developer mode → Load unpacked
```

#### For End Users
- Publish to Chrome Web Store (Future)
- Direct distribution via .crx files

## Troubleshooting

### Frequently Asked Questions

**Q: The API key is shown as invalid**
A: Please check the following:
- Is the API key entered correctly?
- Is the Backlog API key still within its valid period?
- Do you have access rights to the target project?

**Q: The project list doesn't show up**
A: Please check the following:
- Is your internet connection active?
- Is the Backlog API server running normally?
- Does your API key have the appropriate permissions?

**Q: Failed to create an issue**
A: Please check the following:
- Have you entered a subject? (Required field)
- Do you have issue creation permissions in the selected project?
- Is your network connection active?

**Q: The extension doesn't work**
A: Please check the following:
- Is the Chrome extension enabled?
- Are the extension's permissions configured correctly?
- Try restarting your browser.

### How to Check Logs

1. **Open Chrome DevTools**
   - Press F12 or Right-click → Inspect

2. **Check Service Worker Logs**
   - Go to `chrome://extensions/` → Extension Details → Service Worker → Inspect

3. **Check Side Panel Logs**
   - Right-click the extension side panel → Inspect

## License

MIT License

## Contributing

Pull requests and issue reports are welcome.

## Support

If you encounter any problems, please report them on the GitHub Issues page.