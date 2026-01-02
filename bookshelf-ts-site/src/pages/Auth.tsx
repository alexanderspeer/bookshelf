import React, { useState, useRef } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

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
              ref={emailInputRef}
              type="email"
              value={email}
              onChange={(e) => {
                const input = e.target as HTMLInputElement;
                // Preserve cursor position
                const cursorPosition = input.selectionStart || 0;
                setEmail(input.value);
                // Restore cursor position after state update
                setTimeout(() => {
                  if (emailInputRef.current) {
                    emailInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                  }
                }, 0);
              }}
              onMouseDown={(e) => {
                const input = e.target as HTMLInputElement;
                if (!input) return;
                
                // Calculate cursor position from click coordinates
                const rect = input.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                
                // Account for padding
                const paddingLeft = parseInt(window.getComputedStyle(input).paddingLeft) || 12;
                const adjustedX = clickX - paddingLeft;
                
                // Create a temporary span to measure text width
                const style = window.getComputedStyle(input);
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) return;
                
                context.font = style.font || '12px "Press Start 2P"';
                
                // Find the character position closest to the click
                let position = 0;
                let minDistance = Infinity;
                const text = input.value;
                
                for (let i = 0; i <= text.length; i++) {
                  const textBefore = text.substring(0, i);
                  const textWidth = context.measureText(textBefore).width;
                  const distance = Math.abs(textWidth - adjustedX);
                  
                  if (distance < minDistance) {
                    minDistance = distance;
                    position = i;
                  }
                }
                
                // Set cursor position after a brief delay to ensure it works
                setTimeout(() => {
                  if (emailInputRef.current) {
                    emailInputRef.current.focus();
                    emailInputRef.current.setSelectionRange(position, position);
                  }
                }, 0);
              }}
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
                fontFamily: "'Press Start 2P', cursive",
                userSelect: 'text',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text',
                msUserSelect: 'text',
                pointerEvents: 'auto',
                cursor: "url('/rpgui/img/cursor/select.png') 10 0, auto"
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
            <div style={{ position: 'relative' }}>
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  const input = e.target as HTMLInputElement;
                  // Preserve cursor position
                  const cursorPosition = input.selectionStart || 0;
                  setPassword(input.value);
                  // Restore cursor position after state update
                  setTimeout(() => {
                    if (passwordInputRef.current) {
                      passwordInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                    }
                  }, 0);
                }}
                onMouseDown={(e) => {
                  const input = e.target as HTMLInputElement;
                  if (!input) return;
                  
                  // Calculate cursor position from click coordinates
                  const rect = input.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  
                  // Account for padding and eye icon space
                  const paddingLeft = parseInt(window.getComputedStyle(input).paddingLeft) || 12;
                  const paddingRight = parseInt(window.getComputedStyle(input).paddingRight) || 12;
                  const iconWidth = 40; // Space for the eye icon
                  const adjustedX = Math.min(clickX - paddingLeft, rect.width - paddingRight - iconWidth - paddingLeft);
                  
                  // Create a temporary span to measure text width
                  const style = window.getComputedStyle(input);
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');
                  if (!context) return;
                  
                  context.font = style.font || '12px "Press Start 2P"';
                  
                  // Find the character position closest to the click
                  let position = 0;
                  let minDistance = Infinity;
                  const text = input.value;
                  
                  for (let i = 0; i <= text.length; i++) {
                    const textBefore = text.substring(0, i);
                    const textWidth = context.measureText(textBefore).width;
                    const distance = Math.abs(textWidth - adjustedX);
                    
                    if (distance < minDistance) {
                      minDistance = distance;
                      position = i;
                    }
                  }
                  
                  // Set cursor position after a brief delay to ensure it works
                  setTimeout(() => {
                    if (passwordInputRef.current) {
                      passwordInputRef.current.focus();
                      passwordInputRef.current.setSelectionRange(position, position);
                    }
                  }, 0);
                }}
                placeholder={isLogin ? 'Enter password' : 'At least 8 characters'}
                className="bs_text_input bs_text_input_dark auth-input"
                style={{
                  width: '100%',
                  padding: '12px',
                  paddingRight: '50px', // Make room for the eye icon
                  border: '2px solid #5C4033',
                  borderRadius: '6px',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  backgroundColor: '#25262b',
                  color: '#c1c2c5',
                  fontFamily: "'Press Start 2P', cursive",
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  msUserSelect: 'text',
                  pointerEvents: 'auto',
                  cursor: "url('/rpgui/img/cursor/select.png') 10 0, auto"
                }}
                disabled={loading}
              />
              <img
                src={showPassword ? '/rpgui/img/radio-golden-on.png' : '/rpgui/img/radio-golden-off.png'}
                alt={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => !loading && setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: loading ? 'not-allowed' : "url('/rpgui/img/cursor/point.png') 10 0, pointer",
                  width: '24px',
                  height: '24px',
                  opacity: loading ? 0.5 : 1,
                  pointerEvents: loading ? 'none' : 'auto'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              />
            </div>
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

