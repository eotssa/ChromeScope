import React, { useState } from "react"
import axios from "axios"
import "./index.css"
import Layout from "./components/Layout"

const features = [
  {
    name: "Manifest Analysis",
    description:
      "Evaluates extension metadata, Content Security Policy (CSP), and permissions for security issues.",
  },
  {
    name: "JavaScript Analysis",
    description: "Conducts security-focused code quality assessment",
  },
  {
    name: "Chrome API and Data Handling",
    description:
      "Scrutinizes Chrome API usage and data handling practices and policies for security issues.",
  },
  {
    name: "Vulnerability Analysis",
    description: "Identifies known vulnerabilities in JavaScript libraries",
  },
  {
    name: "JSON Response",
    description:
      "Comprehensive report detailing the total risk score and specific assessments to empower your needs.",
  },
  {
    name: "Future Plans",
    description:
      "API call integration, network analysis, automated CWS upload and more!",
  },
]

const placeholder = {
  manifestDetails: {
    name: "[redacted]",
    version: "1.2",
    description: "[redacted]",
  },
  totalRiskScore: 90,
  breakdown: {
    metadataScore: 4,
    cspScore: 25,
    permissionsScore: 1,
    jsLibrariesScore: 60,
    chromeAPIUsage: 6,
    eslintIssues: 879,
  },
  details: {
    metadataDetails: {},
    cspDetails: {
      noCSP: "No CSP present",
    },
    permissionsDetails: {
      notifications: "Permission 'notifications' classified as low risk.",
    },
    jsLibrariesDetails: {
      "jquery-vuln-0": {
        component: "jquery",
        severity: "medium",
        info: "https://blog.jquery.com/2019/04/10/jquery-3-4-0-released/, https://github.com/jquery/jquery/commit/753d591aea698e57d6db58c9f722cd0808619b1b, https://nvd.nist.gov/vuln/detail/CVE-2019-11358",
        summary:
          "jQuery before 3.4.0, as used in Drupal, Backdrop CMS, and other products, mishandles jQuery.extend(true, {}, ...) because of Object.prototype pollution",
        CVE: "CVE-2019-11358",
      },
      "jquery-vuln-1": {
        component: "jquery",
        severity: "medium",
        info: "https://blog.jquery.com/2020/04/10/jquery-3-5-0-released/",
        summary:
          "passing HTML containing <option> elements from untrusted sources - even after sanitizing it - to one of jQuery's DOM manipulation methods (i.e. .html(), .append(), and others) may execute untrusted code.",
        CVE: "CVE-2020-11023",
      },
      "jquery-vuln-2": {
        component: "jquery",
        severity: "medium",
        info: "https://blog.jquery.com/2020/04/10/jquery-3-5-0-released/",
        summary:
          "Regex in its jQuery.htmlPrefilter sometimes may introduce XSS",
        CVE: "CVE-2020-11022",
      },
    },
    chromeAPIUsage: {
      "\\tmp\\a820a5ef-2958-4399-aab6-48dd09cbbbdf\\js\\bg_chat.js": [
        "chrome.runtime.onMessage",
        "chrome.tabs.sendMessage",
      ],
      "\\tmp\\a820a5ef-2958-4399-aab6-48dd09cbbbdf\\js\\bg_general_functions.js":
        [
          "chrome.notifications",
          "chrome.tabs.onRemoved",
          "chrome.notifications.create",
          "chrome.tabs.executeScript",
          "chrome.tabs.query",
          "chrome.tabs.update",
          "chrome.runtime.onMessage",
        ],
      "\\tmp\\a820a5ef-2958-4399-aab6-48dd09cbbbdf\\js\\chat\\chat.js": [
        "chrome.extension.getURL",
        "chrome.runtime.sendMessage",
        "chrome.runtime.onMessage",
      ],
      "\\tmp\\a820a5ef-2958-4399-aab6-48dd09cbbbdf\\js\\playerController - Copy.js":
        ["chrome.runtime.sendMessage"],
      "\\tmp\\a820a5ef-2958-4399-aab6-48dd09cbbbdf\\js\\playerController.js": [
        "chrome.runtime.sendMessage",
      ],
      "\\tmp\\a820a5ef-2958-4399-aab6-48dd09cbbbdf\\js\\popup\\main.js": [
        "chrome.extension.getBackgroundPage",
        "chrome.runtime.getManifest",
        "chrome.tabs.query",
        "chrome.tabs.getSelected",
        "chrome.tabs.create",
        "chrome.tabs.executeScript",
      ],
    },
    dataHandling: {
      "\\tmp\\a820a5ef-2958-4399-aab6-48dd09cbbbdf\\jquery.js": {
        apiCalls: 2,
      },
      "\\tmp\\a820a5ef-2958-4399-aab6-48dd09cbbbdf\\js\\peerjs.min.js": {
        apiCalls: 2,
      },
      "\\tmp\\a820a5ef-2958-4399-aab6-48dd09cbbbdf\\semantic\\semantic.js": {
        localStorage: 3,
        sessionStorage: 7,
      },
    },
    eslintDetails: {
      totalIssues: 879,
      errors: 6,
      warnings: 873,
      commonIssues: {
        "security/detect-object-injection": 855,
        "security/detect-non-literal-regexp": 14,
        null: 6,
        "security/detect-unsafe-regex": 4,
      },
    },
  },
}

