const express = require("express")
const cors = require("cors")
const uploadRoutes = require("./routes/upload")
const convertAndUpload = require("./routes/convert-and-upload")

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static("dist"))

app.use("/upload", uploadRoutes)
app.use("/convert-and-upload", convertAndUpload)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).send("Internal Server Error")
})

module.exports = app
