// frontend-user/src/pages/DownloadPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaDownload, FaInfoCircle, FaFileAlt, FaLock, FaCalendarAlt } from 'react-icons/fa';
import './DownloadPage.css';

// BACKEND_URL sekarang diambil sebagai prop dari App.js
// BACKEND_URL akan berisi '/api' (untuk production Netlify)
// atau 'http://localhost:8888/api' (untuk development lokal Netlify Dev)
const DownloadPage = ({ BACKEND_URL }) => {
    const { fileName } = useParams();
    const [fileInfo, setFileInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [password, setPassword] = useState('');

    const showNotification = useCallback((msg, type) => {
        console.log(`[Notification Suppressed] Type: ${type}, Message: ${msg}`);
    }, []);

    useEffect(() => {
        const handleContextMenu = (event) => {
            event.preventDefault();
        };
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    const fetchFileInfo = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // PERBAIKAN PENTING:
            // Gunakan `${BACKEND_URL}/files/info/${fileName}` BUKAN `${BACKEND_URL}/api/files/info/${fileName}`.
            const response = await fetch(`${BACKEND_URL}/files/info/${fileName}`);
            if (!response.ok) {
                if (response.status === 404) {
                    setError('File tidak ditemukan.');
                    showNotification('File tidak ditemukan.', 'error');
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Terjadi kesalahan tidak dikenal.' }));
                    setError(errorData.message || 'Terjadi kesalahan saat mengambil info file.');
                    showNotification(errorData.message || 'Gagal mengambil info file.', 'error');
                }
                setLoading(false);
                return;
            }
            const data = await response.json();
            setFileInfo(data);
        } catch (err) {
            setError('Tidak dapat terhubung ke server.');
            showNotification('Tidak dapat terhubung ke server.', 'error');
        } finally {
            setLoading(false);
        }
    }, [fileName, BACKEND_URL, showNotification]);

    useEffect(() => {
        fetchFileInfo();
    }, [fetchFileInfo]);

    const handleDownload = async () => {
        if (!fileInfo) return;

        // PERBAIKAN PENTING:
        // Gunakan `${BACKEND_URL}/files/download/${fileName}` BUKAN `${BACKEND_URL}/api/files/download/${fileName}`.
        let downloadUrl = `${BACKEND_URL}/files/download/${fileName}`;
        
        // Fitur download file terlindungi password belum didukung sepenuhnya di demo ini.
        if (fileInfo.isProtected) {
            showNotification('Fitur unduh file terlindungi password belum didukung sepenuhnya di demo ini.', 'info');
            return;
        }

        try {
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Terjadi kesalahan tidak dikenal.' }));
                if (response.status === 404) {
                    showNotification('File tidak ditemukan.', 'error');
                } else {
                    showNotification(errorData.message || 'Gagal mengunduh file.', 'error');
                }
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileInfo.originalFileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            showNotification('File berhasil diunduh!', 'success');

        } catch (err) {
            showNotification('Terjadi kesalahan jaringan atau server.', 'error');
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    if (loading) {
        return (
            <div className="download-page-container">
                <p>Memuat informasi file...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="download-page-container">
                <div className="download-card">
                    <p className="download-error-message"><FaInfoCircle /> {error}</p>
                </div>
            </div>
        );
    }

    if (!fileInfo) {
        return (
            <div className="download-page-container">
                <div className="download-card">
                    <p className="download-error-message">Tidak ada informasi file yang tersedia.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="download-page-container">
            <motion.div
                className="download-card"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
            >
                <h2><FaFileAlt className="title-icon" /> {fileInfo.originalFileName}</h2>
                <p className="file-size">Ukuran: {(fileInfo.fileSize / (1024 * 1024)).toFixed(2)} MB</p>

                {fileInfo.uploadDate && (
                    <div className="file-info-detail">
                        <FaCalendarAlt className="info-icon" />
                        <p>Tanggal Unggah: <strong>{new Date(fileInfo.uploadDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
                    </div>
                )}

                {fileInfo.isProtected && (
                    <div className="file-info-detail protected-info">
                        <FaLock className="info-icon" />
                        <p>Status: <strong>Terlindungi Kata Sandi</strong></p>
                    </div>
                )}

                {fileInfo.isProtected && (
                    <div className="password-input-group">
                        <input
                            type="password"
                            placeholder="Masukkan Kata Sandi"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="password-input"
                        />
                    </div>
                )}

                <motion.button
                    className="download-button"
                    onClick={handleDownload}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FaDownload className="button-icon" /> Unduh Sekarang
                </motion.button>
            </motion.div>
        </div>
    );
};

export default DownloadPage;