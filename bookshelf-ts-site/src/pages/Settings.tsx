import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import '../styles/home.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await apiService.getMyProfile();
      setProfile(data);
      setUsername(data.username || '');
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!username.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    setSaving(true);
    try {
      await apiService.updateMyProfile({ username: username.trim() });
      toast.success('Username updated successfully');
      fetchProfile(); // Refresh profile
    } catch (error: any) {
      toast.error(error.message || 'Failed to update username');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content rpgui-container framed-golden" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', width: 'auto', minWidth: '500px' }}
      >
        <div className="modal-header">
          <h2>Settings</h2>
          <button 
            className="modal-close" 
            onClick={onClose}
            style={{ 
              cursor: "url('/rpgui/img/cursor/point.png') 10 0, pointer",
              position: 'absolute',
              zIndex: 1000,
              right: '1rem',
              top: '1rem'
            }}
          >
            ×
          </button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden' }}>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div style={{
                padding: '24px',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <h3 style={{ marginBottom: '16px' }}>Public Profile</h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                  Your profile is always public and visible at{' '}
                  <code style={{ backgroundColor: '#e0e0e0', padding: '2px 6px', borderRadius: '4px' }}>
                    /u/{username || 'your-username'}
                  </code>
                </p>
                {username && (
                  <div style={{ padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      Your public profile: <a href={`/u/${username}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4a90e2' }}>
                        /u/{username}
                      </a>
                    </p>
                  </div>
                )}
              </div>

              <div style={{
                padding: '24px',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px'
              }}>
                <h3 style={{ marginBottom: '16px' }}>Username</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '2px solid #5C4033',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: "'Press Start 2P', cursive"
                    }}
                    disabled={saving}
                  />
                  <button
                    onClick={handleUpdateUsername}
                    className="rpgui-button"
                    disabled={saving || !username.trim() || username === profile?.username}
                  >
                    Update
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  Username must be 3-24 characters, lowercase letters, numbers, and underscores only.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

