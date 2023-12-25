const express = require("express")
const cors = require("cors")
const uploadRoutes = require("./routes/upload")
const link = require("./routes/link")
const rateLimit = require("express-rate-limit")

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static("dist"))

// rate limiting middleware -- applies to all routes at the moment
app.use(limiter)

app.use("/upload", uploadRoutes)
app.use("/link", link)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).send("Internal Server Error")
})

module.exports = app
