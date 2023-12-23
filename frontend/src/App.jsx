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
                <button className="btn btn-primary">Get Started</button>
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
              <div className="grid grid-cols-2 grid-rows-2 gap-4 sm:gap-6 lg:gap-8">
                <img
                  src="https://tailwindui.com/img/ecommerce-images/product-feature-03-detail-01.jpg"
                  alt="Walnut card tray with white powder coated steel divider and 3 punchout holes."
                  className="rounded-lg bg-gray-100"
                />
                <img
                  src="https://tailwindui.com/img/ecommerce-images/product-feature-03-detail-02.jpg"
                  alt="Top down view of walnut card tray with embedded magnets and card groove."
                  className="rounded-lg bg-gray-100"
                />
                <img
                  src="https://tailwindui.com/img/ecommerce-images/product-feature-03-detail-03.jpg"
                  alt="Side of walnut card tray with card groove and recessed card area."
                  className="rounded-lg bg-gray-100"
                />
                <img
                  src="https://tailwindui.com/img/ecommerce-images/product-feature-03-detail-04.jpg"
                  alt="Walnut card tray filled with cards and card angled in dedicated groove."
                  className="rounded-lg bg-gray-100"
                />
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  )
}

export default App
