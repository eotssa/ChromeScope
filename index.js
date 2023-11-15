const express = require('express');
const multer = require('multer');
const admZip = require('adm-zip');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;


// Set up file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Define a base directory for temporary files outside your project directory
const baseTempDir = 'C:\\Users\\Wilson\\Desktop\\TEMP';

function createTempDirectory() {
    const tempDir = path.join(baseTempDir, uuidv4());

    if (!fs.existsSync(baseTempDir)) {
        fs.mkdirSync(baseTempDir, { recursive: true });
    }

    fs.mkdirSync(tempDir);
    return tempDir;
}

function deleteTempDirectory(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.rmSync(directoryPath, { recursive: true, force: true });
  }
}


app.get('/', (req, res) => {
  console.log('Received request at /');
  res.send('Chrome Extension Analyzer is running');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

app.post('/upload', upload.single('extensionFile'), (req, res) => {
  if (req.file) {
    console.log(`Received file: ${req.file.originalname}`);

    const tempPath = createTempDirectory(); // Create a temporary directory
    try {
      // First, read the manifest file from the zip
      const zip = new admZip(req.file.buffer);
      const manifest = JSON.parse(zip.readAsText('manifest.json'));

      // Calculate scores based on the manifest
      const details = {
        metadataDetails: {},
        cspDetails: {},
        permissionsDetails: {},
        jsLibrariesDetails: {}
      };

      const metadataScore = analyzeMetadata(manifest, details.metadataDetails);
      const cspScore = analyzeCSP(manifest, details.cspDetails);
      const permissionsScore = analyzePermissions(manifest, details.permissionsDetails);

      // Then extract files for RetireJS analysis
      console.log(`Extracting to temporary path: ${tempPath}`);
      zip.extractAllTo(tempPath, true);

      analyzeJSLibraries(tempPath, (err, retireJsResults) => {
        if (err) {
          console.error(`Error analyzing JavaScript libraries: ${err}`);
          res.status(500).send('Error analyzing JavaScript libraries');
        } else {
          const jsLibrariesScore = calculateJSLibrariesScore(retireJsResults, details.jsLibrariesDetails);
          const totalRiskScore = metadataScore + cspScore + permissionsScore + jsLibrariesScore;

          const result = {
            totalRiskScore: totalRiskScore,
            breakdown: {
              metadataScore: metadataScore,
              cspScore: cspScore,
              permissionsScore: permissionsScore,
              jsLibrariesScore: jsLibrariesScore
            },
            details: details
          };

          console.log('Analysis Results:', JSON.stringify(result, null, 2));
          res.json(result);
        }

        //deleteTempDirectory(tempPath); // Clean up the temporary directory
      });
    } catch (error) {
      console.error(`Error processing file: ${error}`);
      //deleteTempDirectory(tempPath); // Clean up even in case of error
      res.status(500).send('Error processing the file');
    }
  } else {
    res.status(400).send('No file uploaded');
  }
});




function analyzeMetadata(manifest) {
  let score = 0;

  // Lack of developer’s address
  if (!manifest.author) score += 1;

  // Lack of developer’s email
  if (!manifest.developer || !manifest.developer.email) score += 1;

  // Lack of privacy policy
  if (!manifest.privacy_policy) score += 1;

  // Last Updated (you'll need to find a way to get this info, as it's not typically in manifest.json)
  // ... your logic here ...

  // Extension ratings (same as above, not in manifest.json)
  // ... your logic here ...

  // Less than 1000 users (same as above, not in manifest.json)
  // ... your logic here ...

  // Lack of support site
  if (!manifest.homepage_url) score += 1;

  // Lack of website
  // (Depends on how you differentiate this from the homepage URL)
  // ... your logic here ...

  return score;
}

function analyzeCSP(manifest, cspDetails) {
  let score = 0;
  const csp = findCSP(manifest);

  if (!csp) {
    score += 25; // No CSP present
    cspDetails['noCSP'] = 'No CSP present';
  } else {
    const policies = csp.split(';').filter(Boolean);
    policies.forEach(policy => {
      const policyParts = policy.split(' ').filter(Boolean);
      const directive = policyParts.shift(); // e.g., 'script-src', 'object-src'

      policyParts.forEach(source => {
        if (source !== '\'self\'') {
          score += 1; // Increment score for each source excluding 'self'
          cspDetails[directive] = cspDetails[directive] || [];
          cspDetails[directive].push(source);
        }
      });
    });
  }

  return score;
}




// Recursive function to find CSP in the manifest object
function findCSP(obj) {
  if (typeof obj === 'object' && obj !== null) {
    for (let key in obj) {
      if (key.toLowerCase() === 'content_security_policy') {
        if (typeof obj[key] === 'string') {
          return obj[key];
        } else if (typeof obj[key] === 'object') {
          // If the CSP is nested within an object
          return findCSP(obj[key]);
        }
      } else if (typeof obj[key] === 'object') {
        let result = findCSP(obj[key]);
        if (result) return result;
      }
    }
  }
  return null;
}

const { spawn } = require('child_process');


function analyzeJSLibraries(extensionPath, callback) {
  console.log(`Starting RetireJS analysis for the directory: ${extensionPath}`);

  const retireCmd = `retire --jspath "${extensionPath}" --outputformat json`;

  exec(retireCmd, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error during RetireJS analysis: ${error}`);
      //return callback(`Error executing RetireJS: ${error.message}`, null);
    } else if (stderr) {
      console.log(`RetireJS stderr: ${stderr}`);
    }

    try {
      const results = JSON.parse(stdout);
      console.log(results)
      console.log(`RetireJS analysis completed. Results:`, results);

      if (results.data && Array.isArray(results.data)) {
        // Process each file's results
        results.data.forEach(fileResult => {
          // Additional processing can be done here
          console.log(`Results for file:`, fileResult);
        });

        callback(null, results.data);
      } else {
        callback(null, []); // No data to process, return an empty array
      }
    } catch (parseError) {
      console.error(`Error parsing RetireJS output: ${parseError}`);
      callback(parseError, null);
    }
  });
}




function calculateJSLibrariesScore(retireJsResults, jsLibrariesDetails) {
  let score = 0;

  retireJsResults.forEach(fileResult => {
    if (fileResult.results && fileResult.results.length > 0) {
      fileResult.results.forEach(library => {
        library.vulnerabilities.forEach((vulnerability, index) => {
          // Assign a unique key for each vulnerability
          const vulnKey = `${library.component}-vuln-${index}`;

          // Update the score based on severity
          switch (vulnerability.severity.toLowerCase()) {
            case 'low':
              score += 10;
              break;
            case 'medium':
              score += 20;
              break;
            case 'high':
              score += 30;
              break;
            case 'critical':
              score += 40;
              break;
            default:
              // No additional score for 'none'
          }

          // Store details of each vulnerability
          jsLibrariesDetails[vulnKey] = {
            component: library.component,
            severity: vulnerability.severity.toLowerCase(),
            info: vulnerability.info.join(", "),
            summary: vulnerability.identifiers.summary,
            CVE: vulnerability.identifiers.CVE ? vulnerability.identifiers.CVE.join(", ") : ''
          };
        });
      });
    }
  });

  return score;
}





function analyzePermissions(manifest, permissionsDetails) {
  let score = 0;
  const permissions = (manifest.permissions || []).concat(manifest.optional_permissions || []);

  // Risk scores for different permission categories
  const riskScores = {
    'least': 0,
    'low': 1,
    'medium': 2,
    'high': 3,
    'critical': 4
  };

  // Map permissions to their respective risk categories
  const permissionRiskLevels = {
    'alarms': 'least',
    'contextMenus': 'least',
    'browsingData': 'least',
    'enterprise.deviceAttributes': 'least',
    'fileBrowserHandler': 'least',
    'fontSettings': 'least',
    'gcm': 'least',
    'idle': 'least',
    'power': 'least',
    'printerProvider': 'low',
    'system.cpu': 'least',
    'system.display': 'least',
    'system.memory': 'least',
    'tts': 'least',
    'unlimitedStorage': 'least',
    'wallpaper': 'least',
    'activeTab': 'low',
    'background': 'low',
    'certificateProvider': 'low',
    'documentScan': 'low',
    'enterprise.platformKeys': 'low',
    'hid': 'low',
    'identity': 'low',
    'networking.config': 'low',
    'notifications': 'low',
    'platformKeys': 'low',
    'usbDevices': 'low',
    'webRequestBlocking': 'low',
    'bookmarks': 'medium',
    'clipboardWrite': 'medium',
    'downloads': 'medium',
    'fileSystemProvider': 'medium',
    'management': 'medium',
    'nativeMessaging': 'medium',
    'geolocation': 'medium',
    'processes': 'medium',
    'signedInDevices': 'medium',
    'storage': 'medium',
    'system.storage': 'medium',
    'tabs': 'medium',
    'topSites': 'medium',
    'ttsEngine': 'medium',
    'webNavigation': 'medium',
    'clipboardRead': 'high',
    'contentSettings': 'high',
    'desktopCapture': 'high',
    'displaySource': 'high',
    'dns': 'high',
    'experimental': 'high',
    'history': 'high',
    'http://*/*': 'high',
    'https://*/*': 'high',
    'file:///*': 'high',
    'http://*/': 'high',
    'https://*/': 'high',
    'mdns': 'high',
    'pageCapture': 'high',
    'privacy': 'high',
    'proxy': 'high',
    'vpnProvider': 'high',
    'cookies': 'critical',
    'debugger': 'critical',
    'declarativeWebRequest': 'critical',
    'webRequest': 'critical',
    '<all_urls>': 'critical',
    '*://*/*': 'critical',
    '*://*/': 'critical'
  };

  permissions.forEach(permission => {
    const riskLevel = permissionRiskLevels[permission] || 'least';
    score += riskScores[riskLevel];
    if (riskLevel !== 'least') {
      permissionsDetails[permission] = `Permission '${permission}' classified as ${riskLevel} risk.`;
    }
  });

  return score;
}

