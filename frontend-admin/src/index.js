// frontend-admin/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Global CSS untuk admin
import App from './App'; // Komponen utama App admin

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);