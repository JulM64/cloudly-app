import React from 'react';
import Appupload from '../Appupload';

const HomePage = () => {
  return (
    <div className="page-container">
      <h1 className="section-title">Welcome to Cloudly</h1>
      <p className="page-description">Secure PDF Upload and Management System</p>
      <Appupload />
    </div>
  );
};

export default HomePage;