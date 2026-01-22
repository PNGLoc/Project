import React from 'react';
import HomePage from './pages/HomePage';
import { Routes, Route } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <div>
      <HomePage />
      <AppRoutes />
    </div>
  );
}

export default App;