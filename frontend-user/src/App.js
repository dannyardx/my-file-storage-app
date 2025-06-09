// frontend-user/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import PortfolioPage from './pages/PortfolioPage';
import DownloadPage from './pages/DownloadPage';
import AdminPage from './pages/admin/AdminPage';
import Login from './pages/admin/Login';

import Footer from './components/Footer';
import PureCssParticles from './components/PureCssParticles'; // DEPRECATION WARNING: react-tsparticles is deprecated. Consider @tsparticles/react.

// Definisi variabel lingkungan dari .env
// Pastikan variabel ini ada di file .env Anda di root proyek frontend
// Contoh di .env (di folder frontend-user/):
// REACT_APP_BACKEND_URL_PROD=https://your-backend-prod.render.com
// REACT_APP_BACKEND_URL_DEV=http://localhost:5000
// REACT_APP_FRONTEND_USER_URL_PROD=https://your-frontend-prod.render.com
// REACT_APP_FRONTEND_USER_URL_DEV=http://localhost:3000

const BACKEND_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_BACKEND_URL_PROD
  : process.env.REACT_APP_BACKEND_URL_DEV;

const FRONTEND_USER_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_FRONTEND_USER_URL_PROD
  : process.env.REACT_APP_FRONTEND_USER_URL_DEV;

function App() {
  return (
    <Router>
      <div className="App">
        {/* Partikel Latar Belakang */}
        <PureCssParticles />

        <main className="main-content-area">
          <Routes>
            <Route path="/" element={<PortfolioPage />} />
            {/* DownloadPage sekarang menerima BACKEND_URL sebagai prop */}
            <Route path="/download/:fileName" element={<DownloadPage BACKEND_URL={BACKEND_URL} />} />
            {/* Rute Admin */}
            <Route
              path="/admin"
              element={<AdminPage BACKEND_URL={BACKEND_URL} FRONTEND_USER_URL={FRONTEND_USER_URL} />}
            />
            {/* Rute Login (jika diperlukan terpisah dari AdminPage) */}
            <Route path="/admin/login" element={<Login BACKEND_URL={BACKEND_URL} />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;