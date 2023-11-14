const express = require('express');
const multer = require('multer');
const admZip = require('adm-zip');
const { exec } = require('child_process');
const fs = require('fs'); // Make sure to include this for file system operations

const app = express();
const port = 3000;

// Set up file storage
const storage = multer.memoryStorage(); // using memory storage for temporary file handling
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  console.log('Received request at /');
  res.send('Chrome Extension Analyzer is running');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

app.post('/upload', upload.single('extensionFile'), (req, res) => {
  console.log('Received file upload request');

  const tempPath = createTempDirectory(); // Implement this function to create a temporary directory

  if (req.file) {
    console.log(`Received file: ${req.file.originalname}`);
    try {
      const zip = new admZip(req.file.buffer);
      console.log('Zip file loaded into memory');

      const tempPath = '/path/to/temp/extension/directory';
      console.log(`Extracting to temporary path: ${tempPath}`);
      zip.extractAllTo(tempPath, true);

      const manifest = JSON.parse(zip.readAsText('manifest.json'));
      console.log('Manifest file read');

      const details = {
        metadataDetails: {},
        cspDetails: {},
        permissionsDetails: {},
        jsLibrariesDetails: {}
      };

      const metadataScore = analyzeMetadata(manifest, details.metadataDetails);
      console.log(`Metadata score calculated: ${metadataScore}`);

      const cspScore = analyzeCSP(manifest, details.cspDetails);
      console.log(`CSP score calculated: ${cspScore}`);

      const permissionsScore = analyzePermissions(manifest, details.permissionsDetails);
      console.log(`Permissions score calculated: ${permissionsScore}`);

      analyzeJSLibraries(tempPath, (err, retireJsResults) => {
        if (err) {
          console.error(`Error analyzing JavaScript libraries: ${err}`);
          res.status(500).send('Error analyzing JavaScript libraries');
        } else {
          console.log('RetireJS analysis completed');
          const jsLibrariesScore = calculateJSLibrariesScore(retireJsResults, details.jsLibrariesDetails);
          console.log(`JS Libraries score calculated: ${jsLibrariesScore}`);

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

          // Log the final results to the console
          console.log("Analysis Results:", JSON.stringify(result, null, 2));

          res.json(result);
          fs.rmSync(tempPath, { recursive: true, force: true });
        }
      });
    } catch (error) {
      console.error(`Error processing file: ${error}`);
      res.status(500).send('Error processing the file');
    }
  } else {
    console.log('No file uploaded');
    res.status(400).send('No file uploaded');
  }
});


// app.post('/upload', upload.single('extensionFile'), (req, res) => {
//   if (req.file) {
//     try {
//       const zip = new admZip(req.file.buffer);
//       const tempPath = '/path/to/temp/extension/directory';
//       zip.extractAllTo(tempPath, true);

//       const manifest = JSON.parse(zip.readAsText('manifest.json'));

//       const details = {
//         metadataDetails: {},
//         cspDetails: {},
//         permissionsDetails: {},
//         jsLibrariesDetails: {}
//       };

//       const metadataScore = analyzeMetadata(manifest, details.metadataDetails);
//       const cspScore = analyzeCSP(manifest, details.cspDetails);
//       const permissionsScore = analyzePermissions(manifest, details.permissionsDetails);

//       analyzeJSLibraries(tempPath, (err, retireJsResults) => {
//         if (err) {
//           res.status(500).send('Error analyzing JavaScript libraries');
//         } else {
//           const jsLibrariesScore = calculateJSLibrariesScore(retireJsResults, details.jsLibrariesDetails);

//           const totalRiskScore = metadataScore + cspScore + permissionsScore + jsLibrariesScore;

//           const result = {
//             totalRiskScore: totalRiskScore,
//             breakdown: {
//               metadataScore: metadataScore,
//               cspScore: cspScore,
//               permissionsScore: permissionsScore,
//               jsLibrariesScore: jsLibrariesScore
//             },
//             details: details
//           };
          
//           console.log("Analysis Results:", JSON.stringify(result, null, 2));

//           res.json(result);
//           fs.rmSync(tempPath, { recursive: true, force: true });
//         }
//       });
//     } catch (error) {
//       res.status(500).send('Error processing the file');
//     }
//   } else {
//     res.status(400).send('No file uploaded');
//   }
// });






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
        if (source !== "'self'") {
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






function analyzeJSLibraries(extensionPath, callback) {
  const retireCmd = `retire --path "${extensionPath}" --outputformat json`;
  exec(retireCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Exec error: ${error}`);
      console.error(`Command: ${retireCmd}`);
      return callback(`Error executing RetireJS: ${error.message}`, null);
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return callback(`Error in RetireJS: ${stderr}`, null);
    }
    try {
      const results = JSON.parse(stdout);
      return callback(null, results);
    } catch (parseError) {
      console.error(`Error parsing RetireJS output: ${parseError}`);
      return callback(parseError, null);
    }
  });
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


function calculateJSLibrariesScore(retireJsResults, jsLibrariesDetails) {
  let score = 0;

  retireJsResults.forEach(result => {
    if (result.results && result.results.length > 0) {
      result.results.forEach(vulnerability => {
        if (vulnerability.severity) {
          switch (vulnerability.severity.toLowerCase()) {
          case 'low':
            score += 10;
            jsLibrariesDetails[vulnerability.component] = { severity: 'low', info: vulnerability.info };
            break;
          case 'medium':
            score += 20;
            jsLibrariesDetails[vulnerability.component] = { severity: 'medium', info: vulnerability.info };
            break;
          case 'high':
            score += 30;
            jsLibrariesDetails[vulnerability.component] = { severity: 'high', info: vulnerability.info };
            break;
          case 'critical':
            score += 40;
            jsLibrariesDetails[vulnerability.component] = { severity: 'critical', info: vulnerability.info };
            break;
          default:
            // No additional score for 'none'
            break;
          }
        }
      });
    }
  });

  return score;
}
