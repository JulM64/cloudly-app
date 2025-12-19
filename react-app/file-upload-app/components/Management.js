import React from 'react';

const Management = () => {
  return (
    <div>
      <h1 style={{color: 'blue', background: '#e6f2ff', padding: '20px', borderRadius: '10px'}}>
        📊 MANAGEMENT PAGE
      </h1>
      <p>This is different from other pages!</p>
      <div style={{marginTop: '20px', padding: '20px', background: '#f0f8ff', borderRadius: '10px'}}>
        <h3>File Statistics</h3>
        <p>Total Files: 15</p>
        <p>Storage Used: 2.1 GB</p>
      </div>
    </div>
  );
};

export default Management;
