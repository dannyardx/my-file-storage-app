// frontend-user/src/pages/admin/AdminPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
// Gunakan kembali gaya admin lama Anda dari App.css admin, tapi sekarang diimpor ke sini.
// Jika ada konflik dengan App.css user, Anda mungkin perlu membedakan class name-nya.
import '../../App.css'; // Gaya global App.css user
import './AdminPage.css'; // Gaya spesifik AdminPage jika diperlukan (akan dibuat)
import ConfirmationModal from '../../components/admin-components/ConfirmationModal'; // Adjust path
import Login from './Login'; // Import Login

function AdminPage({ BACKEND_URL, FRONTEND_USER_URL }) { // Menerima URL sebagai props
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [files, setFiles] = useState([]);
  const [newFile, setNewFile] = useState(null);
  const [newFileDescription, setNewFileDescription] = '';
  const [message, setMessage] = useState('Memuat...'); // Pesan awal untuk daftar file

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDeleteName, setFileToDeleteName] = useState('');

  const ADMIN_SECRET_TOKEN = 'ADMIN123'; // Ini tetap harus di Render env var untuk backend!

  const showNotification = useCallback((msg, type) => {
    console.log(`[Admin Info] Type: ${type}, Message: ${msg}`);
  }, []);

  const fetchFiles = useCallback(async () => {
    setMessage('Memuat daftar file...');
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
      if (data.length === 0) {
          setMessage('Tidak ada file ZIP/RAR yang diunggah saat ini.');
      } else {
          setMessage('');
      }
    } catch (error) {
      console.error("Error fetching files for admin:", error);
      setMessage('Gagal memuat daftar file. Pastikan koneksi ke backend stabil.');
    }
  }, [BACKEND_URL, ADMIN_SECRET_TOKEN, setIsLoggedIn, showNotification]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    // Untuk demo, kita cek hardcode token di frontend. Di produksi, token ini dari backend.
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
        body: formData,
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
      document.getElementById('fileInput').value = ''; // Reset input file
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
      const response = await fetch(`<span class="math-inline">{BACKEND_URL}/api/admin/files/</span>{fileToDeleteName}`, {
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
    const shareLink = `<span class="math-inline">{FRONTEND_USER_URL}/download/</span>{serverFileName}`;
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
      className="admin-app-container" // Gunakan class admin-app-container dari App.css lama
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Admin Header (dihapus sebelumnya, jika ingin ada judul di AdminPage, tambahkan di sini) */}
      <header className="admin-header-inline">
         <h1>Panel Admin</h1>
         <p>Kelola file ZIP dan RAR Anda.</p>
      </header>

      <main className="admin-content-area">
        {/* Notification component jika Anda ingin menggunakannya */}
        {/* <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} /> */}

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
            <p className="no-files-message">{message}</p>
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

      {/* Render modal konfirmasi */}
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