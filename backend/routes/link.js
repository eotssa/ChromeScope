const express = require('express')
const router = express.Router()
const axios = require('axios')
const AdmZip = require('adm-zip')
const multer = require('multer')
const { Readable } = require('stream')
const fs = require('fs')
const path = require('path')
const {
  createTempDirectory,
  deleteTempDirectory,
} = require('../utils/fileUltils')
const { exec } = require('child_process') // Used to run retire.js as a command line tool
const { ESLint } = require('eslint')

const fsPromises = fs.promises
const util = require('util')
const execAsync = util.promisify(exec)

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB limit
const ALLOWED_HOSTS = [
  'chrome.google.com',
  'chromewebstore.google.com',
  // Add any other hosts for future implementations ... e.g., Firefox
]
const TIMEOUT_DURATION = 60000 // 60 seconds

// Set up file storage in memory
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
})

// ----- TESTING #1: get_crx_url (inspired by Rob Wu's code) -----

// Returns minimal platform info. Adjust as needed.
function getPlatformInfo() {
  // In a real environment, you might detect process.platform etc.
  return {
    os: 'Windows',
    arch: 'x86-64',
    nacl_arch: 'x86-64',
  }
}

// Extracts the 32-character extension ID from a full URL or a raw ID.
function get_extensionID(urlOrId) {
  const urlPattern =
    /^https?:\/\/(?:chromewebstore\.google\.com\/detail\/[\w-]+\/|chrome\.google\.com\/webstore\/detail\/[\w-]+\/)([a-zA-Z0-9]{32})$/
  const idPattern = /^[a-zA-Z0-9]{32}$/
  const urlMatch = urlOrId.match(urlPattern)
  if (urlMatch?.[1]) return urlMatch[1]
  if (idPattern.test(urlOrId)) return urlOrId
  throw new Error(`Invalid extension URL/ID format: ${urlOrId}`)
}

// Builds the CRX download URL using dynamic parameters.
function get_crx_url(extensionUrlOrId) {
  const extensionID = get_extensionID(extensionUrlOrId)
  if (!/^[a-z]{32}$/.test(extensionID)) {
    throw new Error('Invalid extension ID format')
  }

  const platformInfo = getPlatformInfo()

  // Use a modern Chrome user agent string.
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  const cr_version = /Chrome\/((\d+)\.0\.(\d+)\.\d+)/.exec(userAgent)
  let product_version = '9999.0.9999.0'
  if (cr_version && +cr_version[2] >= 88) {
    product_version = cr_version[1]
  }
  const product_id = 'chromecrx'
  const product_channel = 'unknown'

  let url = 'https://clients2.google.com/service/update2/crx?response=redirect'
  url += '&os=' + platformInfo.os
  url += '&arch=' + platformInfo.arch
  url += '&os_arch=' + platformInfo.arch // For consistency.
  url += '&nacl_arch=' + platformInfo.nacl_arch
  url += '&prod=' + product_id
  url += '&prodchannel=' + product_channel
  url += '&prodversion=' + product_version
  url += '&acceptformat=crx2,crx3'
  url += '&x=id%3D' + extensionID + '%26uc'
  return url
}

// ----- END TESTING #1 -----

// Function to parse CRX files
function parseCRX(buffer) {
  console.log('CRX Buffer Length:', buffer.length)
  console.log('CRX Magic Number:', buffer.readUInt32LE(0).toString(16))

  const magic = buffer.readUInt32LE(0)
  if (magic !== 0x34327243) {
    throw new Error('Not a valid CRX file')
  }

  const version = buffer.readUInt32LE(4)
  console.log('CRX Version:', version)

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

  console.log('Zip Start Position:', zipStart)
  return buffer.slice(zipStart)
}

function bufferToStream(buffer) {
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)
  return stream
}

function getExtensionIdFromLink(urlOrId) {
  const urlPattern =
    /^https?:\/\/(?:chromewebstore\.google\.com\/detail\/[\w-]+\/|chrome\.google\.com\/webstore\/detail\/[\w-]+\/)([a-zA-Z0-9]{32})$/
  const idPattern = /^[a-zA-Z0-9]{32}$/
  const urlMatch = urlOrId.match(urlPattern)
  if (urlMatch?.[1]) return urlMatch[1]
  if (idPattern.test(urlOrId)) return urlOrId
  throw new Error(`Invalid extension URL/ID format: ${urlOrId}`)
}

