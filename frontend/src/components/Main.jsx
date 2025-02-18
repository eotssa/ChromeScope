import React, { useState } from 'react'
import axios from 'axios'
import '../index.css'
import ReactJson from 'react-json-view'

const features = [
  {
    name: 'Manifest V3 Analysis',
    description:
      'Evaluates Manifest V3 extensions, including service workers, background scripts, and updated permissions.',
  },
  {
    name: 'JavaScript Analysis',
    description: 'Conducts security-focused code quality assessment.',
  },
  {
    name: 'Chrome API and Data Handling',
    description:
      'Scrutinizes Chrome API usage and data handling practices for security issues.',
  },
  {
    name: 'Vulnerability Analysis',
    description: 'Identifies known vulnerabilities in JavaScript libraries.',
  },
  {
    name: 'JSON Response',
    description:
      'Provides a comprehensive report detailing the total risk score and specific assessments.',
  },
  {
    name: 'Future Plans',
    description:
      'API integration, network analysis, automated Chrome Web Store uploads, and more!',
  },
]

const placeholder = {
  name: '',
  version: '',
  description: '',
  totalRiskScore: '',
  breakdownRiskScore: {
    content_security_policy: '',
    permissions: '',
    jsLibrariesScore: '',
    chromeAPIUsage: '',
    eslintIssues_notScored: '',
  },
  details: {
    manifestAnalysis: {
      manifestVersion: '',
      cspDetails: {},
      permissionsDetails: {},
      backgroundScripts: [],
      contentScriptsDomains: [],
      webAccessibleResources: [],
      externallyConnectable: [],
      updateUrl: '',
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

const Main = () => {
  const [file, setFile] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [jsonData, setJsonData] = useState(placeholder)

  const handleSearch = async (e) => {
    e.preventDefault()
    const trimmedInput = searchInput.trim()
    if (!trimmedInput) {
      setErrorMessage('Please enter a valid extension URL or ID.')
      return
    }

    try {
      setLoading(true)
      setErrorMessage(null)
      const response = await axios.post('https://chromescope.net/link', {
        extensionUrl: trimmedInput,
      })

      setJsonData(response.data)
    } catch (error) {
      console.error('Error in search:', error)
      setErrorMessage('Error fetching data. Ensure the URL or ID is correct.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      // Validate file type
      const validExtensions = ['.crx', '.zip']
      const fileExtension = selectedFile.name.slice(
        selectedFile.name.lastIndexOf('.')
      )
      if (!validExtensions.includes(fileExtension.toLowerCase())) {
        setErrorMessage('Please upload a valid .crx or .zip file.')
        setFile(null)
        return
      }
      setFile(selectedFile)
      setErrorMessage(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setErrorMessage('Please select a Chrome extension file to upload.')
      return
    }

    const formData = new FormData()
    formData.append('extensionFile', file)

    try {
      setLoading(true)
      setErrorMessage(null)
      const response = await axios.post(
        'https://chromescope.net/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      setAnalysisResult(response.data)
    } catch (error) {
      console.error('Error uploading file:', error)
      setErrorMessage(
        'Error analyzing the file. Please ensure it is a valid .crx or .zip file.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleButtonClick = (url) => {
    setSearchInput(url)
    setErrorMessage(null)
  }

  return (
    <>
      {/* Search Section */}
      <section className="container mx-auto px-4 pt-24 lg:px-38">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center">
          <div className="mb-16 mt-12 w-full px-4 lg:w-5/12 lg:px-8 xl:px-12">
            <div className="text-left">
              <h1 className="text-6xl font-bold ">
                Automate Chrome Extension Risk Assessments
              </h1>
              <p
                className="py-6 text-lg font-bold font-mono
"
              >
                Secure your enterprise deployments with rapid Manifest V2 and V3
                scans.
              </p>
              <a
                href="mailto:wilsonwu97@outlook.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="btn bg-sky-500 text-neutral-200 text-lg rounded-full hover:bg-sky-600 px-4">
                  Contact Me
                </button>
              </a>
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
                  {/* Search Input */}
                  <div className="form-control">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter Chrome Extension URL or Extension ID"
                        className="input input-bordered w-full pr-16"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="btn bg-sky-500 text-slate-200 text-lg absolute right-0 top-0 rounded-l-none"
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="loading loading-bars loading-lg"></span>
                        ) : (
                          'Search'
                        )}
                      </button>
                    </div>
                  </div>
                  {/* Error Message */}
                  {errorMessage && (
                    <p className="text-red-500 text-center">{errorMessage}</p>
                  )}
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
                  {/* Button Group */}
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <button
                      type="button"
                      className="btn btn-outline text-md rounded-none w-full sm:w-auto px-4"
                      onClick={() =>
                        handleButtonClick(
                          'https://chromewebstore.google.com/detail/remindoro/njmniggbfobokemdjebnhmbldimkofkc'
                        )
                      }
                    >
                      Remindoro
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline text-md rounded-none w-full sm:w-auto px-4"
                      onClick={() =>
                        handleButtonClick(
                          'https://chromewebstore.google.com/detail/raindropio/ldgfbffkinooeloadekpmfoklnobpien'
                        )
                      }
                    >
                      Raindrop.io
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline text-md rounded-none w-full sm:w-auto px-4"
                      onClick={() =>
                        handleButtonClick(
                          'https://chromewebstore.google.com/detail/supercopy-enable-copy/onepmapfbjohnegdmfhndpefjkppbjkm'
                        )
                      }
                    >
                      SuperCopy
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section className="container mx-auto px-4 pt-32 lg:px-44">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center">
          <div className="mb-16 mt-5 w-full px-4 lg:w-5/12 lg:px-8 xl:px-12">
            <div className="text-left">
              <h1 className="text-5xl font-bold">
                Have a custom extension? Upload it here.
              </h1>
              <p className="py-6 text-lg font-medium">
                We delete every file after analysis—your data never sticks
                around. (See our source code.)
              </p>
              <a
                href="https://github.com/eotssa/ChromeScope"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="btn bg-sky-500 text-neutral-200 text-lg rounded-full hover:bg-sky-600 px-4">
                  View Source Code
                </button>
              </a>
            </div>
          </div>
          <div className="w-full px-4 py-6 lg:w-7/12 lg:px-8 xl:px-12">
            <div className="card w-full bg-slate-200/60 shadow-xl">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="form-control pt-6">
                    <div className="mx-auto pt-3">
                      <input
                        type="file"
                        accept=".crx,.zip"
                        onChange={handleFileChange}
                        className="file-input file-input-bordered w-full max-w-xs"
                      />
                    </div>
                    {errorMessage && (
                      <p className="text-red-500 mt-4 text-center">
                        {errorMessage}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="btn btn-neutral mt-4 mx-auto"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="loading loading-bars loading-lg"></span>
                      ) : (
                        'Upload and Analyze'
                      )}
                    </button>
                  </div>
                </form>

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

      {/* Article Cards Section */}
      <section className="container mx-auto px-4 pt-32 lg:px-44">
        <div className="bg-white">
          <div className="mx-auto grid max-w-2xl grid-cols-1 items-center gap-x-8 gap-y-16 px-4 py-24 sm:px-6 sm:py-32 lg:max-w-7xl lg:grid-cols-2 lg:px-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Risk Assessment Made Easy
              </h2>
              <p className="mt-4 text-gray-500">
                This tool specializes in the automated analysis of Chrome
                extensions, with full support for Manifest V3, delivering
                insights into security, permissions, and code quality.
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
            <div className="justify-self-center grid grid-flow-row auto-rows-max">
              {/* CARD ONE */}
              <div className="max-w-md bg-white border border-gray-200 rounded-lg shadow my-3">
                <div className="p-5">
                  <a
                    href="https://www.darkreading.com/application-security/google-chrome-store-review-process-data-stealer"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
                      Google's Souped-up Chrome Store Review Process Foiled by
                      Data-Stealer
                    </h5>
                  </a>
                  <p className="mb-3 font-normal text-gray-700">
                    "Extensions Have Too Much Access to Web Functions"
                  </p>
                  <a
                    href="https://www.darkreading.com/application-security/google-chrome-store-review-process-data-stealer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                  >
                    Read more
                    <svg
                      className="rtl:rotate-180 w-3.5 h-3.5 ms-2"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 14 10"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M1 5h12m0 0L9 1m4 4L9 9"
                      />
                    </svg>
                  </a>
                </div>
              </div>
              {/* CARD TWO */}
              <div className="max-w-md bg-white border border-gray-200 rounded-lg shadow my-3">
                <div className="p-5">
                  <a
                    href="https://cointelegraph.com/news/22-more-crypto-stealing-google-chrome-extensions-discovered"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
                      22 More Crypto-Stealing Google Chrome Extensions
                      Discovered
                    </h5>
                  </a>
                  <p className="mb-3 font-normal text-gray-700">
                    "Google Chrome extensions are often used for phishing"
                  </p>
                  <a
                    href="https://cointelegraph.com/news/22-more-crypto-stealing-google-chrome-extensions-discovered"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                  >
                    Read more
                    <svg
                      className="rtl:rotate-180 w-3.5 h-3.5 ms-2"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 14 10"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M1 5h12m0 0L9 1m4 4L9 9"
                      />
                    </svg>
                  </a>
                </div>
              </div>
              {/* CARD THREE */}
              <div className="max-w-md bg-white border border-gray-200 rounded-lg shadow my-3">
                <div className="p-5">
                  <a
                    href="https://www.securityweek.com/password-stealing-chrome-extension-demonstrates-new-vulnerabilities/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
                      Password-Stealing Chrome Extension Demonstrates New
                      Vulnerabilities
                    </h5>
                  </a>
                  <p className="mb-3 font-normal text-gray-700">
                    "12.5% of the total extensions have the necessary
                    permissions to extract sensitive information on all web
                    pages."
                  </p>
                  <a
                    href="https://www.securityweek.com/password-stealing-chrome-extension-demonstrates-new-vulnerabilities/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                  >
                    Read more
                    <svg
                      className="rtl:rotate-180 w-3.5 h-3.5 ms-2"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 14 10"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M1 5h12m0 0L9 1m4 4L9 9"
                      />
                    </svg>
                  </a>
                </div>
              </div>
              {/* End of Article Cards */}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Main
