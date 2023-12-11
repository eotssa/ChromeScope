
# ChromeScope

## Test the functionality yourself with a simple front end interface.

chrome-extension-analyzer.fly.dev

## Overview

This Node.js Express router module is designed for integration into Security Information and Event Management (SIEM) systems. It provides automated analysis of Chrome extensions, offering insights into security, permissions, and code quality. The module accepts a ZIP file containing a Chrome extension, performs various analyses, and returns a JSON file as its response data. 

## Example JSON Output

```
{
    "totalRiskScore": 200,
    "breakdown": {
        "metadataScore": 4,
        "cspScore": 1,
        "permissionsScore": 15,
        "jsLibrariesScore": 180,
        "chromeAPIUsage": 5,
        "eslintIssues": 781
    },
    "details": {
        "metadataDetails": {},
        "cspDetails": {
            "script-src": [
                "https://ssl.google-analytics.com"
            ]
        },
        "permissionsDetails": {
            "tabs": "Permission 'tabs' classified as medium risk.",
            "webRequest": "Permission 'webRequest' classified as critical risk.",
            "webRequestBlocking": "Permission 'webRequestBlocking' classified as low risk.",
            "webNavigation": "Permission 'webNavigation' classified as medium risk.",
            "<all_urls>": "Permission '<all_urls>' classified as critical risk.",
            "storage": "Permission 'storage' classified as medium risk."
        },
        "jsLibrariesDetails": {
            "jquery-vuln-0": {
                "component": "jquery",
                "severity": "medium",
                "info": "http://blog.jquery.com/2016/01/08/jquery-2-2-and-1-12-released/, http://research.insecurelabs.org/jquery/test/, https://bugs.jquery.com/ticket/11974, https://github.com/advisories/GHSA-rmxg-73gg-4p98, https://github.com/jquery/jquery/issues/2432, https://nvd.nist.gov/vuln/detail/CVE-2015-9251",
                "summary": "3rd party CORS request may execute",
                "CVE": "CVE-2015-9251"
            },
            "jquery-vuln-1": {
                "component": "jquery",
                "severity": "low",
                "info": "https://github.com/jquery/jquery.com/issues/162",
                "summary": "jQuery 1.x and 2.x are End-of-Life and no longer receiving security updates",
                "CVE": ""
            },
            "jquery-vuln-2": {
                "component": "jquery",
                "severity": "medium",
                "info": "https://blog.jquery.com/2019/04/10/jquery-3-4-0-released/, https://github.com/jquery/jquery/commit/753d591aea698e57d6db58c9f722cd0808619b1b, https://nvd.nist.gov/vuln/detail/CVE-2019-11358",
                "summary": "jQuery before 3.4.0, as used in Drupal, Backdrop CMS, and other products, mishandles jQuery.extend(true, {}, ...) because of Object.prototype pollution",
                "CVE": "CVE-2019-11358"
            },
        },
        "chromeAPIUsage": {
            "\\tmp\\0c850879-580b-4c10-9180-1386fa9e5f0f\\public_static\\3sm\\foner.js": [
                "chrome.runtime.sendMessage"
            ],
            "\\tmp\\0c850879-580b-4c10-9180-1386fa9e5f0f\\public_static\\3sm\\notifier.js": [
                "chrome.runtime.sendMessage"
            ],
            "\\tmp\\0c850879-580b-4c10-9180-1386fa9e5f0f\\public_static\\back\\dommer.js": [
                "chrome.storage.local",
                "chrome.runtime.lastError",
                "chrome.tabs.onUpdated",
                "chrome.webRequest.onBeforeRedirect",
                "chrome.runtime.onInstalled",
                "chrome.webNavigation.onCreatedNavigationTarget",
                "chrome.runtime.onMessage",
                "chrome.tabs.onRemoved",
                "chrome.tabs.query"
            ],
            "\\tmp\\0c850879-580b-4c10-9180-1386fa9e5f0f\\public_static\\back\\utils.js": [
                "chrome.tabs.remove",
                "chrome.storage.local",
                "chrome.tabs.executeScript",
                "chrome.webRequest.onHeadersReceived",
                "chrome.webRequest.onBeforeRequest"
            ],
            "\\tmp\\0c850879-580b-4c10-9180-1386fa9e5f0f\\public_static\\pupik\\index.js": [
                "chrome.runtime.sendMessage",
                "chrome.storage.local"
            ]
        },
        "dataHandling": {
            "\\tmp\\0c850879-580b-4c10-9180-1386fa9e5f0f\\public_static\\3sm\\jquery-2.1.3.min.js": {
                "apiCalls": 2
            },
        },
        "eslintDetails": {
            "totalIssues": 781,
            "errors": 7,
            "warnings": 774,
            "commonIssues": {
                "null": 7,
                "security/detect-object-injection": 746,
                "security/detect-non-literal-regexp": 28
            }
        }
    }
}
```

## Features

- **File Upload and Extraction**: Processes ZIP files containing Chrome extensions.
- **Manifest Analysis**: Evaluates metadata, Content Security Policy (CSP), and permissions.
- **JavaScript Analysis**: Includes ESLint checks with the `eslint-plugin-security` for security-focused code quality assessment.
- **Chrome API and Data Handling Analysis**: Examines Chrome API usage and data handling practices within the extension.
- **JavaScript Library Vulnerability Analysis**: Uses `retire.js` for identifying known vulnerabilities in JavaScript libraries.

## Getting Started

### Prerequisites

Ensure the following dependencies are installed in your project:
- Node.js and npm
- Express
- Multer
- adm-zip
- fs and path (Node.js core modules)
- child_process (Node.js core module)
- ESLint with `eslint-plugin-security`

### Installation

1. Clone or download this module into your project.
2. Install the required dependencies via npm:
   ```bash
   npm install express multer adm-zip eslint eslint-plugin-security
   ```

### Usage

Integrate the module into your existing Express application. Set up a route to handle POST requests where the Chrome extension ZIP file will be uploaded.

```javascript
const express = require('express');
const app = express();
const chromeExtensionAnalysisRouter = require('./path/to/this/module');

app.use('/', chromeExtensionAnalysisRouter);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Contribution

Contributions to enhance the module's functionality, especially regarding its integration with different SIEM systems, are welcome.


