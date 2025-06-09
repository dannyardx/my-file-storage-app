// backend/auth.js
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ADMIN123';
const ADMIN_SECRET_TOKEN = process.env.ADMIN_SECRET_TOKEN || 'ADMIN123';

const verifyAdminCredentials = (password) => {
    // Di produksi, Anda harusnya membandingkan password yang di-hash dari database.
    // Ini adalah simulasi sederhana.
    if (password === ADMIN_PASSWORD) {
        return { success: true, token: ADMIN_SECRET_TOKEN };
    }
    return { success: false, message: 'Password salah.' };
};

const authenticateToken = (req, res, next) => {
    const adminToken = req.headers['authorization'];

    if (!adminToken) {
        return res.status(401).json({ message: 'Akses ditolak: Tidak ada token disediakan.' });
    }

    // Harapkan format "Bearer YOUR_TOKEN"
    const tokenParts = adminToken.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).json({ message: 'Format token tidak valid (Harap gunakan: Bearer TOKEN).' });
    }

    const token = tokenParts[1];

    if (token === ADMIN_SECRET_TOKEN) { // Simulasi verifikasi token
        next();
    } else {
        return res.status(403).json({ message: 'Akses terlarang: Token admin tidak valid.' });
    }
};

module.exports = {
    verifyAdminCredentials,
    authenticateToken,
    ADMIN_SECRET_TOKEN // Masih diekspor untuk memudahkan simulasi di backend server.js jika diperlukan
};