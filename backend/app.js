const express = require("express")
const cors = require("cors")
const uploadRoutes = require("./routes/upload")
const link = require("./routes/link")
const rateLimit = require("express-rate-limit")

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // limit each IP to 100 requests per windowMs
})

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static("dist"))

// rate limiting middleware -- applies to all routes at the moment
app.use(limiter)
app.set("trust proxy", 1) // Trust first proxy, may be a reverse proxy -- should be ok

app.use("/upload", uploadRoutes)
app.use("/link", link)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err) // Log the full error for server-side debugging

  let errorMessage = "Internal Server Error"
  let statusCode = 500

  switch (err.message) {
    case "Invalid or disallowed URL":
      errorMessage = err.message
      statusCode = 400
      break
    case "Extension URL is required":
      errorMessage = err.message
      statusCode = 400
      break
    case "Not a valid CRX file":
    case "Unsupported CRX version":
      errorMessage = err.message
      statusCode = 422 // Unprocessable Entity
      break
    case "Manifest JSON parsing failed":
      errorMessage = err.message
      statusCode = 422
      break
    case err.message.startsWith("Error reading files:"):
      errorMessage = err.message
      statusCode = 500
      break
    // Add more cases as needed
  }

  res.status(statusCode).json({ error: errorMessage })
})

module.exports = app
