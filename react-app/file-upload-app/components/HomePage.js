import React from 'react';
import Appupload from './Appupload';

const HomePage = () => {
  return (
    <div>
      <h1 style={{color: 'red', background: '#ffe6e6', padding: '20px', borderRadius: '10px'}}>
        🏠 HOME PAGE - UPLOAD PDF
      </h1>
      <p>This is different from other pages!</p>
      <Appupload />
    </div>
  );
};

export default HomePage;
