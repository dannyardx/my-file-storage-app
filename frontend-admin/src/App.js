// frontend-admin/src/App.js

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import './App.css';
import Login from './Login';
import ConfirmationModal from './components/ConfirmationModal';
import PureCssParticles from './components/PureCssParticles';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [files, setFiles] = useState([]);
  const [newFile, setNewFile] = useState(null);
  const [newFileDescription, setNewFileDescription] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDeleteName, setFileToDeleteName] = useState('');

  // --- Bagian Penting untuk Variabel URL ---
  // Ini adalah logika yang menentukan URL backend dan frontend user
  // berdasarkan NODE_ENV.
  // Saat Netlify membangun (deploy), NODE_ENV otomatis disetel ke 'production'.
  // Jadi, jika deploy Netlify masih menunjuk ke localhost:5000,
  // itu berarti Netlify tidak mendapatkan nilai REACT_APP_BACKEND_URL_PROD yang benar,
  // atau ada cache yang kuat di Netlify.
  const BACKEND_URL = process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_BACKEND_URL_PROD
    : process.env.REACT_APP_BACKEND_URL_DEV;

  const FRONTEND_USER_URL = process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_FRONTEND_USER_URL_PROD
    : process.env.REACT_APP_FRONTEND_USER_URL_DEV;

  // Pastikan ADMIN_SECRET_TOKEN ini hanya untuk demo di frontend.
  // Seharusnya diatur di backend.
  const ADMIN_SECRET_TOKEN = 'ADMIN123';
  // --- Akhir Bagian Penting ---


  const showNotification = useCallback((msg, type) => {
    console.log(`[Admin Info] Type: ${type}, Message: ${msg}`);
  }, []);

  const fetchFiles = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/files`, {
        headers: {
          'x-admin-token': ADMIN_SECRET_TOKEN,
        },
      });
      if (!response.ok) {
        if (response.status === 403) {
            localStorage.removeItem('adminToken');
            setIsLoggedIn(false);
            showNotification('Sesi berakhir atau token tidak valid. Silakan login kembali.', 'error');
            return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error("Error fetching files for admin:", error);
      showNotification('Gagal memuat daftar file. Pastikan backend berjalan dan token valid.', 'error');
    }
  }, [BACKEND_URL, ADMIN_SECRET_TOKEN, setIsLoggedIn, showNotification]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token === ADMIN_SECRET_TOKEN) {
      setIsLoggedIn(true);
      fetchFiles();
    } else {
      setIsLoggedIn(false);
    }
  }, [fetchFiles, ADMIN_SECRET_TOKEN]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!newFile) {
      showNotification('Pilih file untuk diunggah!', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', newFile);
    formData.append('description', newFileDescription);

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/upload`, {
        method: 'POST',
        headers: {
          'x-admin-token': ADMIN_SECRET_TOKEN,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
            localStorage.removeItem('adminToken');
            setIsLoggedIn(false);
            showNotification('Sesi berakhir atau token tidak valid. Silakan login kembali.', 'error');
            return;
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      showNotification(`File '${result.fileName}' berhasil diunggah!`, 'success');
      setNewFile(null);
      setNewFileDescription('');
      document.getElementById('fileInput').value = '';
      fetchFiles();
    } catch (error) {
      console.error("Error uploading file:", error);
      showNotification(`Gagal mengunggah file: ${error.message}`, 'error');
    }
  };

  const handleDeleteFile = (serverFileName) => {
    setFileToDeleteName(serverFileName);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/files/${fileToDeleteName}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': ADMIN_SECRET_TOKEN,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
            localStorage.removeItem('adminToken');
            setIsLoggedIn(false);
            showNotification('Sesi berakhir atau token tidak valid. Silakan login kembali.', 'error');
            return;
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      showNotification(`File '${fileToDeleteName}' berhasil dihapus!`, 'success');
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      showNotification(`Gagal menghapus file: ${error.message}`, 'error');
    } finally {
      setFileToDeleteName('');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setFileToDeleteName('');
  };

  const handleShareClick = async (serverFileName) => {
    const shareLink = `${FRONTEND_USER_URL}/download/${serverFileName}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      showNotification('Link disalin ke clipboard!', 'success');
    } catch (err) {
      console.error('Gagal menyalin link:', err);
      showNotification('Gagal menyalin link.', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
    showNotification('Anda telah logout.', 'success');
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    showNotification('Login berhasil!', 'success');
    fetchFiles();
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <motion.div
      className="admin-app-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animasi Partikel - di belakang konten */}
      <PureCssParticles />

      {/* Admin Content */}
      <main className="admin-content-area">
        {/* Unggah File Baru */}
        <motion.section
          className="admin-section upload-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h2>Unggah File Baru</h2>
          <form onSubmit={handleFileUpload} className="upload-form">
            <input
              type="file"
              id="fileInput"
              onChange={(e) => setNewFile(e.target.files[0])}
              className="file-input"
              accept=".zip,.rar"
            />
            <input
              type="text"
              placeholder="Deskripsi file (opsional)"
              value={newFileDescription}
              onChange={(e) => setNewFileDescription(e.target.value)}
              className="description-input"
            />
            <motion.button
              type="submit"
              className="upload-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Unggah File
            </motion.button>
          </form>
        </motion.section>

        {/* Daftar File Tersedia */}
        <motion.section
          className="admin-section file-list-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2>Daftar File Tersedia</h2>
          {files.length > 0 ? (
            <div className="file-list-container">
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  className="admin-file-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                >
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-description">{file.description}</span>
                    {file.fileSize && file.uploadDate && (
                      <span className="file-size-date">
                        Ukuran: {(file.fileSize / (1024 * 1024)).toFixed(2)} MB | Diunggah: {new Date(file.uploadDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="file-actions">
                    <motion.button
                      onClick={() => handleDeleteFile(file.serverFileName)}
                      className="delete-button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Hapus
                    </motion.button>
                    <motion.button
                      onClick={() => handleShareClick(file.serverFileName)}
                      className="share-button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Bagikan Link
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="no-files-message">Tidak ada file ZIP/RAR yang diunggah saat ini.</p>
          )}
        </motion.section>

        {/* Tombol Logout dipindahkan di sini */}
        <motion.button
            className="logout-button bottom-logout-button"
            onClick={handleLogout}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            Logout
        </motion.button>
      </main>

      {/* Admin Footer */}
      <footer className="admin-footer">
        <p>&copy; 2025 Admin File Storage.</p>
      </footer>

      {/* RENDER MODAL KONFIRMASI */}
      {showDeleteModal && (
        <ConfirmationModal
          title="Hapus File"
          message={`Anda yakin ingin menghapus file "${fileToDeleteName}"? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </motion.div>
  );
}

export default App;