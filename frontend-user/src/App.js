// frontend-user/src/App.js

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import PortfolioPage from './pages/PortfolioPage';
import DownloadPage from './pages/DownloadPage';
import AdminPage from './pages/admin/AdminPage'; // <-- AKAN KITA BUAT SEBENTAR LAGI
import Login from './pages/admin/Login'; // <-- Impor komponen Login
import Footer from './components/Footer';
import PureCssParticles from './components/PureCssParticles'; // <-- Pastikan ini

function App() {
  // Deklarasi state yang diperlukan untuk App (misalnya, jika ada notifikasi global, mouse follower, dll.)
  // const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 }); // Contoh jika MouseFollower masih ada

  // Ini adalah URL yang akan digunakan aplikasi frontend Anda.
  // Pastikan file .env di frontend-user berisi nilai yang benar untuk produksi.
  const BACKEND_URL = process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_BACKEND_URL_PROD
    : process.env.REACT_APP_BACKEND_URL_DEV;

  const FRONTEND_USER_URL = process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_FRONTEND_USER_URL_PROD
    : process.env.REACT_APP_FRONTEND_USER_URL_DEV;

  // Fungsi autentikasi admin dan state terkait akan dipindahkan ke AdminPage.js

  return (
    <Router>
      <div className="App">
        {/* Animasi Partikel - di belakang konten */}
        <PureCssParticles />

        <main className="main-content-area">
          <Routes>
            <Route path="/" element={<PortfolioPage />} />
            <Route path="/download/:fileName" element={<DownloadPage />} />
            {/* Rute baru untuk Admin */}
            <Route
              path="/admin"
              element={<AdminPage BACKEND_URL={BACKEND_URL} FRONTEND_USER_URL={FRONTEND_USER_URL} />}
            />
            {/* Anda mungkin ingin rute login terpisah jika AdminPage langsung redirect ke login */}
            <Route path="/admin/login" element={<Login BACKEND_URL={BACKEND_URL} />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;