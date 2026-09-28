// ==============================================================================
// src/components/SignUp.jsx
// ==============================================================================

import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

function Signup({ onSignupSuccess, onSwitchToLogin }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    setError('');
    setMessage('');

    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/send-otp`, { email });
      if (res.data.status === 'success') {
        setMessage('OTP sent! Check your terminal/email. Code expires in 5 minutes.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await axios.post(`${API_BASE_URL}/signup`, {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        otp
      });

      if (res.data.status === 'success') {
        if (onSignupSuccess) {
          onSignupSuccess(res.data.user);
        } else {
          setMessage('Account created successfully! You can now log in.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    }
  };

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#ffffff',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '400px',
    padding: '35px',
    borderRadius: '10px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    marginTop: '6px',
    marginBottom: '16px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
    fontSize: '0.95rem'
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#1e3c72',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '10px'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: 'center', color: '#1e3c72', marginTop: 0, marginBottom: '20px' }}>
          Create Patient Account
        </h2>

        {error && (
          <div style={{ color: '#dc3545', fontSize: '0.9rem', marginBottom: '15px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ color: '#28a745', fontSize: '0.9rem', marginBottom: '15px', textAlign: 'center' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#555' }}>First Name</label>
            <input
              type="text"
              placeholder="e.g. John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#555' }}>Last Name</label>
            <input
              type="text"
              placeholder="e.g. Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#555' }}>Email Address</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ ...inputStyle, marginBottom: 0 }}
              />
              <button
                type="button"
                onClick={handleSendOtp}
                style={{
                  padding: '0 12px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Send OTP
              </button>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '0.85rem', color: '#555' }}>6-Digit OTP Code</label>
            <input
              type="text"
              placeholder="Enter code from email/terminal"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#555' }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <button type="submit" style={buttonStyle}>
            Sign Up
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#666' }}>
          Already have an account?{' '}
          <span
            onClick={onSwitchToLogin}
            style={{ color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Log In
          </span>
        </p>
      </div>
    </div>
  );
}

export default Signup;