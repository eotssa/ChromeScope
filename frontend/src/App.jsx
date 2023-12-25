import React, { useState } from "react"
import { useEffect } from "react"

import axios from "axios"
import "./index.css"
import Layout from "./components/Layout"
// import hljs from "highlight.js"
// import "highlight.js/styles/atom-one-dark.css"

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
}

const App = () => {
  const [file, setFile] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const [searchInput, setSearchInput] = useState("")
  const [jsonData, setJsonData] = useState("")

  useEffect(() => {
    setJsonData(placeholder)
  }, []) // Re-run highlighting when jsonData changes

  // Search Component
  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchInput.trim()) {
      setErrorMessage("Please enter a valid extension URL.")
      return
    }

    try {
      setLoading(true)
      const response = await axios.post("http://localhost:3001/link", {
        extensionUrl: searchInput.trim(),
      })

      setJsonData(response.data)
      setErrorMessage(null)
    } catch (error) {
      console.error("Error in search:", error)
      setErrorMessage("Error fetching data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Search Component -- useless
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile) // Assuming you have a setter for setting file state

      const formData = new FormData()
      formData.append("extensionFile", selectedFile)

      try {
        const response = await axios.post("/your-upload-route", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })

        setJsonData(response.data) // Assuming you have a setter for setting JSON data state
      } catch (error) {
        console.error("Error in file upload:", error)
      }
    }
  }

  // Upload Component
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

  // For buttons at bottom
  const handleButtonClick = (url) => {
    setSearchInput(url)
    // Programmatically submit the form
    // Assuming the form has a unique ID 'search-form'
    document
      .getElementById("search-form")
      .dispatchEvent(new Event("submit", { cancelable: true }))
  }

  return (
    <>
      <Layout>
        <section className="container mx-auto px-4 pt-32 lg:px-44">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-center">
            <div className="mb-16 mt-12 w-full px-4 lg:w-5/12 lg:px-8 xl:px-12">
              <div className="text-left">
                <h1 className="text-5xl font-bold">
                  Automate Extension Risk Assessment
                </h1>
                <p className="py-6 text-lg font-medium">
                  Innovating Extension Security - Comprehensive, Automated
                  Analysis for Enhanced Digital Trust.
                </p>
                <button className="btn btn-neutral">Get Started</button>
              </div>
            </div>
            <div className="w-full px-4 lg:w-7/12 lg:px-8 xl:px-12">
              <div className="card w-full bg-slate-200/60 shadow-xl">
                <div className="card-body">
                  <form
                    onSubmit={handleSearch}
                    id="search-form"
                    className="space-y-4"
                  >
                    {/* Search input */}
                    <div className="form-control">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Enter Chrome Extension URL or Extension ID"
                          className="input-neutral input input-bordered w-full pr-16"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="btn btn-neutral absolute right-0 top-0 rounded-l-none"
                        >
                          Search
                        </button>
                      </div>
                    </div>

                    {/* JSON Data Display */}
                    <div className="form-control">
                      {jsonData && (
                        <div className="max-h-96 overflow-auto rounded-lg bg-gray-50 p-4 text-left">
                          <pre className="text-xs antialiased font-light">
                            {JSON.stringify(jsonData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Button group */}
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      <button
                        type="button"
                        className="btn btn-neutral w-full sm:w-auto px-4"
                        onClick={() =>
                          handleButtonClick(
                            "https://chromewebstore.google.com/detail/coffeelings/hcbddpppkcnfjifbcfnhmelpemdoepkk"
                          )
                        }
                      >
                        Coffeelings
                      </button>
                      <button
                        type="button"
                        className="btn btn-neutral w-full sm:w-auto px-4"
                        onClick={() =>
                          handleButtonClick("ohdfhnkelpnfiamkjnfbbafnhleohmma")
                        }
                      >
                        Youtube Party
                      </button>
                      <button
                        type="button"
                        className="btn btn-neutral w-full sm:w-auto px-4"
                        onClick={() =>
                          handleButtonClick(
                            "https://chromewebstore.google.com/detail/netflix-party-is-now-tele/oocalimimngaihdkbihfgmpkcpnmlaoa"
                          )
                        }
                      >
                        Teleparty
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="container mx-auto px-4 pt-32 lg:px-44">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-center">
            <div className="mb-16 mt-5 w-full px-4 lg:w-5/12 lg:px-8 xl:px-12">
              <div className="text-left">
                <h1 className="text-5xl font-bold">
                  Have a custom extension? Upload it here.
                </h1>
                <p className="py-6 text-lg font-medium">
                  Extensions uploaded for analysis are deleted and not stored on
                  our servers.
                </p>
                <a
                  href="https://github.com/eotssa/ChromeScope"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="btn btn-neutral">View Source Code</button>
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
                        className="btn btn-neutral mt-4 mx-auto max-w "
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
                      <pre className="text-xs leading-relaxed">
                        {JSON.stringify(analysisResult, null, 2)}
                      </pre>
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
