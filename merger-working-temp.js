const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const app = express();
const PORT = 3000;

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
const publicDir = path.join(__dirname, 'public');

[uploadsDir, outputDir, publicDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/output', express.static(outputDir));

// Store session data (in production, use Redis or database)
const sessions = new Map();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload PDFs
app.post('/upload', upload.array('pdfs', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const sessionId = Date.now().toString();
        const fileData = req.files.map(file => ({
            id: file.filename,
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size
        }));

        sessions.set(sessionId, {
            files: fileData,
            mergedFile: null
        });

        res.json({
            sessionId,
            files: fileData
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Merge PDFs
app.post('/merge', async (req, res) => {
    try {
        const { sessionId, fileOrder } = req.body;
        
        if (!sessionId || !sessions.has(sessionId)) {
            return res.status(400).json({ error: 'Invalid session' });
        }

        const session = sessions.get(sessionId);
        const files = session.files;

        if (!fileOrder || !Array.isArray(fileOrder)) {
            return res.status(400).json({ error: 'Invalid file order' });
        }

        // Create new PDF document
        const mergedPdf = await PDFDocument.create();

        // Process files in the specified order
        for (const fileId of fileOrder) {
            const file = files.find(f => f.id === fileId);
            if (!file) continue;

            const pdfBytes = fs.readFileSync(file.path);
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            
            copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        }

        // Save merged PDF
        const mergedPdfBytes = await mergedPdf.save();
        const outputFilename = `merged-${sessionId}.pdf`;
        const outputPath = path.join(outputDir, outputFilename);
        
        fs.writeFileSync(outputPath, mergedPdfBytes);

        // Update session
        session.mergedFile = {
            filename: outputFilename,
            path: outputPath,
            url: `/output/${outputFilename}`
        };

        res.json({
            success: true,
            downloadUrl: `/output/${outputFilename}`,
            filename: outputFilename
        });
    } catch (error) {
        console.error('Merge error:', error);
        res.status(500).json({ error: 'Merge failed' });
    }
});

// Download merged PDF
app.get('/download/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessions.has(sessionId)) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessions.get(sessionId);
        if (!session.mergedFile) {
            return res.status(404).json({ error: 'No merged file found' });
        }

        const filePath = session.mergedFile.path;
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(filePath, `merged-document.pdf`);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

// Clean up old files (run every hour)
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    sessions.forEach((session, sessionId) => {
        if (parseInt(sessionId) < oneHourAgo) {
            // Clean up files
            session.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            
            if (session.mergedFile && fs.existsSync(session.mergedFile.path)) {
                fs.unlinkSync(session.mergedFile.path);
            }
            
            sessions.delete(sessionId);
        }
    });
}, 60 * 60 * 1000);

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
    }
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`PDF Merger server running on http://localhost:${PORT}`);
});