// frontend-user/src/App.js

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PureCssParticles from './components/PureCssParticles'; 

import PortfolioPage from './pages/PortfolioPage';
import DownloadPage from './pages/DownloadPage';
import Footer from './components/Footer';

import './App.css';

function App() {
  useEffect(() => {
    return () => {
    };
  }, []);

  return (
    <Router>
      <div className="App">
        {/* Peta Dunia Latar Belakang (SVG) - SEKARANG BENAR-BENAR DIHAPUS */}
        {/* <img src="/images/world.svg" alt="World Map" className="world-map-bg" /> */}

        {/* Partikel Latar Belakang (Komponen CSS Murni) */}
        <PureCssParticles />

        <main className="main-content-area">
          <Routes>
            <Route path="/" element={<PortfolioPage />} />
            <Route path="/download/:fileName" element={<DownloadPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;