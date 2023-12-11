import React, { useState } from 'react';
import axios from 'axios';
import "./index.css";

const instructions = (
  <div className="instructions">
    <h2>How to Use</h2>
    <ol>
      <li>Navigate to the Chrome Web Store and find the extension you want to analyze.</li>
      <li>Copy the extension's link and visit <a href="https://crxextractor.com" target="_blank" rel="noopener noreferrer">CRX Extractor</a>.</li>
      <li>Replace "https://chromewebstore.google.com/" in the copied URL with "https://chrome.google.com/webstore".</li>
      <li>Download the .crx file from the updated link.</li>
      <li>Use CRX Extractor to get the source code by uploading the .crx file.</li>
      <li>Upload the resulting .zip file here for analysis.</li>
    </ol>
  </div>
)

const App = () => {
  const [file, setFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a Chrome extension zip file to upload.');
      return;
    }
  
    const formData = new FormData();
    formData.append('extensionFile', file);
  
    try {
      setLoading(true);
      //const response = await axios.post(`https://chrome-extension-analyzer.fly.dev/upload`, formData, {
      const response = await axios.post(`http://localhost:3001/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log(response.data)
      setAnalysisResult(response.data);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      setErrorMessage('Error analyzing the file. Please ensure it is a valid Chrome extension zip file.');
    } finally {
      setLoading(false);
    }
  };
  
  
  return (
    <div className="app-container">
      <h1>ChromeScope</h1>
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      <form onSubmit={handleSubmit} className="upload-form">
        <label className="file-input">
          {instructions}
          <input type="file" onChange={handleFileChange} accept=".zip" />
        </label>
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Analyzing...' : 'Upload Extension'}
        </button>
      </form>
      {analysisResult && (
        <div className="analysis-results">
          <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default App;