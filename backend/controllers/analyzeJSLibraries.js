const { exec } = require("child_process");


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

module.exports = analyzeJSLibraries;