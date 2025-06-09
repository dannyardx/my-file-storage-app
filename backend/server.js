// backend/server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const AWS = require('aws-sdk'); // Impor AWS SDK
const { verifyAdminCredentials, authenticateToken } = require('./auth'); // Impor fungsi autentikasi baru

const app = express();
const port = process.env.PORT || 5000;

// =====================================================================
// Konfigurasi AWS S3 - Variabel ini dibaca dari environment variables di Render
// =====================================================================
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-1'; // Ganti dengan region S3 Anda

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});

const s3 = new AWS.S3(); // Buat instance S3


// =====================================================================
// MIDDLEWARE CORS
// PENTING: Untuk PRODUKSI, ganti 'origin: "*"' dengan domain frontend Anda
// Contoh untuk produksi:
// const allowedOrigins = ['https://your-frontend-domain.com', 'http://localhost:3000'];
// app.use(cors({
//     origin: function (origin, callback) {
//         // Izinkan permintaan tanpa origin (misal dari aplikasi mobile atau curl)
//         // dan dari domain yang diizinkan
//         if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//             callback(null, true);
//         } else {
//             callback(new Error('Not allowed by CORS'));
//         }
//     },
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'], // Pastikan Authorization disertakan
//     credentials: true
// }));
// app.options('*', cors()); // Pre-flight options for all routes
// =====================================================================
app.use(cors({
    origin: '*', // Izinkan semua origin untuk permintaan utama (HANYA UNTUK DEVELOPMENT/DEMO)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'], // Termasuk header Authorization
    credentials: true
}));
app.options('*', cors()); // Mengatur respons preflight untuk semua rute

app.use(express.json()); // Middleware untuk parsing JSON body

// Konfigurasi Multer untuk membaca file ke dalam memori (bukan disk lokal)
const upload = multer({
    storage: multer.memoryStorage(), // Menyimpan file di memori sementara
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
        fileSize: 100 * 1024 * 1024 // Batasan ukuran file 100MB
    }
});

// ===========================================
// ROUTES UNTUK PENGGUNA (PUBLIC)
// ===========================================

app.get('/api/files', async (req, res) => {
    console.log("[BACKEND] Request received for /api/files (public list)");
    try {
        const params = {
            Bucket: S3_BUCKET_NAME
        };
        const data = await s3.listObjectsV2(params).promise(); // List objek di bucket

        const fileList = data.Contents.filter(item => {
            const ext = path.extname(item.Key).toLowerCase();
            return ext === '.zip' || ext === '.rar';
        }).map(item => {
            const serverFileName = item.Key; // Key adalah nama file di S3
            const parts = serverFileName.split('-');
            let originalName = serverFileName;
            // Hapus timestamp dari nama asli jika ada
            if (parts.length > 1 && !isNaN(Number(parts[0])) && String(Number(parts[0])) === parts[0]) {
                originalName = parts.slice(1).join('-');
            }
            return {
                id: serverFileName, // ID adalah nama file di S3
                name: originalName,
                serverFileName: serverFileName,
                description: `File ${path.extname(originalName).substring(1).toUpperCase()}`,
                fileSize: item.Size,
                uploadDate: item.LastModified.toISOString()
                // isProtected: false // Default atau tambahkan logika jika ada proteksi password
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
        const data = await s3.headObject(headParams).promise(); // Dapatkan metadata objek tanpa mengunduh

        const parts = serverFileName.split('-');
        let originalName = serverFileName;
        if (parts.length > 1 && !isNaN(Number(parts[0])) && String(Number(parts[0])) === parts[0]) {
            originalName = parts.slice(1).join('-');
        }

        const fileInfo = {
            originalFileName: originalName,
            serverFileName: serverFileName,
            description: `File ${path.extname(originalName).substring(1).toUpperCase()}`, // Deskripsi default jika tidak ada metadata
            fileSize: data.ContentLength,
            uploadDate: data.LastModified.toISOString(),
            isProtected: false // Asumsi file publik tidak dilindungi. Sesuaikan jika ada mekanisme proteksi file.
        };
        console.log("[BACKEND-INFO] File info sent from S3:", fileInfo);
        res.json(fileInfo);
    } catch (error) {
        if (error.code === 'NoSuchKey') {
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
    if (parts.length > 1 && !isNaN(Number(parts[0])) && String(Number(parts[0])) === parts[0]) {
        originalName = parts.slice(1).join('-');
    }

    res.attachment(originalName); // Mengatur header Content-Disposition untuk unduhan

    const fileStream = s3.getObject(params).createReadStream();
    fileStream.on('error', (err) => {
        console.error(`[BACKEND-DOWNLOAD] Error streaming file from S3: ${serverFileName}`, err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Gagal mengunduh file dari S3.' });
        }
    });
    fileStream.pipe(res); // Mengalirkan data file dari S3 langsung ke respons
    console.log(`[BACKEND-DOWNLOAD] Initiated stream for file ${originalName} from S3.`);
});


// ===========================================
// ROUTES UNTUK ADMIN
// ===========================================

// Route untuk login admin
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const { success, token, message } = verifyAdminCredentials(password);

    if (success) {
        res.json({ message: 'Login berhasil!', token: token });
    } else {
        res.status(401).json({ message: message });
    }
});

// Gunakan middleware autentikasi untuk semua rute admin lainnya
app.post('/api/admin/upload', authenticateToken, upload.single('file'), async (req, res) => {
    console.log("[BACKEND] Admin upload request received.");
    if (!req.file) {
        console.log("[BACKEND] No file uploaded.");
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }

    const originalName = req.file.originalname;
    const serverFileName = `${Date.now()}-${originalName}`; // Nama unik untuk di S3
    const description = req.body.description || `File ${path.extname(originalName).substring(1).toUpperCase()}`;

    const params = {
        Bucket: S3_BUCKET_NAME,
        Key: serverFileName, // Nama file di S3
        Body: req.file.buffer, // Buffer dari Multer memoryStorage
        ContentType: req.file.mimetype, // Tipe MIME file
        ACL: 'private' // Ubah menjadi private secara default. Akses melalui download route.
                         // Jika ingin publik, gunakan 'public-read' dan pastikan bucket policy mengizinkan.
    };

    try {
        const data = await s3.upload(params).promise(); // Unggah ke S3
        console.log(`[BACKEND] File uploaded to S3: ${data.Location}`); // data.Location adalah URL publik S3
        res.status(200).json({
            message: 'File berhasil diunggah ke S3!',
            fileName: originalName,
            serverFileName: serverFileName, // Nama file di S3
            description: description,
            fileSize: req.file.size,
            uploadDate: new Date().toISOString(),
            s3Location: data.Location // URL publik S3 dari file
        });
    } catch (error) {
        console.error("Error uploading file to S3:", error);
        res.status(500).json({ message: `Gagal mengunggah file ke S3: ${error.message}` });
    }
});

app.get('/api/admin/files', authenticateToken, async (req, res) => {
    console.log("[BACKEND] Admin files list request received.");
    try {
        const params = {
            Bucket: S3_BUCKET_NAME
        };
        const data = await s3.listObjectsV2(params).promise(); // List objek di bucket

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

    const params = {
        Bucket: S3_BUCKET_NAME,
        Key: serverFileName
    };

    try {
        await s3.deleteObject(params).promise(); // Hapus objek dari S3
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