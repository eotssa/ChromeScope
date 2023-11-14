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

  if (req.file) {
    console.log(`Received file: ${req.file.originalname}`);
    try {
      const zip = new admZip(req.file.buffer);
      console.log('Zip file loaded into memory');

      const tempPath = '/path/to/temp/extension/directory'; // Set a correct temp path
      console.log(`Extracting to temporary path: ${tempPath}`);
      zip.extractAllTo(tempPath, true);

      const manifest = JSON.parse(zip.readAsText('manifest.json'));
      console.log('Manifest file read');

      const metadataScore = analyzeMetadata(manifest);
      console.log(`Metadata score calculated: ${metadataScore}`);

      const cspScore = analyzeCSP(manifest);
      console.log(`CSP score calculated: ${cspScore}`);

      const permissionsScore = analyzePermissions(manifest);
      console.log(`Permissions score calculated: ${permissionsScore}`);

      analyzeJSLibraries(tempPath, (err, retireJsResults) => {
        if (err) {
          console.error(`Error analyzing JavaScript libraries: ${err}`);
          res.status(500).send('Error analyzing JavaScript libraries');
        } else {
          console.log('RetireJS analysis completed');
          const jsLibrariesScore = calculateJSLibrariesScore(retireJsResults);
          console.log(`JS Libraries score calculated: ${jsLibrariesScore}`);

          // Calculate the total risk score
          const totalRiskScore = metadataScore + cspScore + permissionsScore + jsLibrariesScore;

          // Prepare a descriptive output
          const result = {
            totalRiskScore: totalRiskScore,
            breakdown: {
              metadataScore: metadataScore,
              cspScore: cspScore,
              permissionsScore: permissionsScore,
              jsLibrariesScore: jsLibrariesScore
            },
            analysisDetails: {
              metadata: 'Scores based on the presence or absence of metadata such as developer\'s address, email, and privacy policy.',
              csp: 'Scores calculated from the Content Security Policy, including policies like \'unsafe-inline\' and wildcard entries.',
              permissions: 'Scores based on the permissions requested by the extension.',
              jsLibraries: 'Scores based on vulnerabilities found in JavaScript libraries used by the extension.'
            }
          };

          res.json(result);

          // Clean up: delete temp files
          console.log(`Deleting temporary files at: ${tempPath}`);
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

function analyzeCSP(manifest) {
  let score = 0;

  // Check if CSP is present and is a string
  const csp = (typeof manifest['content_security_policy'] === 'string') ? manifest['content_security_policy'] : null;

  if (!csp) {
    // Lack of entire CSP section or not a string
    score += 25;
  } else {
    const policies = csp.split(';').filter(Boolean); // Split and filter out empty strings
    policies.forEach(policy => {
      // Each entry in the CSP
      score += 1;

      if (policy.includes('*')) {
        // Each '*' entry in CSP
        score += 5;
      }
      if (policy.includes('unsafe-inline') || policy.includes('unsafe-eval')) {
        // Each 'unsafe-inline' or 'unsafe-eval'
        score += 5;
      }
      // 'none' does not change the score
    });
  }

  return score;
}


function analyzeJSLibraries(extensionPath, callback) {
  exec(`retire --path ${extensionPath} --outputformat json`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return callback(error, null);
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return callback(stderr, null);
    }
    try {
      const output = JSON.parse(stdout);
      const results = output.data || []; // Use 'data' array from RetireJS output
      return callback(null, results);
    } catch (parseError) {
      console.error(`Error parsing RetireJS output: ${parseError}`);
      return callback(parseError, null);
    }
  });
}




function analyzePermissions(manifest) {
  let score = 0;
  const permissions = manifest.permissions || [];

  const riskScores = {
    // Define risk scores for different permission categories
    'least': 0,
    'low': 1,
    'medium': 2,
    'high': 3,
    'critical': 4
  };

  const permissionRiskLevels = {
    // Map permissions to their respective risk categories
    'alarms': 'least',
    'activeTab': 'low',
    'bookmarks': 'medium',
    'clipboardRead': 'high',
    'cookies': 'critical',
    // ... include all permissions as per your provided list
  };

  permissions.forEach(permission => {
    const riskLevel = permissionRiskLevels[permission] || 'least';
    score += riskScores[riskLevel];
  });

  return score;
}

function calculateJSLibrariesScore(retireJsResults) {
  let score = 0;

  if (retireJsResults.length === 0) {
    console.log('No vulnerabilities found by RetireJS');
    return score;
  }

  retireJsResults.forEach(result => {
    result.results.forEach(vulnerability => {
      if (vulnerability.severity) {
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
          break; // No additional score for 'none'
        }
      }
    });
  });

  return score;
}
