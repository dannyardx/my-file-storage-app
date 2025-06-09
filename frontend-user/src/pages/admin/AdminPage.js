// frontend-user/src/pages/admin/AdminPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import '../../App.css';
import './AdminPage.css';

import ConfirmationModal from '../../components/admin-components/ConfirmationModal';
import Login from './Login';

function AdminPage({ BACKEND_URL, FRONTEND_USER_URL }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [files, setFiles] = useState([]);
  const [newFile, setNewFile] = useState(null);
  const [newFileDescription, setNewFileDescription] = useState('');
  const [message, setMessage] = useState('Memuat daftar file...');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDeleteName, setFileToDeleteName] = useState('');

  const showNotification = useCallback((msg, type) => {
    console.log(`[Admin Info] Type: ${type}, Message: ${msg}`);
  }, []);

  const fetchFiles = useCallback(async () => {
    setMessage('Memuat daftar file...');
    const token = localStorage.getItem('adminToken');
    if (!token) {
        setIsLoggedIn(false);
        showNotification('Tidak ada token autentikasi. Silakan login.', 'error');
        return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/admin/files`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('adminToken');
            setIsLoggedIn(false);
            showNotification('Sesi berakhir atau token tidak valid. Silakan login kembali.', 'error');
            return;
        }
        const errorData = await response.json().catch(() => ({ message: 'Terjadi kesalahan tidak dikenal atau bukan JSON.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFiles(data);
      if (data.length === 0) {
          setMessage('Tidak ada file ZIP/RAR yang diunggah saat ini.');
      } else {
          setMessage('');
      }
    } catch (error) {
      console.error("Error fetching files for admin:", error);
      setMessage(`Gagal memuat daftar file: ${error.message}. Pastikan backend berjalan.`);
      showNotification(`Gagal memuat daftar file: ${error.message}`, 'error');
    }
  }, [BACKEND_URL, showNotification]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsLoggedIn(true);
      fetchFiles();
    } else {
      setIsLoggedIn(false);
    }
  }, [fetchFiles]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!newFile) {
      showNotification('Pilih file untuk diunggah!', 'error');
      return;
    }

    const token = localStorage.getItem('adminToken');
    if (!token) {
        showNotification('Tidak terautentikasi. Silakan login kembali.', 'error');
        setIsLoggedIn(false);
        return;
    }

    const formData = new FormData();
    formData.append('file', newFile);
    formData.append('description', newFileDescription);

    try {
      const response = await fetch(`${BACKEND_URL}/admin/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Terjadi kesalahan tidak dikenal atau bukan JSON.' }));
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('adminToken');
            setIsLoggedIn(false);
            showNotification('Sesi berakhir atau token tidak valid. Silakan login kembali.', 'error');
            return;
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      showNotification(`File '${result.fileName}' berhasil diunggah ke S3!`, 'success');
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

    const token = localStorage.getItem('adminToken');
    if (!token) {
        showNotification('Tidak terautentikasi. Silakan login kembali.', 'error');
        setIsLoggedIn(false);
        return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/admin/files/${fileToDeleteName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Terjadi kesalahan tidak dikenal atau bukan JSON.' }));
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('adminToken');
            setIsLoggedIn(false);
            showNotification('Sesi berakhir atau token tidak valid. Silakan login kembali.', 'error');
            return;
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      showNotification(`File '${fileToDeleteName}' berhasil dihapus dari S3!`, 'success');
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
      showNotification(`Link "${shareLink}" disalin ke clipboard!`, 'success');
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

  const handleLoginSuccess = (token) => {
    localStorage.setItem('adminToken', token);
    setIsLoggedIn(true);
    showNotification('Login berhasil!', 'success');
    fetchFiles();
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} BACKEND_URL={BACKEND_URL} />;
  }

  return (
    <motion.div
      className="admin-app-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <header className="admin-header-inline">
         <h1>Panel Admin GhostVIP</h1>
         <p>Kelola file ZIP dan RAR Anda di S3.</p>
         <motion.button
             className="logout-button header-logout-button"
             onClick={handleLogout}
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
         >
             Logout
         </motion.button>
      </header>

      <main className="admin-content-area">
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
            <p className="no-files-message">{message}</p>
          )}
        </motion.section>
      </main>

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

export default AdminPage;