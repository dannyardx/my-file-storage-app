// frontend-admin/src/components/ConfirmationModal.js
import React from 'react';
import { motion } from 'framer-motion';
import './ConfirmationModal.css'; // Import CSS untuk modal ini

const ConfirmationModal = ({ message, onConfirm, onCancel, title = "Konfirmasi Aksi" }) => {
  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="btn-modal-cancel" onClick={onCancel}>Batal</button>
          <button className="btn-modal-confirm" onClick={onConfirm}>Hapus</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ConfirmationModal;