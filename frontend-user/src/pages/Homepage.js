// frontend-user/src/pages/Homepage.js
import React from 'react';
// import PortfolioPage from './PortfolioPage'; // If you wanted to embed PortfolioPage here
// import './Homepage.css'; // If you had specific styles for Homepage

function Homepage() {
  return (
    <div style={{ padding: '50px', textAlign: 'center', color: 'var(--dark-text-primary)' }}>
      {/* You can add content here if you want a distinct homepage */}
      {/* For now, the main portfolio content is accessed via '/' directly */}
      <h2>Welcome to GhostVIP!</h2>
      <p>This is a placeholder page. The main portfolio content is accessible via the home route.</p>
      {/* <PortfolioPage /> // Uncomment if you want Homepage to render PortfolioPage */}
    </div>
  );
}

export default Homepage;