// Import necessary modules
const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const admZip = require('adm-zip')
const fs = require('fs')
const {
  createTempDirectory,
  deleteTempDirectory,
} = require('../utils/fileUltils')
const { exec } = require('child_process') // Used to run retire.js as a command line tool
const { ESLint } = require('eslint')

// Import util.promisify for converting callback-based functions to promises
const util = require('util')
const execAsync = util.promisify(exec)

// **Added**: Use async versions of fs methods for better performance
const fsPromises = fs.promises

// **Added**: Configuration variables
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB limit
const ALLOWED_FILE_TYPES = /crx|zip/
const UPLOAD_FIELD_NAME = 'extensionFile'

// **Security Enhancement**: Limit acceptable file types and size
const fileFilter = (req, file, cb) => {
  const extname = ALLOWED_FILE_TYPES.test(
    path.extname(file.originalname).toLowerCase()
  )

  if (extname) {
    return cb(null, true)
  } else {
    cb(
      new Error(
        'Error: File upload only supports the following filetypes - .crx, .zip'
      )
    )
  }
}

// Set up file storage in memory with file filter
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter,
})

// Function to parse CRX files
function parseCRX(buffer) {
  const magic = buffer.readUInt32LE(0)

  if (magic !== 0x34327243) {
    throw new Error('Not a valid CRX file')
  }

  const version = buffer.readUInt32LE(4)
  let zipStart

  if (version === 2) {
    const publicKeyLength = buffer.readUInt32LE(8)
    const signatureLength = buffer.readUInt32LE(12)
    zipStart = 16 + publicKeyLength + signatureLength
  } else if (version === 3) {
    const headerSize = buffer.readUInt32LE(8)
    zipStart = 12 + headerSize
  } else {
    throw new Error('Unsupported CRX version')
  }

  return buffer.slice(zipStart)
}

// **Security Enhancement**: Wrap route handler in async error handling middleware
router.post('/', upload.single(UPLOAD_FIELD_NAME), async (req, res, next) => {
  try {
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).send('No file uploaded.')
    }

    let tempPath = createTempDirectory()

    try {
      const fileBuffer = req.file.buffer

      let zipBuffer
      if (path.extname(req.file.originalname).toLowerCase() === '.crx') {
        zipBuffer = parseCRX(fileBuffer)
      } else {
        zipBuffer = fileBuffer // For zip files, use the buffer directly
      }

      const zip = new admZip(zipBuffer)
      zip.extractAllTo(tempPath, true)

      let manifest
      try {
        manifest = JSON.parse(zip.readAsText('manifest.json'))
      } catch (jsonError) {
        throw new Error('Manifest JSON parsing failed')
      }

      const manifestAnalysis = analyzeManifest(manifest)

      const fileContents = await readFiles(tempPath)
      const chromeAPIUsageDetails = analyzeChromeAPIUsage(fileContents)
      const dataHandlingDetails = analyzeDataHandling(fileContents)

      const retireJsResults = await analyzeJSLibraries(tempPath)
      const { score: jsLibrariesScore, jsLibrariesDetails } =
        calculateJSLibrariesScore(retireJsResults)
      const eslintResults = await runESLintOnDirectory(tempPath)

      // Calculate CSP and Permissions scores
      const cspAnalysis = analyzeCSP(manifest)
      const permissionsAnalysis = analyzePermissions(manifest)

      const totalRiskScore =
        cspAnalysis.score + permissionsAnalysis.score + jsLibrariesScore

      const result = {
        name: manifest.name || 'No name specified',
        version: manifest.version || 'No version specified',
        description: manifest.description || 'No description specified',
        totalRiskScore: totalRiskScore || 0,
        breakdownRiskScore: {
          content_security_policy: cspAnalysis.score,
          permissions: permissionsAnalysis.score,
          jsLibrariesScore,
          chromeAPIUsage: Object.keys(chromeAPIUsageDetails).length,
          eslintIssues_notScored: eslintResults.totalIssues,
        },
        details: {
          manifestAnalysis,
          jsLibrariesDetails,
          chromeAPIUsage: chromeAPIUsageDetails,
          dataHandling: dataHandlingDetails,
          eslintDetails: eslintResults,
        },
      }

      res.json(result)
    } finally {
      // **Improvement**: Ensure temp directory is deleted even if an error occurs
      deleteTempDirectory(tempPath)
    }
  } catch (err) {
    // **Improvement**: Better error handling
    console.error(err)
    res.status(500).send('An error occurred during analysis.')
  }
})

