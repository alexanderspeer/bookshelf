import React, { useState } from 'react';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import '../styles/home.css';
import '../styles/rpgui-integration.css';

interface AuthProps {
  onAuthSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Email and password required');
      return;
    }

    if (!isLogin && password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    
    try {
      if (isLogin) {
        await apiService.login(email, password);
        toast.success('Welcome back!');
      } else {
        await apiService.register(email, password);
        toast.success('Account created! Welcome!');
      }
      onAuthSuccess();
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || `${isLogin ? 'Login' : 'Registration'} failed`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // Add style for white placeholder text with RPGUI font
    const style = document.createElement('style');
    style.textContent = `
      .auth-input::placeholder {
        color: #ffffff !important;
        opacity: 0.8;
        font-family: 'Press Start 2P', cursive !important;
      }
      .auth-input::-webkit-input-placeholder {
        color: #ffffff !important;
        opacity: 0.8;
        font-family: 'Press Start 2P', cursive !important;
      }
      .auth-input::-moz-placeholder {
        color: #ffffff !important;
        opacity: 0.8;
        font-family: 'Press Start 2P', cursive !important;
      }
      .auth-input:-ms-input-placeholder {
        color: #ffffff !important;
        opacity: 0.8;
        font-family: 'Press Start 2P', cursive !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'repeating-linear-gradient(0deg, #2a2420, #2a2420 2px, #1d1815 2px, #1d1815 4px)',
      padding: '32px'
    }}>
      <div style={{
        padding: '32px',
        maxWidth: '450px',
        width: '100%',
        border: '15px solid',
        borderImage: 'repeating-linear-gradient(45deg, #8B6F47, #8B6F47 10px, #5C4033 10px, #5C4033 20px) 15',
        boxSizing: 'border-box',
        background: 'repeating-linear-gradient(0deg, #3a3025, #3a3025 2px, #2d231a 2px, #2d231a 4px)',
        boxShadow: '0 0 15px rgba(0, 0, 0, 0.6)'
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '8px',
          fontSize: '20px',
          color: '#E8DCC4',
          fontFamily: "'Press Start 2P', cursive"
        }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p style={{
          textAlign: 'center',
          color: '#D4C5B9',
          marginBottom: '24px',
          fontSize: '10px',
          fontFamily: "'Press Start 2P', cursive"
        }}>
          {isLogin ? 'Sign in to your bookshelf' : 'Start tracking your books'}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 500,
              color: '#E8DCC4',
              fontSize: '16px',
              fontFamily: "'Press Start 2P', cursive"
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="bs_text_input bs_text_input_dark auth-input"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #5C4033',
                borderRadius: '6px',
                fontSize: '12px',
                boxSizing: 'border-box',
                backgroundColor: '#25262b',
                color: '#c1c2c5',
                fontFamily: "'Press Start 2P', cursive"
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 500,
              color: '#E8DCC4',
              fontSize: '16px',
              fontFamily: "'Press Start 2P', cursive"
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? 'Enter password' : 'At least 8 characters'}
              className="bs_text_input bs_text_input_dark auth-input"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #5C4033',
                borderRadius: '6px',
                fontSize: '12px',
                boxSizing: 'border-box',
                backgroundColor: '#25262b',
                color: '#c1c2c5',
                fontFamily: "'Press Start 2P', cursive"
              }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rpgui-button"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '12px',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '16px'
        }}>
          <button
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            className="rpgui-button"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '10px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {isLogin
              ? "Don't have an account? Register"
              : <>Already have an account?<br />Sign in</>}
          </button>
        </div>

      </div>
    </div>
  );
};

