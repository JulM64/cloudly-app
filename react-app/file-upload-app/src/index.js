// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css'; // design tokens — must load before any component CSS
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
