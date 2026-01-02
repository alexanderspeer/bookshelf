import React from 'react';
import { Home } from './Home';
import '../styles/home.css';

interface PublicUserProfileProps {
  username: string;
  subPath?: string; // 'shelf' or 'stats' (not used in new implementation)
}

export const PublicUserProfile: React.FC<PublicUserProfileProps> = ({ username }) => {
  return <Home isPublicView={true} publicUsername={username} />;
};

