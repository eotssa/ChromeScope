const request = require('supertest');
const express = require('express');
const multer = require('multer');
const app = express();

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('extensionFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  return res.status(200).json({
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
  });
});

describe('POST /upload', () => {
  it('should upload a file', async () => {
    const fakeFile = Buffer.from('This is a test file', 'utf-8');

    const response = await request(app)
      .post('/upload')
      .attach('extensionFile', fakeFile, 'testfile.txt') // attach the buffer as a file
      .expect(200);
    // Assert the response to ensure it contains the expected info
    expect(response.body.originalname).toEqual('testfile.txt');
    expect(response.body.mimetype).toEqual('text/plain');
  });

  // Additional tests for error cases, etc.
});
