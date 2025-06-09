// frontend-user/src/pages/admin/AdminPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
// Gaya umum App.css user dan AdminPage.css spesifik untuk halaman ini
import '../../App.css'; 
import './AdminPage.css'; 

// Import komponen admin-specific
import ConfirmationModal from '../../components/admin-components/ConfirmationModal'; 
import Login from './Login'; 

function AdminPage({ BACKEND_URL, FRONTEND_USER_URL }) { // Menerima URL sebagai props dari App.js
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [files, setFiles] = useState([]);
  const [newFile, setNewFile] = useState(null);
  const [newFileDescription, setNewFileDescription] = '';
  const [message, setMessage] = useState('Memuat daftar file...'); // Pesan untuk daftar file
  
  // eslint-disable-next-line no-empty-pattern
  const [] = useState({ message: '', type: '' }); // Untuk notifikasi sementara (console.log)

  // --- STATE UNTUK MODAL KONFIRMASI ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDeleteName, setFileToDeleteName] = useState(''); // Untuk menyimpan nama file yang akan dihapus
  // ------------------------------------------

  // ADMIN_SECRET_TOKEN di frontend (untuk demo). Di produksi, ini harus diamankan atau dibaca dari backend.
  const ADMIN_SECRET_TOKEN = 'ADMIN123'; 
  
  // showNotification diubah menjadi hanya log ke konsol, karena kita tidak pakai komponen notifikasi UI
  const showNotification = useCallback((msg, type) => {
    console.log(`[Admin Info] Type: ${type}, Message: ${msg}`);
  }, []);

  // Fungsi untuk mengambil daftar file dari backend S3
  const fetchFiles = useCallback(async () => {
    setMessage('Memuat daftar file...'); // Pesan status saat memuat
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
        // Jika respons bukan OK, coba baca pesan error dari body JSON
        const errorData = await response.json().catch(() => ({ message: 'Terjadi kesalahan tidak dikenal.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFiles(data);
      if (data.length === 0) {
          setMessage('Tidak ada file ZIP/RAR yang diunggah saat ini.');
      } else {
          setMessage(''); // Hapus pesan jika ada file
      }
    } catch (error) {
      console.error("Error fetching files for admin:", error);
      setMessage(`Gagal memuat daftar file: ${error.message}. Pastikan backend berjalan.`);
      showNotification(`Gagal memuat daftar file: ${error.message}`, 'error');
    }
  }, [BACKEND_URL, ADMIN_SECRET_TOKEN, setIsLoggedIn, showNotification]);

  // Efek untuk memeriksa status login dan memuat file saat komponen di-mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token === ADMIN_SECRET_TOKEN) { // Untuk demo, membandingkan token di localStorage dengan hardcode
      setIsLoggedIn(true);
      fetchFiles();
    } else {
      setIsLoggedIn(false);
    }
  }, [fetchFiles, ADMIN_SECRET_TOKEN]);

  // Fungsi untuk mengunggah file ke backend S3
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
          // 'Content-Type': 'multipart/form-data' TIDAK PERLU KARENA FormData otomatis mengaturnya
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Terjadi kesalahan tidak dikenal.' }));
        if (response.status === 403) {
            localStorage.removeItem('adminToken');
            setIsLoggedIn(false);
            showNotification('Sesi berakhir atau token tidak valid. Silakan login kembali.', 'error');
            return;
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      showNotification(`File '${result.fileName}' berhasil diunggah ke S3!`, 'success');
      setNewFile(null); // Reset state file yang dipilih
      setNewFileDescription(''); // Reset deskripsi
      document.getElementById('fileInput').value = ''; // Reset input file visual
      fetchFiles(); // Perbarui daftar file
    } catch (error) {
      console.error("Error uploading file:", error);
      showNotification(`Gagal mengunggah file: ${error.message}`, 'error');
    }
  };

  // Fungsi untuk menghapus file (memicu modal konfirmasi)
  const handleDeleteFile = (serverFileName) => {
    setFileToDeleteName(serverFileName);
    setShowDeleteModal(true); // Tampilkan modal konfirmasi
  };

  // Fungsi untuk mengkonfirmasi dan melakukan penghapusan file dari S3
  const handleConfirmDelete = async () => {
    setShowDeleteModal(false); // Tutup modal terlebih dahulu

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/files/${fileToDeleteName}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': ADMIN_SECRET_TOKEN,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Terjadi kesalahan tidak dikenal.' }));
        if (response.status === 403) {
            localStorage.removeItem('adminToken');
            setIsLoggedIn(false);
            showNotification('Sesi berakhir atau token tidak valid. Silakan login kembali.', 'error');
            return;
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      showNotification(`File '${fileToDeleteName}' berhasil dihapus dari S3!`, 'success');
      fetchFiles(); // Perbarui daftar file
    } catch (error) {
      console.error("Error deleting file:", error);
      showNotification(`Gagal menghapus file: ${error.message}`, 'error');
    } finally {
      setFileToDeleteName(''); // Reset nama file yang akan dihapus
    }
  };

  // Fungsi untuk membatalkan penghapusan
  const handleCancelDelete = () => {
    setShowDeleteModal(false); // Tutup modal
    setFileToDeleteName(''); // Reset nama file
  };

  // Fungsi untuk menyalin link download
  const handleShareClick = async (serverFileName) => {
    // Pastikan FRONTEND_USER_URL sudah benar dari App.js yang mengirim props
    const shareLink = `${FRONTEND_USER_URL}/download/${serverFileName}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      showNotification(`Link "${shareLink}" disalin ke clipboard!`, 'success'); // Notifikasi sukses
    } catch (err) {
      console.error('Gagal menyalin link:', err);
      showNotification('Gagal menyalin link.', 'error');
    }
  };

  // Fungsi untuk logout
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
    showNotification('Anda telah logout.', 'success');
  };

  // Fungsi yang dipanggil saat login berhasil dari komponen Login
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    showNotification('Login berhasil!', 'success');
    fetchFiles();
  };

  // Jika belum login, tampilkan komponen Login
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} BACKEND_URL={BACKEND_URL} />; // Kirim BACKEND_URL ke Login
  }

  // Tampilan utama AdminPage setelah login
  return (
    <motion.div
      className="admin-app-container" // Menggunakan class ini dari App.css user
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Admin Header (inline, bisa distyle di AdminPage.css) */}
      <header className="admin-header-inline">
         <h1>Panel Admin GhostVIP</h1>
         <p>Kelola file ZIP dan RAR Anda di S3.</p>
         <motion.button // Tombol Logout dipindahkan ke header ini (atau footer AdminPage)
             className="logout-button header-logout-button" // Class baru untuk posisi di header
             onClick={handleLogout}
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
         >
             Logout
         </motion.button>
      </header>

      <main className="admin-content-area">
        {/* Tidak ada komponen Notification di sini, hanya console.log */}

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
      </main>

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

export default AdminPage;