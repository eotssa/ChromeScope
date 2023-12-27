const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const admZip = require("adm-zip")
const fs = require("fs")
const {
  createTempDirectory,
  deleteTempDirectory,
} = require("../utils/fileUltils")
const { exec } = require("child_process") // Used to run retire.js as a command line tool

// File filter function for multer
const fileFilter = (req, file, cb) => {
  const filetypes = /crx|zip/
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

  if (extname) {
    return cb(null, true)
  } else {
    cb(
      new Error(
        "Error: File upload only supports the following filetypes - .crx, .zip"
      )
    )
  }
}

// Set up file storage in memory with file filter
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: fileFilter,
})

function parseCRX(buffer) {
  const magic = buffer.readUInt32LE(0)
  //console.log(`Magic number: 0x${magic.toString(16)}`) // Should be 0x43723234 for 'Cr24'

  if (magic !== 0x34327243) {
    // https://searchfox.org/mozilla-central/source/modules/libjar/nsZipArchive.cpp
    throw new Error("Not a valid CRX file")
  }

  const version = buffer.readUInt32LE(4)
  //console.log(`CRX version: ${version}`)
  let zipStart

  if (version === 2) {
    const publicKeyLength = buffer.readUInt32LE(8)
    const signatureLength = buffer.readUInt32LE(12)
    zipStart = 16 + publicKeyLength + signatureLength
  } else if (version === 3) {
    const headerSize = buffer.readUInt32LE(8)
    zipStart = 12 + headerSize
  } else {
    throw new Error("Unsupported CRX version")
  }

  return buffer.slice(zipStart)
}

