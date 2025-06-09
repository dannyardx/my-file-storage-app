// frontend-user/src/pages/admin/Login.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './Login.css';

// Menerima BACKEND_URL sebagai prop
function Login({ onLoginSuccess, BACKEND_URL }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Kredensial tidak lagi di-hardcode di frontend.
  // Frontend akan mengirim password ke backend untuk validasi.
  // Backend akan mengembalikan token jika login berhasil.

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
        const response = await fetch(`${BACKEND_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Terjadi kesalahan tidak dikenal.' }));
            setError(errorData.message || 'Login gagal. Silakan coba lagi.');
            return;
        }

        const data = await response.json();
        // Simpan token yang diterima dari backend (misalnya ke localStorage)
        onLoginSuccess(data.token); // Kirim token yang diterima dari backend ke onLoginSuccess
    } catch (err) {
        console.error('Login error:', err);
        setError('Tidak dapat terhubung ke server. Pastikan backend berjalan dan URL benar.');
    }
  };

  return (
    <motion.div
      className="login-container"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="login-card">
        <h2>Admin Login</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="login-error-message">{error}</p>}
          <motion.button
            type="submit"
            className="login-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Login
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}

export default Login;