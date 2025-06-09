// frontend-user/src/App.js

// Hapus useState dan useEffect jika tidak lagi digunakan di sini
// Hapus motion jika MouseFollower sudah dihapus atau diganti
import React from 'react'; // Hanya import React
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { motion } from 'framer-motion'; // <-- HAPUS IMPOR INI jika tidak ada motion.div di sini

import PortfolioPage from './pages/PortfolioPage';
import DownloadPage from './pages/DownloadPage';
import AdminPage from './pages/admin/AdminPage'; // AdminPage sudah diimpor dan digunakan
import Login from './pages/admin/Login'; // Login sudah diimpor dan digunakan

import Footer from './components/Footer';
import PureCssParticles from './components/PureCssParticles'; // PureCssParticles sudah diimpor dan digunakan

// Definisi variabel lingkungan dari .env
const BACKEND_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_BACKEND_URL_PROD
  : process.env.REACT_APP_BACKEND_URL_DEV;

const FRONTEND_USER_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_FRONTEND_USER_URL_PROD
  : process.env.REACT_APP_FRONTEND_USER_URL_DEV;

function App() {
  // Jika Anda sudah menghapus MouseFollower, state dan useEffect ini harus dihapus.
  // const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  // useEffect(() => {
  //   const handleMouseMove = (e) => {
  //     setMousePosition({ x: e.clientX, y: e.clientY });
  //   };
  //   window.addEventListener('mousemove', handleMouseMove);
  //   return () => {
  //     window.removeEventListener('mousemove', handleMouseMove);
  //   };
  // }, []);


  return (
    <Router>
      <div className="App">
        {/* Jika Anda sudah menghapus MouseFollower, hapus blok ini. */}
        {/*
        <motion.div
          className="mouse-follower"
          animate={{ x: mousePosition.x, y: mousePosition.y }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
          whileTap={{ scale: 0.8 }}
          style={{
            position: 'fixed',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
          }}
        />
        */}

        {/* Partikel Latar Belakang */}
        <PureCssParticles />

        <main className="main-content-area">
          <Routes>
            <Route path="/" element={<PortfolioPage />} />
            <Route path="/download/:fileName" element={<DownloadPage />} />
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