router.post("/", upload.single("extensionFile"), async (req, res, next) => {
  // Check if file is uploaded
  if (!req.file) {
    return res.status(400).send("No file uploaded.")
  }

  let tempPath = createTempDirectory()

  try {
    const fileBuffer = req.file.buffer

    let zipBuffer
    if (path.extname(req.file.originalname).toLowerCase() === ".crx") {
      zipBuffer = parseCRX(fileBuffer) // Implement this function based on your requirements
    } else {
      zipBuffer = fileBuffer // For zip files, use the buffer directly
    }

    const zip = new admZip(zipBuffer)
    zip.extractAllTo(tempPath, true)

    let manifest
    try {
      manifest = JSON.parse(zip.readAsText("manifest.json"))
    } catch (jsonError) {
      next(new Error("Manifest JSON parsing failed"))
      return
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
      name: manifest.name || "No name specified",
      version: manifest.version || "No version specified",
      description: manifest.description || "No description specified",
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
  } catch (err) {
    console.error(err)
    next(err)
  } finally {
    deleteTempDirectory(tempPath)
  }
})

async function readFiles(directoryPath, basePath = directoryPath) {
  let fileContents = {}

  try {
    const files = fs.readdirSync(directoryPath)

    for (const file of files) {
      const fullPath = path.join(directoryPath, file)
      const relativePath = path.relative(basePath, fullPath) // Get relative path

      if (fs.statSync(fullPath).isDirectory()) {
        const nestedFiles = await readFiles(fullPath, basePath)
        fileContents = { ...fileContents, ...nestedFiles }
      } else if (path.extname(file) === ".js") {
        const content = fs.readFileSync(fullPath, "utf-8")
        fileContents[relativePath] = content // Use relative path as key
      }
    }

    return fileContents
  } catch (err) {
    throw new Error(`Error reading files: ${err.message}`)
  }
}

const { ESLint } = require("eslint")

//TODO: limit file size and minified files
//TOD: consider running eslint in a isolated environment / docker container
async function runESLintOnDirectory(directoryPath) {
  const eslint = new ESLint({
    useEslintrc: false,
    baseConfig: {
      plugins: ["security"],
      extends: ["plugin:security/recommended"],
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

  for (const file in fileContents) {
    const content = fileContents[file]
    const regex = /chrome\.\w+(\.\w+)?/g
    const matches = content.match(regex) || []

    matches.forEach((api) => {
      if (!chromeAPIUsage[file]) {
        chromeAPIUsage[file] = [api]
      } else if (!chromeAPIUsage[file].includes(api)) {
        chromeAPIUsage[file].push(api)
      }
    })
  }

  return chromeAPIUsage
}

// Recursive function to find CSP in the manifest object
function findCSP(obj) {
  if (typeof obj === "object" && obj !== null) {
    for (let key in obj) {
      if (key.toLowerCase() === "content_security_policy") {
        if (typeof obj[key] === "string") {
          return obj[key]
        } else if (typeof obj[key] === "object") {
          // If the CSP is nested within an object
          return findCSP(obj[key])
        }
      } else if (typeof obj[key] === "object") {
        let result = findCSP(obj[key])
        if (result) return result
      }
    }
  }
  return null
}

function analyzeCSP(manifest) {
  let score = 0
  let cspDetails = {} // Initialize cspDetails
  const csp = findCSP(manifest)

  if (!csp) {
    score += 25 // No CSP present
    cspDetails["warning:"] = "NO CSP DEFINED"
  } else {
    const policies = csp.split(";").filter(Boolean)
    policies.forEach((policy) => {
      const policyParts = policy.split(" ").filter(Boolean)
      const directive = policyParts.shift() // e.g., 'script-src', 'object-src'

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
    manifestVersion: manifest.manifest_version || "Unknown",
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
    analysisResult.backgroundScripts = manifest.background.scripts || []
    if (manifest.background.service_worker) {
      analysisResult.backgroundScripts.push(manifest.background.service_worker)
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
    analysisResult.webAccessibleResources = manifest.web_accessible_resources
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
  ;["chrome_url_overrides", "chrome_settings_overrides"].forEach((key) => {
    if (manifest[key]) {
      analysisResult.specificOverrides.push(key)
    }
  })

  // Developer Information
  if (manifest.author) {
    analysisResult.developerInfo.author = manifest.author
  }

  // Chrome OS Specific Keys
  ;["file_browser_handlers", "input_components"].forEach((key) => {
    if (manifest[key]) {
      analysisResult.chromeOsKeys.push(key)
    }
  })

  return analysisResult
}

async function analyzeJSLibraries(extensionPath) {
  return new Promise((resolve, reject) => {
    const retireCmd = `retire --jspath "${extensionPath}" --outputformat json`
    exec(retireCmd, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (stderr) {
        reject(error || stderr)
      } else {
        try {
          const results = JSON.parse(stdout)
          resolve(results.data || [])
        } catch (parseError) {
          reject(parseError)
        }
      }
    })
  })
}

function calculateJSLibrariesScore(retireJsResults) {
  let score = 0
  let jsLibrariesDetails = {}

  // Debugging: log the retireJsResults to inspect the structure
  //console.log("Retire.js Results:", JSON.stringify(retireJsResults, null, 2))

  retireJsResults.forEach((fileResult) => {
    fileResult?.results?.forEach((library) => {
      library?.vulnerabilities?.forEach((vulnerability, index) => {
        const vulnKey = `${library.component}-vuln-${index}`
        score += determineVulnerabilityScore(vulnerability)

        jsLibrariesDetails[vulnKey] = {
          component: library.component,
          severity: vulnerability.severity?.toLowerCase(),
          info: vulnerability.info?.join(", "),
          summary: vulnerability.identifiers?.summary,
          CVE: vulnerability.identifiers?.CVE?.join(", ") || "",
        }
      })
    })
  })
  console.log(jsLibrariesDetails)

  return { score, jsLibrariesDetails }
}

function determineVulnerabilityScore(vulnerability) {
  switch (vulnerability.severity.toLowerCase()) {
    case "low":
      return 10
    case "medium":
      return 20
    case "high":
      return 30
    case "critical":
      return 40
    default:
      return 0
  }
}

function analyzePermissions(manifest) {
  let score = 0
  let permissionsDetails = {}

  const permissions = (manifest.permissions || []).concat(
    manifest.optional_permissions || []
  )

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
    alarms: "least",
    contextMenus: "least",
    "enterprise.deviceAttributes": "least",
    fileBrowserHandler: "least",
    fontSettings: "least",
    gcm: "least",
    idle: "least",
    power: "least",
    "system.cpu": "least",
    "system.display": "least",
    "system.memory": "least",
    tts: "least",
    unlimitedStorage: "least",
    wallpaper: "least",
    externally_connectable: "least",
    mediaGalleries: "least",

    // 'low' risk
    printerProvider: "low",
    certificateProvider: "low",
    documentScan: "low",
    "enterprise.platformKeys": "low",
    hid: "low",
    identity: "low",
    "networking.config": "low",
    notifications: "low",
    platformKeys: "low",
    usbDevices: "low",
    webRequestBlocking: "low",
    overrideEscFullscreen: "low",

    // 'medium' risk
    activeTab: "medium",
    background: "medium",
    bookmarks: "medium",
    clipboardWrite: "medium",
    downloads: "medium",
    fileSystemProvider: "medium",
    management: "medium",
    nativeMessaging: "medium",
    geolocation: "medium",
    processes: "medium",
    signedInDevices: "medium",
    storage: "medium",
    "system.storage": "medium",
    tabs: "medium",
    topSites: "medium",
    ttsEngine: "medium",
    webNavigation: "medium",
    syncFileSystem: "medium",
    fileSystem: "medium",

    // 'high' risk
    clipboardRead: "high",
    contentSettings: "high",
    desktopCapture: "high",
    displaySource: "high",
    dns: "high",
    experimental: "high",
    history: "high",
    "http://*/*": "high",
    "https://*/*": "high",
    "file:///*": "high",
    "http://*/": "high",
    "https://*/": "high",
    mdns: "high",
    pageCapture: "high",
    privacy: "high",
    proxy: "high",
    vpnProvider: "high",
    browsingData: "high",
    audioCapture: "high",
    videoCapture: "high",

    // 'critical' risk
    cookies: "critical",
    debugger: "critical",
    declarativeWebRequest: "critical",
    webRequest: "critical",
    "<all_urls>": "critical",
    "*://*/*": "critical",
    "*://*/": "critical",
    content_security_policy: "critical",
    declarativeNetRequest: "critical",
    copresence: "critical",
    usb: "critical",
    "unsafe-eval": "critical",
    web_accessible_resources: "critical",
  }

  permissions.forEach((permission) => {
    const riskLevel = permissionRiskLevels[permission] || "least"
    score += riskScores[riskLevel]

    if (riskLevel !== "least") {
      permissionsDetails[
        permission
      ] = `Permission '${permission}' classified as ${riskLevel} risk.`
    }
  })

  return { score, details: permissionsDetails }
}

module.exports = router
