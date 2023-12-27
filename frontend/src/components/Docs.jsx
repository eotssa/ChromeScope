import React from "react"

const Docs = () => {
  return (
    <>
      <section className="container mx-auto px-4 pt-24 lg:px-44 max-w-4xl">
        <div className="flex flex-col w-full border-opacity-50">
          <div className="grid h-20 card rounded-box place-items-center">
            <article className="prose pb-64 ">
              <h1 className="text-center ">Getting Started with Chromescope</h1>
              <p className="">
                Integrate ChromeScope into your applications or directly
                interact with our API by following the provided guidelines.
                ChromeScope is engineered to offer insights that go beyond the
                automated analysis of the Chrome Web Store. Our aim is to create
                an environment that empowers and directs your analysis, aligning
                it precisely with your specific risk tolerance requirements.
              </p>

              <p>
                Only a free plan is available, so no authentication token is
                required.
              </p>
              <h2>JSON Response</h2>
              <p>
                Chromescope automatically detects API calls and responds with
                JSON.
              </p>
              <pre>{`{
  name: "",
  version: "",
  description: "",
  totalRiskScore: "",
  breakdownRiskScore: {
    content_security_policy: "",
    permissions: "",
    jsLibrariesScore: "",
    chromeAPIUsage: "",
    eslintIssues_notScored: "",
  },
  details: {
    manifestAnalysis: {
      manifestVersion: "",
      cspDetails: {},
      permissionsDetails: {},
      backgroundScripts: [],
      contentScriptsDomains: [],
      webAccessibleResources: [],
      externallyConnectable: [],
      updateUrl: "",
      oauth2: false,
      specificOverrides: [],
      developerInfo: {},
      chromeOsKeys: [],
    },
    jsLibrariesDetails: {},
    chromeAPIUsage: {},
    dataHandling: {},
    eslintDetails: {},
  },
}`}</pre>
              <h2>Endpoints</h2>
              <h3>Upload Extension File</h3>
              <p>Accepts .crx or .zip files.</p>
              <pre className="text-xs">
                $ curl -X POST -F "extensionFile=@path_to_your_file.crx"
                http://chromescope.net/upload
              </pre>

              <h3>Request a Chrome Web Store extension analysis</h3>
              <p>
                Chromescope accepts either chrome web store link or an chrome
                extension ID.
              </p>
              <pre className="text-xs">
                {`$ curl -X POST -H "Content-Type: application/json" -d '{"extensionUrl": "https://example.com/extensionUrl"}' http://chromescope.net/link`}
              </pre>

              <h2>Rate Limit</h2>
              <p>
                API enforces rate limiting to 100 requests per IP address every
                15 minutes.
              </p>
              <h2>HTTPS / SSL</h2>
              <p>
                All API requests should be made over HTTPS to ensure data
                security and privacy.
              </p>
            </article>
          </div>
        </div>
      </section>
    </>
  )
}

export default Docs
