// frontend-user/src/pages/admin/Login.js

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './Login.css';

function Login({ onLoginSuccess, BACKEND_URL }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
        // Panggilan API ke backend:
        // BACKEND_URL sudah disetel ke '/api' (dari .env).
        // Fungsi Express di backend sekarang mendefinisikan rute seperti app.post('/admin/login', ...).
        // Jadi, URL yang tepat adalah `${BACKEND_URL}/admin/login`.
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
        onLoginSuccess(data.token);
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