router.post('/', upload.single('extensionUrl'), async (req, res) => {
  try {
    req.setTimeout(TIMEOUT_DURATION)
    let tempPath = createTempDirectory()

    try {
      const extensionUrl = req.body.extensionUrl
      if (!extensionUrl) {
        throw new Error('Extension URL or ID is required')
      }

      // Validate extension URL/ID.
      const extensionId = getExtensionIdFromLink(extensionUrl)
      if (!extensionId) {
        throw new Error('Invalid or disallowed extension URL or ID')
      }

      // FIX: Use the proper variable (extensionUrl) instead of undefined extensionUrlOrId.
      const downloadLink = get_crx_url(extensionUrl)
      // Alternatively, you can also call: const downloadLink = get_crx_url(extensionId)

      let crxBuffer
      try {
        const response = await axios.get(downloadLink, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Referer: 'https://chrome.google.com/',
          },
        })

        console.log('Response Status:', response.status)
        console.log('Response Headers:', response.headers)
        console.log('Response Data Length:', response.data?.length || 0)

        crxBuffer = Buffer.from(response.data)

        if (crxBuffer.length === 0) {
          throw new Error('Downloaded file is empty')
        }
      } catch (axiosError) {
        console.error('Axios Error:', {
          message: axiosError.message,
          status: axiosError.response?.status,
          url: axiosError.config?.url,
          headers: axiosError.response?.headers,
        })
        throw new Error(
          `Failed to download extension (HTTP ${axiosError.response?.status})`
        )
      }

      let zipBuffer, zip // Declare zip in the outer scope
      try {
        zipBuffer = parseCRX(crxBuffer)
        zip = new AdmZip(zipBuffer)

        // Validate ZIP contents
        if (zip.getEntries().length === 0) {
          throw new Error('CRX file contains empty/invalid ZIP')
        }

        zip.extractAllTo(tempPath, true)
      } catch (crxError) {
        throw new Error(`CRX processing failed: ${crxError.message}`)
      }

      let manifestContent
      try {
        // First try root manifest
        manifestContent = zip.readAsText('manifest.json')
      } catch {
        // Fallback: Search for manifest in other locations
        const entries = zip.getEntries()
        const manifestEntry = entries.find((e) =>
          e.name.endsWith('manifest.json')
        )
        if (manifestEntry) {
          manifestContent = manifestEntry.getData().toString()
        } else {
          throw new Error('No manifest.json found in extension')
        }
      }

      // Parse manifest content to JSON.
      const manifest = JSON.parse(manifestContent)
      const manifestAnalysis = analyzeManifest(manifest)

      const fileContents = await readFiles(tempPath)
      const chromeAPIUsageDetails = analyzeChromeAPIUsage(fileContents)
      const dataHandlingDetails = analyzeDataHandling(fileContents)

      const retireJsResults = await analyzeJSLibraries(tempPath)
      const { score: jsLibrariesScore, jsLibrariesDetails } =
        calculateJSLibrariesScore(retireJsResults)
      const eslintResults = await runESLintOnDirectory(tempPath)

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
      deleteTempDirectory(tempPath)
    }
  } catch (err) {
    console.error(err)
    res.status(500).send('An error occurred during analysis.')
  }
})

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
        if (file.endsWith('.min.js')) continue
        if (fileStat.size > 1024 * 1024) continue // Skip large files
        const content = await fsPromises.readFile(fullPath, 'utf-8')
        fileContents[relativePath] = content
      }
    }
    return fileContents
  } catch (err) {
    throw new Error(`Error reading files: ${err.message}`)
  }
}

async function runESLintOnDirectory(directoryPath) {
  const eslint = new ESLint({
    useEslintrc: false,
    baseConfig: {
      plugins: ['security'],
      extends: ['plugin:security/recommended'],
      rules: {
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
      },
      env: {
        browser: true,
        es6: true,
        worker: true,
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
  const deprecatedAPIs = [
    'chrome.browserAction',
    'chrome.extension',
    'chrome.webRequest',
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

function findCSP(manifest) {
  if (manifest.content_security_policy) {
    if (typeof manifest.content_security_policy === 'string') {
      return manifest.content_security_policy
    } else if (typeof manifest.content_security_policy === 'object') {
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
    score += 25
    cspDetails['warning'] = 'NO CSP DEFINED'
  } else {
    const policies = csp.split(';').filter(Boolean)
    policies.forEach((policy) => {
      const policyParts = policy.trim().split(/\s+/)
      const directive = policyParts.shift()
      policyParts.forEach((source) => {
        if (source !== "'self'") {
          score += 1
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
  if (manifest.background) {
    if (manifest.background.service_worker) {
      analysisResult.backgroundScripts.push(manifest.background.service_worker)
    } else if (manifest.background.scripts) {
      analysisResult.backgroundScripts = manifest.background.scripts
    }
  }
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach((script) => {
      analysisResult.contentScriptsDomains =
        analysisResult.contentScriptsDomains.concat(script.matches)
    })
  }
  if (manifest.web_accessible_resources) {
    analysisResult.webAccessibleResources =
      manifest.web_accessible_resources.map((resource) => {
        if (typeof resource === 'string') {
          return { resources: [resource], matches: ['<all_urls>'] }
        } else {
          return resource
        }
      })
  }
  if (manifest.externally_connectable) {
    analysisResult.externallyConnectable =
      manifest.externally_connectable.matches || []
  }
  if (manifest.update_url) {
    analysisResult.updateUrl = manifest.update_url
  }
  if (manifest.oauth2) {
    analysisResult.oauth2 = true
  }
  ;['chrome_url_overrides', 'chrome_settings_overrides'].forEach((key) => {
    if (manifest[key]) {
      analysisResult.specificOverrides.push(key)
    }
  })
  if (manifest.author) {
    analysisResult.developerInfo.author = manifest.author
  }
  ;['file_browser_handlers', 'input_components'].forEach((key) => {
    if (manifest[key]) {
      analysisResult.chromeOsKeys.push(key)
    }
  })
  return analysisResult
}

async function analyzeJSLibraries(extensionPath) {
  const retireCmd = `retire --jspath "${extensionPath}" --outputformat json`
  try {
    const { stdout } = await execAsync(retireCmd, { maxBuffer: 1024 * 1024 })
    const results = JSON.parse(stdout)
    return results.data || []
  } catch (error) {
    // Retire.js may exit with a non-zero code when vulnerabilities are found.
    if (error.stdout) {
      try {
        const results = JSON.parse(error.stdout)
        return results.data || []
      } catch (parseError) {
        console.error('Failed to parse stdout from retire.js:', error.stdout)
        throw new Error(`Retire.js analysis failed: ${parseError.message}`)
      }
    }
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
  const permissions = (manifest.permissions || [])
    .concat(manifest.optional_permissions || [])
    .concat(manifest.host_permissions || [])
  const riskScores = {
    least: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }
  const permissionRiskLevels = {
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
      permissionsDetails[permission] =
        `Permission '${permission}' classified as ${riskLevel} risk.`
    }
  })
  return { score, details: permissionsDetails }
}

module.exports = router