// **Improvement**: Use asynchronous file operations
async function readFiles(directoryPath, basePath = directoryPath) {
  let fileContents = {}

  try {
    const files = await fsPromises.readdir(directoryPath)

    for (const file of files) {
      const fullPath = path.join(directoryPath, file)
      const relativePath = path.relative(basePath, fullPath)

      const fileStat = await fsPromises.stat(fullPath)

      if (fileStat.isDirectory()) {
        const nestedFiles = await readFiles(fullPath, basePath)
        fileContents = { ...fileContents, ...nestedFiles }
      } else if (path.extname(file) === '.js') {
        // **Improvement**: Skip minified files
        if (file.endsWith('.min.js')) continue

        // **Improvement**: Limit file size to avoid processing large files
        if (fileStat.size > 1024 * 1024) continue // Skip files larger than 1MB

        const content = await fsPromises.readFile(fullPath, 'utf-8')
        fileContents[relativePath] = content
      }
    }

    return fileContents
  } catch (err) {
    throw new Error(`Error reading files: ${err.message}`)
  }
}

// **Improvement**: Run ESLint in a sandboxed environment (conceptual, requires setup)
// For the purposes of this example, we'll proceed without actual sandboxing
async function runESLintOnDirectory(directoryPath) {
  const eslint = new ESLint({
    useEslintrc: false,
    baseConfig: {
      plugins: ['security'],
      extends: ['plugin:security/recommended'],
      rules: {
        // Added rules specific to Manifest V3
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        // Add more rules as needed
      },
      env: {
        browser: true,
        es6: true,
        worker: true, // For service workers
      },
    },
  })

  const results = await eslint.lintFiles([`${directoryPath}/**/*.js`])

  let summary = {
    totalIssues: 0,
    errors: 0,
    warnings: 0,
    commonIssues: {},
  }

  results.forEach((result) => {
    result.messages.forEach((msg) => {
      summary.totalIssues++
      if (msg.severity === 2) {
        summary.errors++
      } else {
        summary.warnings++
      }

      // Increment count for each rule ID
      if (summary.commonIssues[msg.ruleId]) {
        summary.commonIssues[msg.ruleId]++
      } else {
        summary.commonIssues[msg.ruleId] = 1
      }
    })
  })

  return summary
}

