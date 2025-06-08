// frontend-admin/src/Login.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './Login.css'; // Pastikan CSS ini ada

function Login({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const ADMIN_PASSWORD = 'ADMIN123';
  const ADMIN_SECRET_TOKEN = 'ADMIN123';

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('adminToken', ADMIN_SECRET_TOKEN);
      onLoginSuccess();
    } else {
      setError('Password salah. Silakan coba lagi.');
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