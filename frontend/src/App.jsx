import React, { useState } from 'react';
import axios from 'axios';
import "./index.css";

//.....................testing

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
      const response = await axios.post(`https://chrome-extension-analyzer.fly.dev/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
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
      <h1>Chrome Extension Analyzer</h1>
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      <form onSubmit={handleSubmit} className="upload-form">
        <label className="file-input">
          <input type="file" onChange={handleFileChange} accept=".zip" />
        </label>
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Analyzing...' : 'Upload Extension'}
        </button>
      </form>
      {analysisResult && (
        <div className="analysis-results">
          <h2>Analysis Results</h2>
          <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default App;
