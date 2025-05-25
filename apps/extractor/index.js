
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const express = require('express');
const router  = express.Router();

// router.use(express.json({ limit: '100mb' }));
// app.use("/", express.static(path.join(__dirname, 'public')));


/**
 * POST /api/upload
 * Body: { pdfBase64: string }
 * Response: { pageCount: number }
 */
router.post('/api/upload', async (req, res) => {
  try {
    const { pdfBase64 } = req.body;
    if (typeof pdfBase64 !== 'string') {
      return res.status(400).json({ error: 'Invalid payload: pdfBase64 must be a base64 string.' });
    }
    const pdfBytes = Buffer.from(pdfBase64, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    res.json({ pageCount });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to load PDF.' });
  }
});

/**
 * POST /api/extract
 * Body: { pdfBase64: string, start: number, end: number }
 * Response: { extractedPdfBase64: string }
 */
router.post('/api/extract', async (req, res) => {
  try {
    const { pdfBase64, start, end } = req.body;
    const startIdx = parseInt(start, 10);
    const endIdx = parseInt(end, 10);

    if (typeof pdfBase64 !== 'string' || isNaN(startIdx) || isNaN(endIdx)) {
      return res.status(400).json({ error: 'Invalid request: ensure pdfBase64 is string and start/end are numbers.' });
    }
    if (startIdx < 0 || endIdx < startIdx) {
      return res.status(400).json({ error: 'Invalid page range: ensure 0 <= start <= end.' });
    }

    const originalBytes = Buffer.from(pdfBase64, 'base64');
    const originalPdf = await PDFDocument.load(originalBytes);
    const totalPages = originalPdf.getPageCount();
    if (endIdx >= totalPages) {
      return res.status(400).json({ error: `Page range exceeds document length (${totalPages} pages).` });
    }

    const newPdf = await PDFDocument.create();
    const pageIndices = Array.from({ length: endIdx - startIdx + 1 }, (_, i) => startIdx + i);
    const [ ...copied ] = await newPdf.copyPages(originalPdf, pageIndices);
    copied.forEach(page => newPdf.addPage(page));

    const newPdfBytes = await newPdf.save();
    const extractedPdfBase64 = Buffer.from(newPdfBytes).toString('base64');
    res.json({ extractedPdfBase64 });
  } catch (err) {
    console.error('Extraction error:', err);
    res.status(500).json({ error: 'Failed to extract PDF pages.' });
  }
});

// Fallback to serve index.html for SPA
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// app.listen(PORT, () => {
//   console.log(`Server listening on http://localhost:${PORT}`);
// });


module.exports = router;

