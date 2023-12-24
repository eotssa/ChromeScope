// Recursive function to find CSP in the manifest object
function findCSP(obj) {
  if (typeof obj === "object" && obj !== null) {
    for (let key in obj) {
      if (key.toLowerCase() === "content_security_policy") {
        if (typeof obj[key] === "string") {
          return obj[key];
        } else if (typeof obj[key] === "object") {
          // If the CSP is nested within an object
          return findCSP(obj[key]);
        }
      } else if (typeof obj[key] === "object") {
        let result = findCSP(obj[key]);
        if (result) return result;
      }
    }
  }
  return null;
}

module.exports = findCSP;