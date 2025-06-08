// frontend-user/src/components/PureCssParticles.js
import React from 'react';
import './PureCssParticles.css'; // Gaya untuk partikel CSS murni

function PureCssParticles() {
  // Meningkatkan jumlah partikel menjadi 40 atau lebih
  const particleCount = 40; // Ditingkatkan dari 20
  const particles = Array.from({ length: particleCount }, (_, i) => (
    <div key={i} className="css-particle"></div>
  ));

  return (
    <div className="css-particles-background">
      {particles}
    </div>
  );
}

export default PureCssParticles;