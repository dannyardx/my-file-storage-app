// frontend-user/src/pages/DownloadPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaDownload, FaInfoCircle, FaFileAlt, FaLock, FaCalendarAlt } from 'react-icons/fa';
// import Notification from '../components/Notification'; // Hapus atau komentari baris ini
import './DownloadPage.css';

const BACKEND_URL = 'http://localhost:5000';

const DownloadPage = () => {
    const { fileName } = useParams();
    const [fileInfo, setFileInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [password, setPassword] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    // const [notification, setNotification] = useState({ message: '', type: '' }); // Hapus atau komentari baris ini

    // Hapus atau komentari fungsi showNotification
    const showNotification = useCallback((msg, type) => {
        // setNotification({ message: msg, type: type });
        // setTimeout(() => setNotification({ message: '', type: '' }), 3000);
        console.log(`[Notification Suppressed] Type: ${type}, Message: ${msg}`); // Opsional: log ke konsol
    }, []);

    // Efek untuk mencegah context menu (klik kanan) di DownloadPage
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
            const response = await fetch(`${BACKEND_URL}/api/files/info/${fileName}`);
            if (!response.ok) {
                if (response.status === 404) {
                    setError('File tidak ditemukan.');
                    showNotification('File tidak ditemukan.', 'error'); // Biarkan pemanggilan ini jika Anda tidak ingin menghapus semua
                } else {
                    const errorData = await response.json();
                    setError(errorData.message || 'Terjadi kesalahan saat mengambil info file.');
                    showNotification(errorData.message || 'Gagal mengambil info file.', 'error'); // Biarkan pemanggilan ini
                }
                setLoading(false);
                return;
            }
            const data = await response.json();
            setFileInfo(data);
            if (data.isProtected) {
                setShowPasswordInput(true);
            }
        } catch (err) {
            setError('Tidak dapat terhubung ke server.');
            showNotification('Tidak dapat terhubung ke server.', 'error'); // Biarkan pemanggilan ini
        } finally {
            setLoading(false);
        }
    }, [fileName, showNotification]);

    useEffect(() => {
        fetchFileInfo();
    }, [fetchFileInfo]);

    const handleDownload = async () => {
        if (!fileInfo) return;

        let downloadUrl = `${BACKEND_URL}/api/files/download/${fileName}`;
        let method = 'GET';
        let headers = {};
        let body = null;

        if (fileInfo.isProtected) {
            if (!password) {
                showNotification('Masukkan kata sandi untuk mengunduh.', 'info'); // Biarkan pemanggilan ini
                return;
            }
            method = 'POST';
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify({ password });
        }

        try {
            const response = await fetch(downloadUrl, { method, headers, body });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 401) {
                    showNotification('Kata sandi salah!', 'error'); // Biarkan pemanggilan ini
                } else if (response.status === 404) {
                    showNotification('File tidak ditemukan.', 'error'); // Biarkan pemanggilan ini
                } else {
                    showNotification(errorData.message || 'Gagal mengunduh file.', 'error'); // Biarkan pemanggilan ini
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

            showNotification('File berhasil diunduh!', 'success'); // Biarkan pemanggilan ini

        } catch (err) {
            showNotification('Terjadi kesalahan jaringan atau server.', 'error'); // Biarkan pemanggilan ini
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
                {/* Hapus atau komentari baris ini */}
                {/* <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} /> */}
                <div className="download-card">
                    <p className="download-error-message"><FaInfoCircle /> {error}</p>
                </div>
            </div>
        );
    }

    if (!fileInfo) {
        return (
            <div className="download-page-container">
                {/* Hapus atau komentari baris ini */}
                {/* <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} /> */}
                <div className="download-card">
                    <p className="download-error-message">Tidak ada informasi file yang tersedia.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="download-page-container">
            {/* Hapus atau komentari baris ini */}
            {/* <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} /> */}
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

                {showPasswordInput && (
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