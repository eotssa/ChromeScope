function analyzePermissions(manifest, permissionsDetails) {
  let score = 0;
  const permissions = (manifest.permissions || []).concat(manifest.optional_permissions || []);

  // Risk scores for different permission categories
  const riskScores = {
    "least": 0, // No risk or negligible risk
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4 // Extremely high risk
  };

  // Map permissions to their respective risk categories
  const permissionRiskLevels = {
    // Assigning permissions to 'least' risk
    "alarms": "least",
    "contextMenus": "least",
    "enterprise.deviceAttributes": "least",
    "fileBrowserHandler": "least",
    "fontSettings": "least",
    "gcm": "least",
    "idle": "least",
    "power": "least",
    "system.cpu": "least",
    "system.display": "least",
    "system.memory": "least",
    "tts": "least",
    "unlimitedStorage": "least",
    "wallpaper": "least",
    "externally_connectable": "least",
    "mediaGalleries": "least",

    // Assigning permissions to 'low' risk
    "printerProvider": "low",
    "certificateProvider": "low",
    "documentScan": "low",
    "enterprise.platformKeys": "low",
    "hid": "low",
    "identity": "low",
    "networking.config": "low",
    "notifications": "low",
    "platformKeys": "low",
    "usbDevices": "low",
    "webRequestBlocking": "low",
    "overrideEscFullscreen": "low",


    // Assigning permissions to 'medium' risk
    "activeTab": "medium",
    "background": "medium",
    "bookmarks": "medium",
    "clipboardWrite": "medium",
    "downloads": "medium",
    "fileSystemProvider": "medium",
    "management": "medium",
    "nativeMessaging": "medium",
    "geolocation": "medium",
    "processes": "medium",
    "signedInDevices": "medium",
    "storage": "medium",
    "system.storage": "medium",
    "tabs": "medium",
    "topSites": "medium",
    "ttsEngine": "medium",
    "webNavigation": "medium",
    "syncFileSystem": "medium",
    "fileSystem": "medium",

    // Assigning permissions to 'high' risk
    "clipboardRead": "high",
    "contentSettings": "high",
    "desktopCapture": "high",
    "displaySource": "high",
    "dns": "high",
    "experimental": "high",
    "history": "high",
    "http://*/*": "high",
    "https://*/*": "high",
    "file:///*": "high",
    "http://*/": "high",
    "https://*/": "high",
    "mdns": "high",
    "pageCapture": "high",
    "privacy": "high",
    "proxy": "high",
    "vpnProvider": "high",
    "browsingData": "high",
    "audioCapture": "high",
    "videoCapture": "high",

    // Assigning permissions to 'critical' risk
    "cookies": "critical",
    "debugger": "critical",
    "declarativeWebRequest": "critical",
    "webRequest": "critical",
    "<all_urls>": "critical",
    "*://*/*": "critical",
    "*://*/": "critical",
    "content_security_policy": "critical",
    "declarativeNetRequest": "critical",
    "copresence": "critical",
    "usb": "critical",
    "unsafe-eval": "critical",
    "web_accessible_resources": "critical"
  };

  permissions.forEach(permission => {
    const riskLevel = permissionRiskLevels[permission] || "least";
    score += riskScores[riskLevel];
    if (riskLevel !== "least") {
      permissionsDetails[permission] = `Permission '${permission}' classified as ${riskLevel} risk.`;
    }
  });

  return score;
}

module.export = analyzePermissions;