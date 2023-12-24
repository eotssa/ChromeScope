async function analyzeChromeAPIUsage(directoryPath) {
  let chromeAPIUsage = []

  const files = fs.readdirSync(directoryPath)

  for (const file of files) {
    const fullPath = path.join(directoryPath, file)
    if (fs.statSync(fullPath).isDirectory()) {
      // Recursively analyze nested directories
      const nestedUsage = await analyzeChromeAPIUsage(fullPath)
      chromeAPIUsage = [...chromeAPIUsage, ...nestedUsage]
    } else if (path.extname(file) === ".js") {
      const content = fs.readFileSync(fullPath, "utf-8")
      const regex = /chrome\.\w+/g // Regex to find "chrome.[something]"
      const matches = content.match(regex) || []

      matches.forEach((api) => {
        if (
          !chromeAPIUsage.some(
            (usage) => usage.api === api && usage.file === file
          )
        ) {
          chromeAPIUsage.push({ file, api })
        }
      })
    }
  }

  return chromeAPIUsage
}

module.export = analyzeChromeAPIUsage