const App = () => {
  const [file, setFile] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setErrorMessage("Please select a Chrome extension zip file to upload.")
      return
    }

    const formData = new FormData()
    formData.append("extensionFile", file)

    try {
      setLoading(true)
      const response = await axios.post(
        `http://localhost:3001/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      )
      console.log(response.data)
      setAnalysisResult(response.data)
      setErrorMessage(null)
    } catch (error) {
      console.error("Error uploading file:", error)
      setErrorMessage(
        "Error analyzing the file. Please ensure it is a valid Chrome extension zip file."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Layout>
        <section className="container mx-auto px-4 pt-32 lg:px-44">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-center">
            <div className="mb-16 mt-5 w-full px-4 lg:w-5/12 lg:px-8 xl:px-12">
              <div className="text-left">
                <h1 className="text-5xl font-bold">
                  Automate Extension Risk Assessment
                </h1>
                <p className="py-6 text-lg font-medium">
                  Innovating Extension Security - Comprehensive, Automated
                  Analysis for Enhanced Digital Trust.
                </p>
                <a
                  href="https://github.com/eotssa/ChromeScope"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="btn btn-primary">View Source Code</button>
                </a>{" "}
              </div>
            </div>
            <div className="w-full px-4 lg:w-7/12 lg:px-8 xl:px-12">
              <div className="card w-full bg-base-100 shadow-xl">
                <div className="card-body">
                  <form onSubmit={handleSubmit}>
                    <div className="form-control pt-6">
                      <div className="mx-auto pt-3">
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="file-input file-input-bordered w-full max-w-xs"
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary mt-4 mx-auto max-w "
                        disabled={loading}
                      >
                        Upload and Analyze
                      </button>
                    </div>
                  </form>
                  {errorMessage && (
                    <p className="text-red-500">{errorMessage}</p>
                  )}
                  {analysisResult && (
                    <div className="mt-4 max-h-96 overflow-auto rounded-lg bg-gray-50 p-4 text-left">
                      <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="container mx-auto px-4 pt-32 lg:px-44">
          <div className="bg-white">
            <div className="mx-auto grid max-w-2xl grid-cols-1 items-center gap-x-8 gap-y-16 px-4 py-24 sm:px-6 sm:py-32 lg:max-w-7xl lg:grid-cols-2 lg:px-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Risk Assessment Made Easy
                </h2>
                <p className="mt-4 text-gray-500">
                  This tool specializes in the automated analysis of Chrome
                  extensions, delivering insights into security, permissions,
                  and code quality.
                </p>

                <dl className="mt-16 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 sm:gap-y-16 lg:gap-x-8">
                  {features.map((feature) => (
                    <div
                      key={feature.name}
                      className="border-t border-gray-200 pt-4"
                    >
                      <dt className="font-medium text-gray-900">
                        {feature.name}
                      </dt>
                      <dd className="mt-2 text-sm text-gray-500">
                        {feature.description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <label className="form-control">
                <div className="label mt-4">
                  <span className="label-text text-lg font-medium">
                    Response Data Example
                  </span>
                  <span className="label-text-alt"></span>
                </div>
                <textarea
                  className="textarea textarea-bordered h-full w-full resize-none overflow-auto"
                  placeholder={JSON.stringify(placeholder, null, 2)}
                  style={{ minHeight: "600px" }} // Increased minHeight
                ></textarea>
                <div className="label"></div>
              </label>
            </div>
          </div>
        </section>
      </Layout>
    </>
  )
}

export default App
