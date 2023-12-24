const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const baseTempDir = process.env.TEMP_DIR || "/tmp";

function createTempDirectory() {
  const tempDir = path.join(baseTempDir, uuidv4());
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

function deleteTempDirectory(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.rmSync(directoryPath, { recursive: true, force: true });
  }
}

module.exports = { createTempDirectory, deleteTempDirectory };