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
          case "low":
            score += 10;
            break;
          case "medium":
            score += 20;
            break;
          case "high":
            score += 30;
            break;
          case "critical":
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
            CVE: vulnerability.identifiers.CVE ? vulnerability.identifiers.CVE.join(", ") : ""
          };
        });
      });
    }
  });

  return score;
}

module.exports = calculateJSLibrariesScore;