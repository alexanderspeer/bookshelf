import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import { toast } from 'react-toastify';
import '../styles/home.css';

interface SettingsProps {
  onBack?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [profile, setProfile] = useState<any>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiService.getMyProfile();
      setProfile(data);
      setIsPublic(data.is_public || false);
      setUsername(data.username || '');
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublic = async () => {
    setSaving(true);
    try {
      const newValue = !isPublic;
      await apiService.updateMySettings(newValue);
      setIsPublic(newValue);
      toast.success(`Profile is now ${newValue ? 'public' : 'private'}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Settings</h1>
        {onBack && (
          <button
            onClick={onBack}
            className="rpgui-button"
            style={{ marginBottom: '16px' }}
          >
            ← Back
          </button>
        )}
      </div>

      <div style={{
        padding: '24px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <h2 style={{ marginBottom: '16px' }}>Profile Visibility</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <label style={{ fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={handleTogglePublic}
              disabled={saving}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span>Make my profile public</span>
          </label>
        </div>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
          When enabled, your public bookshelf will be visible at{' '}
          <code style={{ backgroundColor: '#e0e0e0', padding: '2px 6px', borderRadius: '4px' }}>
            /u/{username || 'your-username'}
          </code>
        </p>
        {isPublic && username && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
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
        <h2 style={{ marginBottom: '16px' }}>Username</h2>
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
    </div>
  );
};

