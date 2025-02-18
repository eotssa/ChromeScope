import React from 'react'

const Docs = () => {
  return (
    <>
      <section className="container mx-auto px-4 pt-24 lg:px-44 max-w-4xl">
        <div className="flex flex-col w-full border-opacity-50">
          <div className="grid h-20 card rounded-box place-items-center">
            <article className="prose pb-64 ">
              <h1 className="text-center ">Getting Started with Chromescope</h1>
              <p className="">
                Chromescope automates Chrome extension risk assessments with a
                powerful suite of analyses. Our platform evaluates Manifest V3
                compliance, permission usage, dynamic code execution risks,
                inline code safety, API usage, and data handling practices. Best
                of all—our free plan requires no authentication token.
              </p>

              <p>
                Only a free plan is available, so no authentication token is
                required.
              </p>
              <h2>JSON Response Format</h2>
              <p>
                Chromescope analyzes your extension and returns detailed
                insights in JSON format. Example:
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