function analyzeDataHandling(fileContents) {
  let dataHandlingUsage = {}

  const patterns = {
    apiCalls: /fetch\(|axios\.|XMLHttpRequest/g,
    localStorage: /localStorage\./g,
    sessionStorage: /sessionStorage\./g,
    indexedDB: /indexedDB\.open/g,
    webSQL: /openDatabase\(/g,
    cookies: /document\.cookie/g,
    fileAPI: /FileReader\(/g,
    webWorkers: /new Worker\(/g,
    cryptoAPI: /crypto\.subtle\./g,
    dynamicEval: /eval\(|new Function\(/g,
    // **Added**: Disallowed functions in Manifest V3
    disallowedFunctions: /setTimeout\(|setInterval\(/g,
  }

  for (const file in fileContents) {
    const content = fileContents[file]

    Object.keys(patterns).forEach((key) => {
      const matches = content.match(patterns[key]) || []
      if (matches.length > 0) {
        dataHandlingUsage[file] = dataHandlingUsage[file] || {}
        dataHandlingUsage[file][key] =
          (dataHandlingUsage[file][key] || 0) + matches.length
      }
    })
  }

  return dataHandlingUsage
}

function analyzeChromeAPIUsage(fileContents) {
  let chromeAPIUsage = {}
  // Added detection of deprecated APIs
  const deprecatedAPIs = [
    'chrome.browserAction',
    'chrome.extension',
    'chrome.webRequest',
    // Add more deprecated APIs as needed
  ]
  const regex = /chrome\.\w+(\.\w+)?/g

  for (const file in fileContents) {
    const content = fileContents[file]
    const matches = content.match(regex) || []

    matches.forEach((api) => {
      if (!chromeAPIUsage[file]) {
        chromeAPIUsage[file] = { usedAPIs: [], deprecatedAPIs: [] }
      }

      if (!chromeAPIUsage[file].usedAPIs.includes(api)) {
        chromeAPIUsage[file].usedAPIs.push(api)
      }

      if (
        deprecatedAPIs.includes(api) &&
        !chromeAPIUsage[file].deprecatedAPIs.includes(api)
      ) {
        chromeAPIUsage[file].deprecatedAPIs.push(api)
      }
    })
  }

  return chromeAPIUsage
}

// Updated function to find CSP in Manifest V3 format
function findCSP(manifest) {
  if (manifest.content_security_policy) {
    if (typeof manifest.content_security_policy === 'string') {
      return manifest.content_security_policy
    } else if (typeof manifest.content_security_policy === 'object') {
      // Handle extension_pages and sandbox
      return (
        manifest.content_security_policy.extension_pages ||
        manifest.content_security_policy.sandbox ||
        null
      )
    }
  }
  return null
}

function analyzeCSP(manifest) {
  let score = 0
  let cspDetails = {}
  const csp = findCSP(manifest)

  if (!csp) {
    score += 25 // No CSP present
    cspDetails['warning'] = 'NO CSP DEFINED'
  } else {
    const policies = csp.split(';').filter(Boolean)
    policies.forEach((policy) => {
      const policyParts = policy.trim().split(/\s+/)
      const directive = policyParts.shift()

      policyParts.forEach((source) => {
        if (source !== "'self'") {
          score += 1 // Increment score for each source excluding 'self'
          cspDetails[directive] = cspDetails[directive] || []
          cspDetails[directive].push(source)
        }
      })
    })
  }

  return { score, details: cspDetails }
}

function analyzeManifest(manifest) {
  let analysisResult = {
    manifestVersion: manifest.manifest_version || 'Unknown',
    cspDetails: analyzeCSP(manifest).details,
    permissionsDetails: analyzePermissions(manifest).details,
    backgroundScripts: [],
    contentScriptsDomains: [],
    webAccessibleResources: [],
    externallyConnectable: [],
    updateUrl: null,
    oauth2: false,
    specificOverrides: [],
    developerInfo: {},
    chromeOsKeys: [],
  }

  // Background Scripts and Service Workers
  if (manifest.background) {
    if (manifest.background.service_worker) {
      analysisResult.backgroundScripts.push(manifest.background.service_worker)
    } else if (manifest.background.scripts) {
      analysisResult.backgroundScripts = manifest.background.scripts
    }
  }

  // Content Scripts
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach((script) => {
      analysisResult.contentScriptsDomains =
        analysisResult.contentScriptsDomains.concat(script.matches)
    })
  }

  // Web Accessible Resources
  if (manifest.web_accessible_resources) {
    analysisResult.webAccessibleResources =
      manifest.web_accessible_resources.map((resource) => {
        if (typeof resource === 'string') {
          // Manifest V2 format
          return { resources: [resource], matches: ['<all_urls>'] }
        } else {
          // Manifest V3 format
          return resource
        }
      })
  }

  // Externally Connectable
  if (manifest.externally_connectable) {
    analysisResult.externallyConnectable =
      manifest.externally_connectable.matches || []
  }

  // Update URL
  if (manifest.update_url) {
    analysisResult.updateUrl = manifest.update_url
  }

  // OAuth2 Information
  if (manifest.oauth2) {
    analysisResult.oauth2 = true
  }

  // Chrome Specific Overrides
  ;['chrome_url_overrides', 'chrome_settings_overrides'].forEach((key) => {
    if (manifest[key]) {
      analysisResult.specificOverrides.push(key)
    }
  })

  // Developer Information
  if (manifest.author) {
    analysisResult.developerInfo.author = manifest.author
  }

  // Chrome OS Specific Keys
  ;['file_browser_handlers', 'input_components'].forEach((key) => {
    if (manifest[key]) {
      analysisResult.chromeOsKeys.push(key)
    }
  })

  return analysisResult
}

async function analyzeJSLibraries(extensionPath) {
  try {
    const retireCmd = `retire --jspath "${extensionPath}" --outputformat json`
    const { stdout } = await execAsync(retireCmd, { maxBuffer: 1024 * 1024 })
    const results = JSON.parse(stdout)
    return results.data || []
  } catch (error) {
    throw new Error(`Retire.js analysis failed: ${error.message}`)
  }
}

function calculateJSLibrariesScore(retireJsResults) {
  let score = 0
  let jsLibrariesDetails = {}

  retireJsResults.forEach((fileResult) => {
    fileResult?.results?.forEach((library) => {
      library?.vulnerabilities?.forEach((vulnerability, index) => {
        const vulnKey = `${library.component}-vuln-${index}`
        score += determineVulnerabilityScore(vulnerability)

        jsLibrariesDetails[vulnKey] = {
          component: library.component,
          severity: vulnerability.severity?.toLowerCase(),
          info: vulnerability.info?.join(', '),
          summary: vulnerability.identifiers?.summary,
          CVE: vulnerability.identifiers?.CVE?.join(', ') || '',
        }
      })
    })
  })

  return { score, jsLibrariesDetails }
}

function determineVulnerabilityScore(vulnerability) {
  switch (vulnerability.severity.toLowerCase()) {
    case 'low':
      return 10
    case 'medium':
      return 20
    case 'high':
      return 30
    case 'critical':
      return 40
    default:
      return 0
  }
}

function analyzePermissions(manifest) {
  let score = 0
  let permissionsDetails = {}

  // Include 'host_permissions' for Manifest V3
  const permissions = (manifest.permissions || [])
    .concat(manifest.optional_permissions || [])
    .concat(manifest.host_permissions || [])

  const riskScores = {
    least: 0, // No risk or negligible risk
    low: 1,
    medium: 2,
    high: 3,
    critical: 4, // Extremely high risk
  }

  // Map permissions to their respective risk categories
  const permissionRiskLevels = {
    // 'least' risk
    alarms: 'least',
    contextMenus: 'least',
    'enterprise.deviceAttributes': 'least',
    fileBrowserHandler: 'least',
    fontSettings: 'least',
    gcm: 'least',
    idle: 'least',
    power: 'least',
    'system.cpu': 'least',
    'system.display': 'least',
    'system.memory': 'least',
    tts: 'least',
    unlimitedStorage: 'least',
    wallpaper: 'least',
    externally_connectable: 'least',
    mediaGalleries: 'least',

    // 'low' risk
    printerProvider: 'low',
    certificateProvider: 'low',
    documentScan: 'low',
    'enterprise.platformKeys': 'low',
    hid: 'low',
    identity: 'low',
    'networking.config': 'low',
    notifications: 'low',
    platformKeys: 'low',
    usbDevices: 'low',
    webRequestBlocking: 'low',
    overrideEscFullscreen: 'low',

    // 'medium' risk
    activeTab: 'medium',
    background: 'medium',
    bookmarks: 'medium',
    clipboardWrite: 'medium',
    downloads: 'medium',
    fileSystemProvider: 'medium',
    management: 'medium',
    nativeMessaging: 'medium',
    geolocation: 'medium',
    processes: 'medium',
    signedInDevices: 'medium',
    storage: 'medium',
    'system.storage': 'medium',
    tabs: 'medium',
    topSites: 'medium',
    ttsEngine: 'medium',
    webNavigation: 'medium',
    syncFileSystem: 'medium',
    fileSystem: 'medium',
    declarativeNetRequest: 'medium',

    // 'high' risk
    clipboardRead: 'high',
    contentSettings: 'high',
    desktopCapture: 'high',
    displaySource: 'high',
    dns: 'high',
    experimental: 'high',
    history: 'high',
    'http://*/*': 'high',
    'https://*/*': 'high',
    'file:///*': 'high',
    'http://*/': 'high',
    'https://*/': 'high',
    mdns: 'high',
    pageCapture: 'high',
    privacy: 'high',
    proxy: 'high',
    vpnProvider: 'high',
    browsingData: 'high',
    audioCapture: 'high',
    videoCapture: 'high',

    // 'critical' risk
    cookies: 'critical',
    debugger: 'critical',
    declarativeWebRequest: 'critical',
    webRequest: 'critical',
    '<all_urls>': 'critical',
    '*://*/*': 'critical',
    '*://*/': 'critical',
    content_security_policy: 'critical',
    declarativeNetRequestWithHostAccess: 'critical',
    copresence: 'critical',
    usb: 'critical',
    'unsafe-eval': 'critical',
    web_accessible_resources: 'critical',
  }

  permissions.forEach((permission) => {
    const riskLevel = permissionRiskLevels[permission] || 'least'
    score += riskScores[riskLevel]

    if (riskLevel !== 'least') {
      permissionsDetails[
        permission
      ] = `Permission '${permission}' classified as ${riskLevel} risk.`
    }
  })

  return { score, details: permissionsDetails }
}

module.exports = router
