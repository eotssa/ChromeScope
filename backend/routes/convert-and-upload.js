const express = require("express")
const router = express.Router()
const axios = require("axios")
const multer = require("multer")
const { Readable } = require("stream")
const fs = require("fs")
const path = require("path") // Import the path module

// ... [rest of your script]

// Set up file storage in memory
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

function buildDownloadLink(extensionId) {
  const baseUrl =
    "https://clients2.google.com/service/update2/crx?response=redirect&prodversion=49.0&acceptformat=crx3&x=id%3D***%26installsource%3Dondemand%26uc"
  return baseUrl.replace("***", extensionId)
}

function parseCRX(buffer) {
  const magic = buffer.readUInt32LE(0)
  console.log(`Magic number: 0x${magic.toString(16)}`) // Should be 0x43723234 for 'Cr24'

  if (magic !== 0x34327243) {
    // 0x43723234 DEF NOT THIS? // SHOULD BE 0x34327243 -- https://searchfox.org/mozilla-central/source/modules/libjar/nsZipArchive.cpp
    throw new Error("Not a valid CRX file")
  }

  const version = buffer.readUInt32LE(4)
  console.log(`CRX version: ${version}`)
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

function bufferToStream(buffer) {
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null) // Indicates the end of the stream
  return stream
}

function getExtensionIdFromLink(urlOrId) {
  // Updated Regex for extracting ID from a Chrome Web Store URL
  const urlPattern =
    /^https?:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com)\/detail\/[a-zA-Z0-9\-_]+\/([a-zA-Z0-9]+)$/
  const idPattern = /^[a-zA-Z0-9]+$/ // Regex for matching a standalone ID

  const urlMatch = urlOrId.match(urlPattern)
  if (urlMatch) {
    return urlMatch[2] // Return the ID from the URL
  }

  const idMatch = urlOrId.match(idPattern)
  if (idMatch) {
    return urlOrId // Return the ID directly
  }

  return null // Return null if neither pattern matches
}

router.post("/", upload.single("extensionFile"), async (req, res, next) => {
  try {
    const extensionUrl = req.body.extensionUrl
    const extensionId = getExtensionIdFromLink(extensionUrl)

    if (!extensionId) {
      return res.status(400).send("Invalid extension URL")
    }

    const downloadLink = buildDownloadLink(extensionId)
    const response = await axios.get(downloadLink, {
      responseType: "arraybuffer",
    })
    const crxBuffer = Buffer.from(response.data)
    console.log(`Downloaded CRX file size: ${crxBuffer.length} bytes`)

    // Save the CRX file for inspection
    const crxFilePath = path.join(
      "C:\\Users\\Wilson\\Desktop",
      `${extensionId}.crx`
    )
    fs.writeFileSync(crxFilePath, crxBuffer)
    console.log(`CRX file saved to ${crxFilePath}`)

    const zipBuffer = parseCRX(crxBuffer)

    // Save the ZIP buffer to a file on the desktop
    const zipFilePath = path.join("C:\\Users\\Wilson\\Desktop", "output.zip")
    fs.writeFileSync(zipFilePath, zipBuffer)
    console.log(`ZIP file saved to ${zipFilePath}`)

    res.json({ message: "File processed successfully" })
  } catch (err) {
    console.error(err)
    next(err)
  }
})

module.exports = router
