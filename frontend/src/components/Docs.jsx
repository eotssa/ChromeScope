import React from "react"

const Docs = () => {
  return (
    <section className="mx-auto px-4 pt-24 lg:px-44 max-w-4xl">
      <div className="flex flex-col w-full border-opacity-50">
        <div className="grid h-20 card rounded-box place-items-center">
          <article className="prose">
            <h1 className="text-center ">Getting Started with Chromescope</h1>
            <p className="">
              You can integrate ChromeScope into your applications or directly
              interact with our API following the guidelines below.
            </p>
            <p>
              Chromescope automatically detects API calls and responds with
              JSON.
            </p>
            <p>
              Only a free plan is available, so no authentication token is
              required. If you want to use our API more heavily, please contact
              me at wilsonwu97@outlook.com.
            </p>
            <h2>Endpoints</h2>
            <h3>Upload Extension File</h3>
            <p className="font-semibold">Accepts .crx or .zip files.</p>
            <pre className="text-xs">
              $ curl -X POST -F "extensionFile=@path_to_your_file.crx"
              http://chromescope.net/upload
            </pre>

            <h3>[POST] chromewebstore.google.com link or extension ID link</h3>
          </article>
        </div>
      </div>
    </section>
  )
}

export default Docs
