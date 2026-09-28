// ==============================================================================
// frontend/src/App.jsx
// ==============================================================================
// 

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleSetUser = (userData) => {
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={!user ? <Login setUser={handleSetUser} /> : <Navigate to={`/${user.role}`} replace />} 
          />
          <Route 
            path="/login" 
            element={!user ? <Login setUser={handleSetUser} /> : <Navigate to={`/${user.role}`} replace />} 
          />
          <Route 
            path="/signup" 
            element={!user ? <SignUp setUser={handleSetUser} onSwitchToLogin={() => window.location.href = '/login'} /> : <Navigate to={`/${user.role}`} replace />} 
          />
          <Route 
            path="/patient" 
            element={user && user.role === 'patient' ? <PatientDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/doctor" 
            element={user && user.role === 'doctor' ? <DoctorDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;