// backend/server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// =====================================================================
// MIDDLEWARE CORS AGRESIIF
// =====================================================================
app.options('*', cors({
    origin: '*', // Izinkan semua origin untuk preflight
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // PASTIKAN DELETE ADA DI SINI
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token'], // PASTIKAN x-admin-token ADA DI SINI
    credentials: true
}));

app.use(cors({
    origin: '*', // Izinkan semua origin untuk permintaan utama
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // PASTIKAN DELETE ADA DI SINI
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token'], // PASTIKAN x-admin-token ADA DI SINI
    credentials: true
}));
// =====================================================================

app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const originalName = file.originalname;
        const fileName = `${Date.now()}-${originalName}`;
        console.log(`[BACKEND-UPLOAD] Storing file: ${originalName} as ${fileName}`);
        cb(null, fileName);
    }
});

const upload = multer({
    storage: storage,
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

const ADMIN_SECRET_TOKEN = process.env.ADMIN_SECRET_TOKEN || 'ADMIN123';

const authenticateAdmin = (req, res, next) => {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== ADMIN_SECRET_TOKEN) {
        return res.status(403).json({ message: 'Akses terlarang: Token admin tidak valid.' });
    }
    next();
};

// ===========================================
// ROUTES UNTUK PENGGUNA (PUBLIC)
// ===========================================

app.get('/api/files', async (req, res) => {
    console.log("[BACKEND] Request received for /api/files (public list)");
    try {
        const params = {
            Bucket: S3_BUCKET_NAME
        };
        const data = await s3.listObjectsV2(params).promise();

        const fileList = data.Contents.filter(item => {
            const ext = path.extname(item.Key).toLowerCase();
            return ext === '.zip' || ext === '.rar';
        }).map(item => {
            const serverFileName = item.Key;
            const parts = serverFileName.split('-');
            let originalName = serverFileName;
            if (parts.length > 1 && /^\d+$/.test(parts[0])) {
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
        const headParams = {
            Bucket: S3_BUCKET_NAME,
            Key: serverFileName
        };
        const data = await s3.headObject(headParams).promise();

        const parts = serverFileName.split('-');
        let originalName = serverFileName;
        if (parts.length > 1 && /^\d+$/.test(parts[0])) {
            originalName = parts.slice(1).join('-');
        }

        const description = `File ${path.extname(originalName).substring(1).toUpperCase()} (Ukuran: ${(data.ContentLength / (1024 * 1024)).toFixed(2)} MB)`;

        const fileInfo = {
            originalFileName: originalName,
            serverFileName: serverFileName,
            description: description,
            fileSize: data.ContentLength,
            uploadDate: data.LastModified.toISOString()
        };
        console.log("[BACKEND-INFO] File info sent from S3:", fileInfo);
        res.json(fileInfo);
    } catch (error) {
        if (error.code === 'NotFound') {
            console.log(`[BACKEND-INFO] File not found in S3: ${serverFileName}`);
            return res.status(404).json({ message: 'File tidak ditemukan di S3.' });
        }
        console.error(`[BACKEND-INFO] Error getting file info from S3 for ${serverFileName}:`, error);
        return res.status(500).json({ message: 'Gagal mengambil informasi file dari S3.' });
    }
});

app.get('/api/files/download/:fileName', (req, res) => {
    const serverFileName = req.params.fileName;
    console.log(`[BACKEND-DOWNLOAD] Download request received for: ${serverFileName}`);

    const params = {
        Bucket: S3_BUCKET_NAME,
        Key: serverFileName
    };

    const parts = serverFileName.split('-');
    let originalName = serverFileName;
    if (parts.length > 1 && /^\d+$/.test(parts[0])) {
        originalName = parts.slice(1).join('-');
    }

    res.attachment(originalName);

    const fileStream = s3.getObject(params).createReadStream();
    fileStream.on('error', (err) => {
        console.error(`[BACKEND-DOWNLOAD] Error streaming file from S3: ${serverFileName}`, err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Gagal mengunduh file dari S3.' });
        }
    });
    fileStream.pipe(res);
    console.log(`[BACKEND-DOWNLOAD] Initiated stream for file ${originalName} from S3.`);
});

// ===========================================
// ROUTES UNTUK ADMIN
// ===========================================

app.post('/api/admin/upload', authenticateAdmin, upload.single('file'), async (req, res) => {
    console.log("[BACKEND] Admin upload request received.");
    if (!req.file) {
        console.log("[BACKEND] No file uploaded.");
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const originalName = req.file.originalname;
    const serverFileName = `${Date.now()}-${originalName}`;
    const description = req.body.description || `File ${path.extname(originalName).substring(1).toUpperCase()}`;

    const params = {
        Bucket: S3_BUCKET_NAME,
        Key: serverFileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: 'public-read'
    };

    try {
        const data = await s3.upload(params).promise();
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

app.get('/api/admin/files', authenticateAdmin, async (req, res) => {
    console.log("[BACKEND] Admin files list request received.");
    try {
        const params = {
            Bucket: S3_BUCKET_NAME
        };
        const data = await s3.listObjectsV2(params).promise();

        const fileList = data.Contents.filter(item => {
            const ext = path.extname(item.Key).toLowerCase();
            return ext === '.zip' || ext === '.rar';
        }).map(item => {
            const serverFileName = item.Key;
            const parts = serverFileName.split('-');
            let originalName = serverFileName;
            if (parts.length > 1 && /^\d+$/.test(parts[0])) {
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

app.delete('/api/admin/files/:fileName', authenticateAdmin, async (req, res) => { // Pastikan ini async
    const serverFileName = req.params.fileName; // Ubah nama parameter
    console.log(`[BACKEND] Admin delete request for S3 file: ${serverFileName}`);

    const params = {
        Bucket: S3_BUCKET_NAME,
        Key: serverFileName
    };

    try {
        await s3.deleteObject(params).promise();
        console.log(`[BACKEND] File ${serverFileName} successfully deleted from S3.`);
        res.status(200).json({ message: 'File berhasil dihapus dari S3!' });
    } catch (error) {
        if (error.code === 'NoSuchKey') {
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