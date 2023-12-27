import React, { useState } from "react"

import Layout from "./components/Layout"

import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Docs from "./components/Docs"
import Pricing from "./components/Pricing"
import Support from "./components/Support"
import Main from "./components/Main"

const App = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/docs" element={<Docs />} />
          {/* <Route path="/pricing" element={<Pricing />} />
          <Route path="/support" element={<Support />} /> */}
          <Route path="/" element={<Main />} />{" "}
          {/* Use Main component for root path */}
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
