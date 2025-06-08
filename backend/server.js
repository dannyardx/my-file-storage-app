// backend/server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); // Mengimpor cors

const app = express();
// Menggunakan port dari environment variable (misalnya dari Render), fallback ke 5000 untuk lokal
const port = process.env.PORT || 5000;

// Middleware untuk CORS
// Penting: Sesuaikan allowedOrigins dengan URL frontend produksi Anda
const allowedOrigins = [
    'http://localhost:3000',             // Untuk pengembangan lokal frontend-user
    'http://localhost:3001',             // Untuk pengembangan lokal frontend-admin
    'https://classy-taiyaki-e7ded3.netlify.app/',          // URL domain kustom frontend-user Anda
    'https://my-file-storage-app.netlify.app/',    // URL subdomain kustom frontend-admin Anda
    // Tambahkan URL Netlify acak di sini jika Anda masih menggunakannya selama transisi DNS:
    // 'https://happy-forest-12345.netlify.app', // Contoh URL Netlify frontend-user sementara
    // 'https://admin-fancy-name-67890.netlify.app' // Contoh URL Netlify frontend-admin sementara
];

app.use(cors({
    origin: function (origin, callback) {
        // Izinkan permintaan tanpa origin (misalnya dari Postman, atau file:// pada browser lokal)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            console.warn(msg); // Log peringatan di server jika Origin tidak diizinkan
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));

// Middleware untuk mengizinkan Express membaca JSON
app.use(express.json());

// Direktori untuk menyimpan file yang diunggah
// Gunakan path.join untuk kompatibilitas lintas OS
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Konfigurasi Multer untuk penyimpanan file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const originalName = file.originalname;
        const fileName = `${Date.now()}-${originalName}`; // Menambahkan timestamp untuk keunikan
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
        fileSize: 100 * 1024 * 1024 // Batasan ukuran file 100MB
    }
});

// Middleware untuk otentikasi admin (contoh sederhana)
// Penting: ADMIN_SECRET_TOKEN harus diatur di environment variable di produksi!
const ADMIN_SECRET_TOKEN = process.env.ADMIN_SECRET_TOKEN || 'ADMIN123'; // Mengambil dari env, fallback ke hardcode

const authenticateAdmin = (req, res, next) => {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== ADMIN_SECRET_TOKEN) {
        return res.status(403).json({ message: 'Akses terlarang: Token admin tidak valid.' });
    }
    next();
};

// ===========================================
//             ROUTES UNTUK PENGGUNA (PUBLIC)
// ===========================================

// Endpoint: GET /api/files
// Mengembalikan daftar file yang tersedia untuk publik
app.get('/api/files', (req, res) => {
    console.log("[BACKEND] Request received for /api/files (public list)");
    if (!fs.existsSync(uploadDir)) {
        console.log("[BACKEND] Upload directory does not exist, returning empty array.");
        return res.json([]);
    }

    fs.readdir(uploadDir, async (err, files) => {
        if (err) {
            console.error("[BACKEND] Error reading public upload directory:", err);
            return res.status(500).json({ message: 'Gagal membaca daftar file publik.' });
        }

        const fileList = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ext === '.zip' || ext === '.rar';
        }).map(file => {
            const parts = file.split('-');
            let originalName = file;
            if (parts.length > 1 && /^\d+$/.test(parts[0])) {
                originalName = parts.slice(1).join('-');
            }
            // Untuk file publik, Anda mungkin ingin menyertakan serverFileName untuk akses detail
            return {
                id: file, // Ini adalah serverFileName
                name: originalName,
                serverFileName: file, // Tambahkan serverFileName secara eksplisit untuk konsistensi frontend
                description: `File ${path.extname(originalName).substring(1).toUpperCase()}`,
            };
        });
        console.log(`[BACKEND] Found ${fileList.length} files for public list.`);
        res.json(fileList);
    });
});

