// frontend-user/src/components/Footer.js

import React from 'react';
import './Footer.css';

// Tidak lagi menerima prop isVisible
function Footer() {
  return (
    // Kelas 'visible' atau 'hidden' tidak lagi diperlukan.
    // Footer akan selalu menggunakan gaya default dari .footer-container
    <footer className="footer-container">
      <p>&copy; 2025 ALL RIGHTS RESERVED BY GhostVIP.</p>
    </footer>
  );
}

export default Footer;