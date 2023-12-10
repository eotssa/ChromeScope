const express = require('express');
const router = express.Router();
const multer = require('multer');
const admZip = require('adm-zip');
const fs = require('fs'); // Used to read files
const path = require('path'); // Used to get the file extension
const { createTempDirectory, deleteTempDirectory } = require('../utils/fileUltils');
const { exec } = require('child_process'); // Used to run retire.js as a command line tool


// Set up file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', upload.single('extensionFile'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).send('No file uploaded');
      return;
    }

    const tempPath = createTempDirectory();
    const zip = new admZip(req.file.buffer);
    const manifest = JSON.parse(zip.readAsText('manifest.json')); // Assumes that manifest.json is present in the root directory of the extension

    const details = {
      metadataDetails: {},
      cspDetails: {},
      permissionsDetails: {},
      jsLibrariesDetails: {},
      chromeAPIUsage: {}
    };

    const metadataScore = analyzeMetadata(manifest, details.metadataDetails);
    const cspScore = analyzeCSP(manifest, details.cspDetails);
    const permissionsScore = analyzePermissions(manifest, details.permissionsDetails);

    zip.extractAllTo(tempPath, true);
    const retireJsResults = await analyzeJSLibraries(tempPath);
    const jsLibrariesScore = calculateJSLibrariesScore(retireJsResults, details.jsLibrariesDetails);

    const chromeAPIUsageDetails = await analyzeChromeAPIUsage(tempPath);
    console.log('Chrome API Usage Details:', chromeAPIUsageDetails);

    // Update this line to directly store the array of objects returned by analyzeChromeAPIUsage
    details.chromeAPIUsage = chromeAPIUsageDetails;

    // Incorporate Chrome API usage details into the result
    const result = {
      totalRiskScore: metadataScore + cspScore + permissionsScore + jsLibrariesScore,
      breakdown: {
        metadataScore,
        cspScore,
        permissionsScore,
        jsLibrariesScore,
        chromeAPIUsage: chromeAPIUsageDetails.length // Include this as an informative section
      },
      details
    };

    console.log('Analysis Results:', JSON.stringify(result, null, 2));
    res.json(result);
    deleteTempDirectory(tempPath);
  } catch (err) {
    next(err);
  }
});



async function analyzeChromeAPIUsage(directoryPath) {
  let chromeAPIUsage = [];

  const files = fs.readdirSync(directoryPath);

  for (const file of files) {
    const fullPath = path.join(directoryPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // Recursively analyze nested directories
      const nestedUsage = await analyzeChromeAPIUsage(fullPath);
      chromeAPIUsage = [...chromeAPIUsage, ...nestedUsage];
    } else if (path.extname(file) === '.js') {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const regex = /chrome\.\w+/g; // Regex to find "chrome.[something]"
      const matches = content.match(regex) || [];

      matches.forEach(api => {
        if (!chromeAPIUsage.some(usage => usage.api === api && usage.file === file)) {
          chromeAPIUsage.push({ file, api });
        }
      });
    }
  }

  return chromeAPIUsage;
}




function analyzeMetadata(manifest) {
  let score = 0;

  if (!manifest.author) score += 1;

  if (!manifest.developer || !manifest.developer.email) score += 1;

  if (!manifest.privacy_policy) score += 1;

  if (!manifest.homepage_url) score += 1;

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

async function analyzeJSLibraries(extensionPath) {
  return new Promise((resolve, reject) => {
    const retireCmd = `retire --jspath "${extensionPath}" --outputformat json`;
    exec(retireCmd, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (stderr) {
        reject(error || stderr);
      } else {
        try {
          const results = JSON.parse(stdout);
          resolve(results.data || []);
        } catch (parseError) {
          reject(parseError);
        }
      }
    });
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
            info: vulnerability.info.join(', '),
            summary: vulnerability.identifiers.summary,
            CVE: vulnerability.identifiers.CVE ? vulnerability.identifiers.CVE.join(', ') : ''
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
    'least': 0, // No risk or negligible risk
    'low': 1,
    'medium': 2,
    'high': 3,
    'critical': 4 // Extremely high risk
  };

  // Map permissions to their respective risk categories
  const permissionRiskLevels = {
    // Assigning permissions to 'least' risk
    'alarms': 'least',
    'contextMenus': 'least',
    'enterprise.deviceAttributes': 'least',
    'fileBrowserHandler': 'least',
    'fontSettings': 'least',
    'gcm': 'least',
    'idle': 'least',
    'power': 'least',
    'system.cpu': 'least',
    'system.display': 'least',
    'system.memory': 'least',
    'tts': 'least',
    'unlimitedStorage': 'least',
    'wallpaper': 'least',
    'externally_connectable': 'least',
    'mediaGalleries': 'least',

    // Assigning permissions to 'low' risk
    'printerProvider': 'low',
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
    'overrideEscFullscreen': 'low',


    // Assigning permissions to 'medium' risk
    'activeTab': 'medium',
    'background': 'medium',
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
    'syncFileSystem': 'medium',
    'fileSystem': 'medium',

    // Assigning permissions to 'high' risk
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
    'browsingData': 'high',
    'audioCapture': 'high',
    'videoCapture': 'high',

    // Assigning permissions to 'critical' risk
    'cookies': 'critical',
    'debugger': 'critical',
    'declarativeWebRequest': 'critical',
    'webRequest': 'critical',
    '<all_urls>': 'critical',
    '*://*/*': 'critical',
    '*://*/': 'critical',
    'content_security_policy': 'critical',
    'declarativeNetRequest': 'critical',
    'copresence': 'critical',
    'usb': 'critical',
    'unsafe-eval': 'critical',
    'web_accessible_resources': 'critical'
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




module.exports = router;