// Endpoint: GET /api/files/info/:fileName
// Mengembalikan informasi detail file untuk halaman unduhan
app.get('/api/files/info/:fileName', (req, res) => {
    const serverFileName = req.params.fileName;
    const filePath = path.join(uploadDir, serverFileName);
    console.log(`[BACKEND-INFO] Request received for file info: ${serverFileName}`);
    console.log(`[BACKEND-INFO] Attempting to find file at path: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.log(`[BACKEND-INFO] File not found for info request at: ${filePath}`);
        return res.status(404).json({ message: 'File tidak ditemukan.' });
    }

    try {
        const stats = fs.statSync(filePath);
        const parts = serverFileName.split('-');
        let originalName = serverFileName;
        if (parts.length > 1 && /^\d+$/.test(parts[0])) {
            originalName = parts.slice(1).join('-');
        }

        // Deskripsi ini tidak diambil dari data upload, hanya dibuat secara dinamis.
        // Jika Anda ingin menyimpan deskripsi kustom, Anda butuh database.
        const description = `File ${path.extname(originalName).substring(1).toUpperCase()} (Ukuran: ${(stats.size / (1024 * 1024)).toFixed(2)} MB)`;

        const fileInfo = {
            originalFileName: originalName, // Sesuaikan dengan yang diharapkan frontend
            serverFileName: serverFileName, // Penting! Pastikan ini ada
            description: description,
            fileSize: stats.size, // Ukuran dalam bytes
            uploadDate: stats.birthtime.toISOString() // Tanggal upload (creation time)
            // isProtected: false // Tambahkan ini jika Anda punya logika proteksi password
        };
        console.log("[BACKEND-INFO] File info sent:", fileInfo);
        res.json(fileInfo);
    } catch (error) {
        console.error(`[BACKEND-INFO] Error getting file stats for ${serverFileName}:`, error);
        return res.status(500).json({ message: 'Gagal mengambil informasi file.' });
    }
});

// Endpoint: GET /api/files/download/:fileName
// Ini adalah endpoint yang akan langsung memicu unduhan file
app.get('/api/files/download/:fileName', (req, res) => {
    const serverFileName = req.params.fileName;
    const filePath = path.join(uploadDir, serverFileName);
    console.log(`[BACKEND-DOWNLOAD] Download request received for: ${serverFileName}`);
    console.log(`[BACKEND-DOWNLOAD] Attempting to serve file from path: ${filePath}`);

    // Cek apakah file ada
    if (fs.existsSync(filePath)) {
        const parts = serverFileName.split('-');
        let originalName = serverFileName;
        if (parts.length > 1 && /^\d+$/.test(parts[0])) {
            originalName = parts.slice(1).join('-');
        }
        console.log(`[BACKEND-DOWNLOAD] Serving file: ${filePath} as ${originalName}`);
        res.download(filePath, originalName, (err) => {
            if (err) {
                // Log error lebih spesifik
                if (err.code === 'ECONNABORTED' || res.headersSent) {
                    console.warn('[BACKEND-DOWNLOAD] Client disconnected during download or headers already sent.');
                } else {
                    console.error("[BACKEND-DOWNLOAD] Error during file download:", err);
                    // Pastikan tidak ada duplikat header jika terjadi error di tengah pengiriman
                    if (!res.headersSent) {
                        res.status(500).json({ message: 'Gagal mengunduh file.' });
                    }
                }
            } else {
                console.log(`[BACKEND-DOWNLOAD] File ${originalName} (${serverFileName}) successfully downloaded.`);
            }
        });
    } else {
        console.log(`[BACKEND-DOWNLOAD] File not found for download at path: ${filePath}`);
        res.status(404).json({ message: 'File tidak ditemukan di server.' });
    }
});


// ===========================================
//             ROUTES UNTUK ADMIN
// ===========================================

// Endpoint: POST /api/admin/upload
app.post('/api/admin/upload', authenticateAdmin, upload.single('file'), (req, res) => {
    console.log("[BACKEND] Admin upload request received.");
    if (!req.file) {
        console.log("[BACKEND] No file uploaded.");
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }
    const fileNameOnServer = req.file.filename;
    // Deskripsi ini tidak disimpan secara persisten tanpa database
    const description = req.body.description || `File ${path.extname(req.file.originalname).substring(1).toUpperCase()}`;

    console.log(`[BACKEND] File uploaded: ${req.file.originalname} as ${fileNameOnServer}, Description: ${description}`);
    res.status(200).json({
        message: 'File berhasil diunggah!',
        fileName: req.file.originalname,
        serverFileName: fileNameOnServer,
        description: description,
        fileSize: req.file.size, // Tambahkan ukuran file
        uploadDate: new Date().toISOString() // Tambahkan tanggal upload
    });
});

// Endpoint: GET /api/admin/files
// Mengembalikan daftar file lengkap dengan serverFileName untuk admin
app.get('/api/admin/files', authenticateAdmin, (req, res) => {
    console.log("[BACKEND] Admin files list request received.");
    if (!fs.existsSync(uploadDir)) {
        console.log("[BACKEND] Upload directory does not exist, returning empty array for admin.");
        return res.json([]);
    }

    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error("[BACKEND] Error reading admin upload directory:", err);
            return res.status(500).json({ message: 'Gagal membaca daftar file admin.' });
        }

        const fileList = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ext === '.zip' || ext === '.rar';
        }).map(file => {
            const parts = file.split('-');
            let originalName = file;
            if (parts.length > 1 && /^\d+$/.test(parts[0])) {
                originalName = parts.slice(1).join('-');
            }
            const filePath = path.join(uploadDir, file);
            let stats = null;
            try {
                stats = fs.statSync(filePath);
            } catch (statErr) {
                console.warn(`[BACKEND] Could not stat file ${filePath}:`, statErr.message);
            }

            // Deskripsi ini dibuat ulang, bukan diambil dari data upload
            return {
                id: file, // Ini adalah serverFileName
                name: originalName,
                serverFileName: file, // Penting untuk operasi delete/share
                description: `File ${path.extname(originalName).substring(1).toUpperCase()}`,
                fileSize: stats ? stats.size : 0,
                uploadDate: stats ? stats.birthtime.toISOString() : new Date().toISOString()
                // isProtected: false // Jika Anda punya logika proteksi password
            };
        });
        console.log(`[BACKEND] Found ${fileList.length} files for admin list.`);
        res.json(fileList);
    });
});

// Endpoint: DELETE /api/admin/files/:fileName
app.delete('/api/admin/files/:fileName', authenticateAdmin, (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(uploadDir, fileName);
    console.log(`[BACKEND] Admin delete request for: ${fileName}`);

    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error("[BACKEND] Error deleting file:", err);
                return res.status(500).json({ message: 'Gagal menghapus file.' });
            }
            console.log(`[BACKEND] File ${fileName} successfully deleted.`);
            res.status(200).json({ message: 'File berhasil dihapus!' });
        });
    } else {
        console.log(`[BACKEND] File not found for deletion: ${filePath}`);
        res.status(404).json({ message: 'File tidak ditemukan.' });
    }
});

// Mulai server
app.listen(port, () => {
    console.log(`Server berjalan di port ${port}`); // Pesan log yang disesuaikan
});