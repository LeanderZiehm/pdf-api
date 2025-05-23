const express = require('express');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies (with large payload support)
app.use(express.json({ limit: '50mb' }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

/**
 * POST /extract
 * Request body: {
 *   pdfBase64: string,    // Base64-encoded PDF
 *   start: number,        // 0-based start page index
 *   end: number           // 0-based end page index (inclusive)
 * }
 * Response: { extractedPdfBase64: string }
 */
app.post('/extract', async (req, res) => {
  try {
    const { pdfBase64, start, end } = req.body;

    // Validate inputs
    if (typeof pdfBase64 !== 'string' || typeof start !== 'number' || typeof end !== 'number') {
      return res.status(400).json({ error: 'Invalid input types. Expect pdfBase64 string, start number, end number.' });
    }
    if (start < 0 || end < start) {
      return res.status(400).json({ error: 'Invalid page range. Ensure 0 <= start <= end.' });
    }

    // Decode base64 PDF
    const pdfBytes = Buffer.from(pdfBase64, 'base64');

    // Load the existing PDF document
    const originalPdf = await PDFDocument.load(pdfBytes);
    const totalPages = originalPdf.getPageCount();

    if (end >= totalPages) {
      return res.status(400).json({ error: `Page range exceeds document page count (${totalPages} pages).` });
    }

    // Create a new PDFDocument to hold extracted pages
    const newPdf = await PDFDocument.create();

    // Copy pages from original into new PDF
    const pagesToExtract = [];
    for (let i = start; i <= end; i++) pagesToExtract.push(i);
    const extractedPages = await newPdf.copyPages(originalPdf, pagesToExtract);
    extractedPages.forEach(page => newPdf.addPage(page));

    // Serialize the new PDFDocument to bytes (Uint8Array)
    const newPdfBytes = await newPdf.save();

    // Encode the extracted PDF as base64
    const extractedPdfBase64 = Buffer.from(newPdfBytes).toString('base64');

    // Return the extracted PDF
    res.json({ extractedPdfBase64 });
  } catch (err) {
    console.error('Error extracting PDF pages:', err);
    res.status(500).json({ error: 'Failed to extract pages from PDF.' });
  }
});

// All other routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PDF Extractor API (and frontend) listening on port ${PORT}`);
});
