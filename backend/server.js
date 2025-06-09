// backend/server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Pastikan 'fs' diimpor jika digunakan
const cors = require('cors');
// MIGRATION AWS SDK v2 ke v3
// const AWS = require('aws-sdk'); // Baris ini harus dikomentari atau dihapus
const { S3Client, ListObjectsV2Command, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const { verifyAdminCredentials, authenticateToken } = require('./auth');

const app = express();
const port = process.env.PORT || 5000;

// =====================================================================
// Konfigurasi AWS S3 SDK v3
// =====================================================================
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-1';

// Buat instance S3Client (SDK v3)
const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
});


// =====================================================================
// MIDDLEWARE CORS
// PENTING: Untuk PRODUKSI, ganti 'origin: "*"' dengan domain frontend Anda
// =====================================================================
app.use(cors({
    origin: '*', // Izinkan semua origin untuk permintaan utama (HANYA UNTUK DEVELOPMENT/DEMO)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'], // Termasuk header Authorization
    credentials: true
}));
app.options('*', cors()); // Mengatur respons preflight untuk semua rute

app.use(express.json());

// Konfigurasi Multer
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
// ROUTES UNTUK PENGGUNA (PUBLIC)
// ===========================================

app.get('/api/files', async (req, res) => {
    console.log("[BACKEND] Request received for /api/files (public list)");
    try {
        const command = new ListObjectsV2Command({
            Bucket: S3_BUCKET_NAME
        });
        const data = await s3Client.send(command);

        const fileList = data.Contents.filter(item => {
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
    const serverFileName = req.params.fileName;
    console.log(`[BACKEND-INFO] Request received for file info from S3: ${serverFileName}`);

    try {
        const command = new HeadObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: serverFileName
        });
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
        if (error.Code === 'NotFound') { // SDK v3 menggunakan error.Code
            console.log(`[BACKEND-INFO] File not found in S3: ${serverFileName}`);
            return res.status(404).json({ message: 'File tidak ditemukan di S3.' });
        }
        console.error(`[BACKEND-INFO] Error getting file info from S3 for ${serverFileName}:`, error);
        return res.status(500).json({ message: 'Gagal mengambil informasi file dari S3.' });
    }
});

app.get('/api/files/download/:fileName', async (req, res) => {
    const serverFileName = req.params.fileName;
    console.log(`[BACKEND-DOWNLOAD] Download request received for: ${serverFileName}`);

    const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: serverFileName
    });

    const parts = serverFileName.split('-');
    let originalName = serverFileName;
    if (parts.length > 1 && !isNaN(Number(parts[0])) && String(Number(parts[0])) === parts[0]) {
        originalName = parts.slice(1).join('-');
    }

    res.attachment(originalName);

    try {
        const response = await s3Client.send(command);
        response.Body.pipe(res);
        console.log(`[BACKEND-DOWNLOAD] Initiated stream for file ${originalName} from S3.`);
    } catch (err) {
        console.error(`[BACKEND-DOWNLOAD] Error streaming file from S3: ${serverFileName}`, err);
        if (err.Code === 'NoSuchKey') {
            return res.status(404).json({ message: 'File tidak ditemukan di S3.' });
        }
        if (!res.headersSent) {
            res.status(500).json({ message: 'Gagal mengunduh file dari S3.' });
        }
    }
});


// ===========================================
// ROUTES UNTUK ADMIN
// ===========================================

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const { success, token, message } = verifyAdminCredentials(password);

    if (success) {
        res.json({ message: 'Login berhasil!', token: token });
    } else {
        res.status(401).json({ message: message });
    }
});

app.post('/api/admin/upload', authenticateToken, upload.single('file'), async (req, res) => {
    console.log("[BACKEND] Admin upload request received.");
    if (!req.file) {
        console.log("[BACKEND] No file uploaded.");
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const originalName = req.file.originalname;
    const serverFileName = `${Date.now()}-${originalName}`;
    const description = req.body.description || `File ${path.extname(originalName).substring(1).toUpperCase()}`;

    const uploader = new Upload({
        client: s3Client,
        params: {
            Bucket: S3_BUCKET_NAME,
            Key: serverFileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: 'private'
        },
    });

    try {
        const data = await uploader.done();
        console.log(`[BACKEND] File uploaded to S3: ${data.Location}`);
        res.status(200).json({
            message: 'File berhasil diunggah ke S3!',
            fileName: originalName,
            serverFileName: serverFileName,
            description: description,
            fileSize: req.file.size,
            uploadDate: new Date().toISOString(),
            s3Location: data.Location
        });
    } catch (error) {
        console.error("Error uploading file to S3:", error);
        res.status(500).json({ message: `Gagal mengunggah file ke S3: ${error.message}` });
    }
});

app.get('/api/admin/files', authenticateToken, async (req, res) => {
    console.log("[BACKEND] Admin files list request received.");
    try {
        const command = new ListObjectsV2Command({
            Bucket: S3_BUCKET_NAME
        });
        const data = await s3Client.send(command);

        const fileList = data.Contents.filter(item => {
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
        console.log(`[BACKEND] Found ${fileList.length} files from S3 for admin list.`);
        res.json(fileList);
    } catch (error) {
        console.error("[BACKEND] Error listing files from S3 for admin:", error);
        res.status(500).json({ message: 'Gagal memuat daftar file admin dari S3.' });
    }
});

app.delete('/api/admin/files/:fileName', authenticateToken, async (req, res) => {
    const serverFileName = req.params.fileName;
    console.log(`[BACKEND] Admin delete request for S3 file: ${serverFileName}`);

    const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: serverFileName
    });

    try {
        await s3Client.send(command);
        console.log(`[BACKEND] File ${serverFileName} successfully deleted from S3.`);
        res.status(200).json({ message: 'File berhasil dihapus dari S3!' });
    } catch (error) {
        if (error.Code === 'NoSuchKey') { // SDK v3 menggunakan error.Code
            console.log(`[BACKEND] File not found in S3 for deletion: ${serverFileName}`);
            return res.status(404).json({ message: 'File tidak ditemukan di S3.' });
        }
        console.error(`[BACKEND] Error deleting file from S3: ${serverFileName}`, error);
        res.status(500).json({ message: `Gagal menghapus file dari S3: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`Server berjalan di port ${port}`);
});