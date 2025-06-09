// backend/api/index.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { S3Client, ListObjectsV2Command, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const { verifyAdminCredentials, authenticateToken } = require('../auth'); // Path disesuaikan karena auth.js ada di parent

const app = express();

// =====================================================================
// Konfigurasi AWS S3 SDK v3
// =====================================================================
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-1';

const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
});

// =====================================================================
// MIDDLEWARE CORS - PENTING UNTUK VERCEL
// =====================================================================
const FRONTEND_ORIGIN_PROD = process.env.FRONTEND_USER_URL_PROD; // Ini akan dibaca dari ENV Vercel
const FRONTEND_ORIGIN_DEV = 'http://localhost:3000';

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || origin === FRONTEND_ORIGIN_PROD || origin === FRONTEND_ORIGIN_DEV) {
            callback(null, true);
        } else {
            console.log(`[CORS] Origin not allowed: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// Konfigurasi Multer (sama seperti sebelumnya)
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.zip', '.rar'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file ZIP dan RAR yang diizinkan!'), false);
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024
    }
});

// ===========================================
// ROUTES API (sama seperti sebelumnya)
// ===========================================
// ... (Semua rute app.get, app.post, app.delete Anda akan ada di sini) ...

app.get('/api/files', async (req, res) => {
    // ... kode rute /api/files (public list) ...
    try {
        const command = new ListObjectsV2Command({ Bucket: S3_BUCKET_NAME });
        const data = await s3Client.send(command);
        const fileList = (data.Contents || []).filter(item => {
            const ext = path.extname(item.Key).toLowerCase();
            return ext === '.zip' || ext === '.rar';
        }).map(item => {
            const serverFileName = item.Key;
            const parts = serverFileName.split('-');
            let originalName = serverFileName;
            if (parts.length > 1 && !isNaN(Number(parts[0])) && String(Number(parts[0])) === parts[0]) {
                originalName = parts.slice(1).join('-');
            }
            return {
                id: serverFileName,
                name: originalName,
                serverFileName: serverFileName,
                description: `File ${path.extname(originalName).substring(1).toUpperCase()}`,
                fileSize: item.Size,
                uploadDate: item.LastModified.toISOString()
            };
        });
        console.log(`[BACKEND] Found ${fileList.length} files from S3 for public list.`);
        res.json(fileList);
    } catch (error) {
        console.error("[BACKEND] Error listing files from S3:", error);
        res.status(500).json({ message: 'Gagal memuat daftar file publik dari S3.' });
    }
});

app.get('/api/files/info/:fileName', async (req, res) => {
    // ... kode rute /api/files/info/:fileName ...
    const serverFileName = req.params.fileName;
    try {
        const command = new HeadObjectCommand({ Bucket: S3_BUCKET_NAME, Key: serverFileName });
        const data = await s3Client.send(command);
        const parts = serverFileName.split('-');
        let originalName = serverFileName;
        if (parts.length > 1 && !isNaN(Number(parts[0])) && String(Number(parts[0])) === parts[0]) {
            originalName = parts.slice(1).join('-');
        }
        const fileInfo = {
            originalFileName: originalName,
            serverFileName: serverFileName,
            description: `File ${path.extname(originalName).substring(1).toUpperCase()}`,
            fileSize: data.ContentLength,
            uploadDate: data.LastModified.toISOString(),
            isProtected: false
        };
        console.log("[BACKEND-INFO] File info sent from S3:", fileInfo);
        res.json(fileInfo);
    } catch (error) {
        if (error.Code === 'NotFound') {
            return res.status(404).json({ message: 'File tidak ditemukan di S3.' });
        }
        console.error(`[BACKEND-INFO] Error getting file info from S3 for ${serverFileName}:`, error);
        return res.status(500).json({ message: 'Gagal mengambil informasi file dari S3.' });
    }
});

app.get('/api/files/download/:fileName', async (req, res) => {
    // ... kode rute /api/files/download/:fileName ...
    const serverFileName = req.params.fileName;
    const command = new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: serverFileName });
    const parts = serverFileName.split('-');
    let originalName = serverFileName;
    if (parts.length > 1 && !isNaN(Number(parts[0])) && String(Number(parts[0])) === parts[0]) {
        originalName = parts.slice(1).join('-');
    }
    res.attachment(originalName);
    try {
        const response = await s3Client.send(command);
        response.Body.pipe(res);
    } catch (err) {
        if (err.Code === 'NoSuchKey') {
            return res.status(404).json({ message: 'File tidak ditemukan di S3.' });
        }
        console.error(`[BACKEND-DOWNLOAD] Error streaming file from S3: ${serverFileName}`, err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Gagal mengunduh file dari S3.' });
        }
    }
});

app.post('/api/admin/login', (req, res) => {
    // ... kode rute /api/admin/login ...
    const { password } = req.body;
    const { success, token, message } = verifyAdminCredentials(password);
    if (success) {
        res.json({ message: 'Login berhasil!', token: token });
    } else {
        res.status(401).json({ message: message });
    }
});

app.post('/api/admin/upload', authenticateToken, upload.single('file'), async (req, res) => {
    // ... kode rute /api/admin/upload ...
    const originalName = req.file.originalname;
    const serverFileName = `<span class="math-inline">\{Date\.now\(\)\}\-</span>{originalName}`;
    const description = req.body.description || `File ${path.extname(originalName).substring(1).toUpperCase()}`;
    const uploader = new Upload({
        client: s3Client,
        params: {
            Bucket: S3_BUCKET_NAME, Key: serverFileName, Body: req.file.buffer,
            ContentType: req.file.mimetype, ACL: 'private'
        },
    });
    try {
        const data = await uploader.done();
        res.status(200).json({
            message: 'File berhasil diunggah ke S3!', fileName: originalName, serverFileName: serverFileName,
            description: description, fileSize: req.file.size, uploadDate: new Date().toISOString(),
            s3Location: data.Location
        });
    } catch (error) {
        console.error("Error uploading file to S3:", error);
        res.status(500).json({ message: `Gagal mengunggah file ke S3: ${error.message}` });
    }
});

app.get('/api/admin/files', authenticateToken, async (req, res) => {
    // ... kode rute /api/admin/files ...
    try {
        const command = new ListObjectsV2Command({ Bucket: S3_BUCKET_NAME });
        const data = await s3Client.send(command);
        const fileList = (data.Contents || []).filter(item => {
            const ext = path.extname(item.Key).toLowerCase();
            return ext === '.zip' || ext === '.rar';
        }).map(item => {
            const serverFileName = item.Key;
            const parts = serverFileName.split('-');
            let originalName = serverFileName;
            if (parts.length > 1 && !isNaN(Number(parts[0])) && String(Number(parts[0])) === parts[0]) {
                originalName = parts.slice(1).join('-');
            }
            return {
                id: serverFileName, name: originalName, serverFileName: serverFileName,
                description: `File ${path.extname(originalName).substring(1).toUpperCase()}`,
                fileSize: item.Size, uploadDate: item.LastModified.toISOString()
            };
        });
        res.json(fileList);
    } catch (error) {
        console.error("[BACKEND] Error listing files from S3 for admin:", error);
        res.status(500).json({ message: 'Gagal memuat daftar file admin dari S3.' });
    }
});

app.delete('/api/admin/files/:fileName', authenticateToken, async (req, res) => {
    // ... kode rute /api/admin/files/:fileName ...
    const serverFileName = req.params.fileName;
    const command = new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: serverFileName });
    try {
        await s3Client.send(command);
        res.status(200).json({ message: 'File berhasil dihapus dari S3!' });
    } catch (error) {
        if (error.Code === 'NoSuchKey') {
            return res.status(404).json({ message: 'File tidak ditemukan di S3.' });
        }
        console.error(`[BACKEND] Error deleting file from S3: ${serverFileName}`, error);
        res.status(500).json({ message: `Gagal menghapus file dari S3: ${error.message}` });
    }
});

// Vercel tidak membutuhkan app.listen().
// Sebagai gantinya, Anda mengekspor instance 'app' dari Express.
module.exports = app;